function config() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    table: process.env.SUPABASE_BOOKINGS_TABLE || 'bookings'
  };
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

const SERVICES = {
  classic: {
    names: ['Класична стрижка', 'Classic Haircut'],
    priceUA: '80 грн', priceEN: '80 UAH'
  },
  hairBeard: {
    names: ['Стрижка + борода', 'Hair + Beard'],
    priceUA: '130 грн', priceEN: '130 UAH'
  },
  beardTrim: {
    names: ['Оформлення бороди', 'Beard Trim'],
    priceUA: '60 грн', priceEN: '60 UAH'
  },
  royalShave: {
    names: ['Королівське гоління', 'Royal Shave'],
    priceUA: '70 грн', priceEN: '70 UAH'
  },
  kidsHaircut: {
    names: ['Дитяча стрижка', 'Kids Haircut'],
    priceUA: '60 грн', priceEN: '60 UAH'
  }
};

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\\s+/g, ' ');
}

async function rest(url, key, path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: headers(key, options.headers || {})
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function findBarberId(url, key, barber) {
  const name = normalize(barber);
  if (!name) return null;

  const first = await rest(url, key, `barbers?select=id,name&limit=100`);
  if (!first.response.ok) throw new Error(first.data?.message || 'Failed to read barbers');
  const row = (Array.isArray(first.data) ? first.data : []).find(x => normalize(x.name) === name);
  return row?.id || null;
}

async function findService(url, key, serviceKey, serviceLabel) {
  const wanted = SERVICES[serviceKey];
  const aliases = wanted ? wanted.names : [serviceLabel || serviceKey];

  // Prefer a schema with a `key` column, but gracefully fall back to the
  // user's simpler id/name schema.
  let rows = [];
  let response = await rest(url, key, 'services?select=id,name,key&limit=100');
  if (response.response.ok) {
    rows = Array.isArray(response.data) ? response.data : [];
    const byKey = rows.find(x => serviceKey && normalize(x.key) === normalize(serviceKey));
    if (byKey) return byKey.id;
  } else {
    response = await rest(url, key, 'services?select=id,name&limit=100');
    if (!response.response.ok) throw new Error(response.data?.message || 'Failed to read services');
    rows = Array.isArray(response.data) ? response.data : [];
  }

  for (const alias of aliases) {
    const match = rows.find(x => normalize(x.name) === normalize(alias));
    if (match) return match.id;
  }

  // Last fallback: partial match, useful when the DB has a slightly longer label.
  const normalizedAliases = aliases.map(normalize).filter(Boolean);
  const partial = rows.find(x => normalizedAliases.some(a => normalize(x.name).includes(a) || a.includes(normalize(x.name))));
  return partial?.id || null;
}

async function getBarbersMap(url, key) {
  const { response, data } = await rest(url, key, 'barbers?select=id,name&limit=100');
  if (!response.ok) throw new Error(data?.message || 'Failed to read barbers');
  const map = new Map();
  for (const row of Array.isArray(data) ? data : []) map.set(String(row.id), row.name);
  return map;
}

async function getServicesMap(url, key) {
  let response = await rest(url, key, 'services?select=id,name,key&limit=100');
  if (!response.response.ok) response = await rest(url, key, 'services?select=id,name&limit=100');
  if (!response.response.ok) throw new Error(response.data?.message || 'Failed to read services');
  const map = new Map();
  for (const row of Array.isArray(response.data) ? response.data : []) {
    const keyValue = row.key || Object.keys(SERVICES).find(k => SERVICES[k].names.some(n => normalize(n) === normalize(row.name))) || '';
    map.set(String(row.id), { name: row.name || '', key: keyValue });
  }
  return map;
}

async function sendBookingEmail(b) {
  if (!b.customerEmail || !process.env.RESEND_API_KEY) return false;
  const from = process.env.CONTACT_FROM || process.env.RESEND_FROM || 'Crown & Blade <onboarding@resend.dev>';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [b.customerEmail],
        subject: 'Crown & Blade — бронювання підтверджено',
        text: `Ваш запис підтверджено.\n\nПослуга: ${b.service || b.serviceKey || ''}\nБарбер: ${b.barber || ''}\nДата: ${b.date || ''}\nЧас: ${b.time || ''}`
      })
    });
    return response.ok;
  } catch { return false; }
}

function isDuplicate(response, data) {
  const code = String(data?.code || '');
  const message = String(data?.message || '');
  return response.status === 409 || code === '23505' || /duplicate|unique/i.test(message);
}

