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
  classic: { names: ['Класична стрижка', 'Classic Haircut'], priceUA: '80 грн', priceEN: '80 UAH' },
  hairBeard: { names: ['Стрижка + борода', 'Hair + Beard'], priceUA: '130 грн', priceEN: '130 UAH' },
  beardTrim: { names: ['Оформлення бороди', 'Beard Trim'], priceUA: '60 грн', priceEN: '60 UAH' },
  royalShave: { names: ['Королівське гоління', 'Royal Shave'], priceUA: '70 грн', priceEN: '70 UAH' },
  kidsHaircut: { names: ['Дитяча стрижка', 'Kids Haircut'], priceUA: '60 грн', priceEN: '60 UAH' }
};

const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function rest(url, key, path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: headers(key, options.headers || {})
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function isDuplicate(response, data) {
  const code = String(data?.code || '');
  const message = String(data?.message || '');
  return response.status === 409 || code === '23505' || /duplicate|unique/i.test(message);
}

function missingColumn(data, name) {
  const text = String(data?.message || data?.details || '');
  return new RegExp(`column[^\\n]*${name}|${name}[^\\n]*column`, 'i').test(text);
}

async function findBarberId(url, key, barber) {
  const wanted = normalize(barber);
  if (!wanted) return null;
  const { response, data } = await rest(url, key, 'barbers?select=id,name&limit=100');
  if (!response.ok) return null;
  const row = (Array.isArray(data) ? data : []).find(x => normalize(x.name) === wanted);
  return row?.id || null;
}

async function findServiceId(url, key, serviceKey, serviceLabel) {
  const aliases = SERVICES[serviceKey]?.names || [serviceLabel || serviceKey];
  let result = await rest(url, key, 'services?select=id,name,key&limit=100');
  if (!result.response.ok) result = await rest(url, key, 'services?select=id,name&limit=100');
  if (!result.response.ok) return null;
  const rows = Array.isArray(result.data) ? result.data : [];
  const byKey = rows.find(x => serviceKey && normalize(x.key) === normalize(serviceKey));
  if (byKey) return byKey.id || null;
  for (const alias of aliases) {
    const match = rows.find(x => normalize(x.name) === normalize(alias));
    if (match) return match.id || null;
  }
  const normalized = aliases.map(normalize).filter(Boolean);
  return rows.find(x => normalized.some(a => normalize(x.name).includes(a) || a.includes(normalize(x.name))))?.id || null;
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
  } catch {
    return false;
  }
}

function normalizeBooking(row) {
  return {
    id: row.id,
    service: row.service || row.service_name || row.serviceKey || row.service_key || '',
    serviceKey: row.serviceKey || row.service_key || '',
    price: row.price || '',
    barber: row.barber || '',
    date: row.date || row.booking_date || '',
    time: String(row.time || row.booking_time || '').slice(0, 5),
    language: row.language || 'uk',
    createdAt: row.createdAt || row.created_at || null,
    accountId: row.account_id || row.accountId || '',
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || '',
    status: row.status || 'confirmed',
    notes: row.notes || null
  };
}

export default async function handler(req, res) {
  const { url, key, table } = config();
  if (!url || !key) return res.status(503).json({ ok: false, error: 'Booking database is not configured' });

  if (req.method === 'GET') {
    try {
      const month = String(req.query.month || '');
      const email = normalize(req.query.email || '');
      const accountId = String(req.query.accountId || '').trim();
      const barber = String(req.query.barber || '').trim();
      const params = new URLSearchParams();
      params.set('select', '*');

      if (/^\d{4}-\d{2}$/.test(month)) {
        const [year, mon] = month.split('-').map(Number);
        const from = `${month}-01`;
        const next = new Date(year, mon, 1);
        const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
        params.set('date', `gte.${from}`);
        params.append('date', `lt.${to}`);
      } else if (!email && !accountId) {
        return res.status(400).json({ ok: false, error: 'Month or account filter is required' });
      }

      if (barber) params.set('barber', `eq.${barber}`);
      const result = await rest(url, key, `${table}?${params.toString()}`);
      if (!result.response.ok) {
        return res.status(502).json({ ok: false, error: 'Database read failed', detail: result.data?.message || result.data?.hint || '' });
      }

      let bookings = (Array.isArray(result.data) ? result.data : []).map(normalizeBooking);
      if (email || accountId) {
        bookings = bookings.filter(b =>
          (email && normalize(b.customerEmail) === email) ||
          (accountId && String(b.accountId) === accountId)
        );
      }
      bookings = bookings.filter(b => String(b.status).toLowerCase() !== 'cancelled');
      bookings.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      return res.status(200).json({ ok: true, bookings });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Database read failed', detail: error.message || '' });
    }
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const customerName = String(b.customerName || '').trim();
    const customerPhone = String(b.customerPhone || '').trim();
    const customerEmail = String(b.customerEmail || '').trim().toLowerCase();
    if (!b.barber || !b.serviceKey || !b.date || !b.time || !customerName || !customerPhone) {
      return res.status(400).json({ ok: false, error: 'Missing booking fields' });
    }

    try {
      // PRIMARY SCHEMA: this is the schema documented by the project itself.
      // Do not require barber_id/service_id for the booking table.
      const basePayload = {
        service: String(b.service || b.serviceKey).trim(),
        serviceKey: String(b.serviceKey).trim(),
        price: String(b.price || '').trim(),
        barber: String(b.barber).trim(),
        date: String(b.date).trim(),
        time: String(b.time).trim(),
        language: String(b.language || 'uk').trim(),
        createdAt: b.createdAt || new Date().toISOString()
      };

      // Only use columns documented by this project. The optional account
      // columns are explicitly documented as nullable additions. Do not send
      // undocumented customer_name/customer_phone/status/notes columns.
      const accountPayload = {
        ...basePayload,
        customer_email: customerEmail || null,
        account_id: b.accountId ? String(b.accountId).trim() : null
      };

      let result = await rest(url, key, table, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(accountPayload)
      });

      // The project documents account_id/customer_email as optional nullable
      // columns. If an existing Supabase table has not added them yet, retry
      // using the exact documented base schema.
      if (!result.response.ok && (
        missingColumn(result.data, 'account_id') ||
        missingColumn(result.data, 'customer_email')
      )) {
        result = await rest(url, key, table, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(basePayload)
        });
      }

      // Compatibility fallback for a relational bookings table, only if the
      // actual Supabase project uses that newer schema.
      if (!result.response.ok && (
        missingColumn(result.data, 'service') ||
        missingColumn(result.data, 'serviceKey') ||
        missingColumn(result.data, 'barber') ||
        missingColumn(result.data, 'date')
      )) {
        const barberId = b.barberId || await findBarberId(url, key, b.barber);
        const serviceId = b.serviceId || await findServiceId(url, key, b.serviceKey, b.service);
        if (!barberId || !serviceId) {
          return res.status(400).json({ ok: false, error: 'Booking schema mismatch', detail: result.data?.message || '' });
        }
        result = await rest(url, key, table, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            barber_id: barberId,
            service_id: serviceId,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            account_id: b.accountId ? String(b.accountId).trim() : null,
            booking_date: b.date,
            booking_time: b.time,
            status: 'confirmed',
            notes: b.notes || null
          })
        });
      }

      if (!result.response.ok) {
        const conflict = isDuplicate(result.response, result.data);
        return res.status(conflict ? 409 : 502).json({
          ok: false,
          error: conflict ? 'That time may already be booked' : 'Booking creation failed',
          detail: result.data?.message || result.data?.hint || result.data?.details || ''
        });
      }

      const booking = normalizeBooking(Array.isArray(result.data) ? result.data[0] : result.data || basePayload);
      const emailSent = await sendBookingEmail({ ...b, customerEmail });
      return res.status(201).json({ ok: true, booking, emailSent });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Booking creation failed', detail: error.message || '' });
    }
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '').trim();
    if (!id) return res.status(400).json({ ok: false, error: 'Missing booking id' });
    try {
      const result = await rest(url, key, `${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      if (!result.response.ok) return res.status(502).json({ ok: false, error: 'Booking cancellation failed', detail: result.data?.message || '' });
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Booking cancellation failed', detail: error.message || '' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