async function insertBooking(url, key, table, payload) {
  return rest(url, key, table, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
}

export default async function handler(req, res) {
  const { url, key, table } = config();
  if (!url || !key) return res.status(503).json({ ok: false, error: 'Booking database is not configured' });

  if (req.method === 'GET') {
    const month = String(req.query.month || '');
    const email = normalize(req.query.email || '');
    const accountId = String(req.query.accountId || '').trim();

    const params = new URLSearchParams();
    params.set('select', 'id,barber_id,service_id,customer_name,customer_phone,customer_email,account_id,booking_date,booking_time,status,notes,created_at,updated_at');

    try {
      if (/^\d{4}-\d{2}$/.test(month)) {
        const [year, mon] = month.split('-').map(Number);
        const from = `${month}-01`;
        const next = new Date(year, mon, 1);
        const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
        params.append('booking_date', `gte.${from}`);
        params.append('booking_date', `lt.${to}`);
      } else if (!email && !accountId) {
        return res.status(400).json({ ok: false, error: 'Month or account filter is required' });
      }

      // Email is the stable lookup key. Do not require both email and accountId.
      // URLSearchParams already encodes values, so do not double-encode them.
      if (email) params.set('customer_email', `eq.${email}`);
      else if (accountId) params.set('account_id', `eq.${accountId}`);
      params.set('status', 'neq.cancelled');
      params.set('order', 'booking_date.asc,booking_time.asc');

      const { response, data } = await rest(url, key, `${table}?${params.toString()}`);
      if (!response.ok) {
        return res.status(502).json({ ok: false, error: 'Database read failed', detail: data?.message || data?.hint || '' });
      }

      const [barberMap, serviceMap] = await Promise.all([getBarbersMap(url, key), getServicesMap(url, key)]);
      const bookings = (Array.isArray(data) ? data : []).map(row => {
        const service = serviceMap.get(String(row.service_id)) || {};
        return {
          id: row.id,
          barberId: row.barber_id,
          serviceId: row.service_id,
          barber: barberMap.get(String(row.barber_id)) || '',
          service: service.name || '',
          serviceKey: service.key || '',
          customerName: row.customer_name || '',
          customerPhone: row.customer_phone || '',
          customerEmail: row.customer_email || '',
          accountId: row.account_id || '',
          date: row.booking_date,
          time: String(row.booking_time || '').slice(0, 5),
          status: row.status || 'confirmed',
          notes: row.notes || null,
          createdAt: row.created_at || null,
          updatedAt: row.updated_at || null
        };
      });

      return res.status(200).json({ ok: true, bookings });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Database read failed', detail: error.message || '' });
    }
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.barber || !b.serviceKey || !b.date || !b.time || !b.customerName || !b.customerPhone) {
      return res.status(400).json({ ok: false, error: 'Missing booking fields' });
    }

    try {
      const barberId = b.barberId || await findBarberId(url, key, b.barber);
      const serviceId = b.serviceId || await findService(url, key, b.serviceKey, b.service);
      if (!barberId) return res.status(400).json({ ok: false, error: `Barber not found: ${b.barber}` });
      if (!serviceId) return res.status(400).json({ ok: false, error: `Service not found: ${b.serviceKey || b.service}` });

      const payload = {
        barber_id: barberId,
        service_id: serviceId,
        customer_name: String(b.customerName).trim(),
        customer_phone: String(b.customerPhone).trim(),
        customer_email: b.customerEmail ? String(b.customerEmail).trim().toLowerCase() : null,
        account_id: b.accountId ? String(b.accountId).trim() : null,
        booking_date: b.date,
        booking_time: b.time,
        status: 'confirmed',
        notes: b.notes || null
      };

      let result = await insertBooking(url, key, table, payload);

      // Some existing DBs do not yet have account_id. Booking must still work.
      if (!result.response.ok && /account_id|column .*account_id/i.test(String(result.data?.message || ''))) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.account_id;
        result = await insertBooking(url, key, table, fallbackPayload);
      }

      if (!result.response.ok) {
        const conflict = isDuplicate(result.response, result.data);
        return res.status(conflict ? 409 : 502).json({
          ok: false,
          error: conflict ? 'That time may already be booked' : 'Booking creation failed',
          detail: result.data?.message || result.data?.hint || result.data?.details || ''
        });
      }

      const booking = Array.isArray(result.data) ? result.data[0] : result.data;
      const emailSent = await sendBookingEmail(b);
      return res.status(201).json({ ok: true, booking, emailSent });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Booking creation failed', detail: error.message || '' });
    }
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '').trim();
    if (!id) return res.status(400).json({ ok: false, error: 'Missing booking id' });
    try {
      const { response, data } = await rest(url, key, `${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      if (!response.ok) return res.status(502).json({ ok: false, error: 'Booking cancellation failed', detail: data?.message || '' });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(502).json({ ok: false, error: 'Database connection failed' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
