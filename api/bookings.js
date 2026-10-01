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

async function rest(url, key, path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: headers(key, options.headers || {})
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeLegacy(row) {
  return {
    id: row.id,
    barber: row.barber || '',
    service: row.service || row.serviceKey || '',
    serviceKey: row.serviceKey || '',
    price: row.price || '',
    date: row.date || '',
    time: String(row.time || '').slice(0, 5),
    language: row.language || 'uk',
    createdAt: row.createdAt || row.created_at || null,
    accountId: row.account_id || '',
    customerEmail: row.customer_email || '',
    status: row.status || 'confirmed'
  };
}

function isDuplicate(response, data) {
  const code = String(data?.code || '');
  const message = String(data?.message || '');
  return response.status === 409 || code === '23505' || /duplicate|unique/i.test(message);
}

function schemaError(data) {
  const message = String(data?.message || data?.hint || data?.details || '');
  return /column|relation|schema cache|does not exist|not found/i.test(message);
}

async function sendBookingEmail(b) {
  if (!b.customerEmail || !process.env.RESEND_API_KEY) return false;
  const from = process.env.CONTACT_FROM || process.env.RESEND_FROM || 'Crown & Blade <onboarding@resend.dev>';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
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

async function readLegacyBookings(url, key, table, { month = '', email = '', accountId = '' } = {}) {
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('order', 'date.asc,time.asc');

  if (/^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split('-').map(Number);
    const from = `${month}-01`;
    const next = new Date(year, mon, 1);
    const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    params.append('date', `gte.${from}`);
    params.append('date', `lt.${to}`);
  }

  const result = await rest(url, key, `${table}?${params.toString()}`);
  if (!result.response.ok) return result;

  let rows = Array.isArray(result.data) ? result.data : [];
  if (email || accountId) {
    rows = rows.filter(row => {
      const sameEmail = email && normalize(row.customer_email) === email;
      const sameAccount = accountId && String(row.account_id || '').trim() === accountId;
      return sameEmail || sameAccount;
    });
  }

  result.data = rows
    .filter(row => String(row.status || 'confirmed').toLowerCase() !== 'cancelled')
    .map(normalizeLegacy);
  return result;
}

export default async function handler(req, res) {
  const { url, key, table } = config();
  if (!url || !key) {
    return res.status(503).json({ ok: false, error: 'Booking database is not configured' });
  }

  // The public mobile booking system is built around the documented legacy
  // schema: service, serviceKey, price, barber, date, time, language, createdAt.
  // Keep that path first. Relational support is only a fallback.
  if (req.method === 'GET') {
    const month = String(req.query.month || '');
    const email = normalize(req.query.email || '');
    const accountId = String(req.query.accountId || '').trim();

    if (!/^\d{4}-\d{2}$/.test(month) && !email && !accountId) {
      return res.status(400).json({ ok: false, error: 'Month or account filter is required' });
    }

    try {
      const legacy = await readLegacyBookings(url, key, table, { month, email, accountId });
      if (legacy.response.ok) {
        return res.status(200).json({ ok: true, bookings: legacy.data || [] });
      }

      // Only if the documented legacy schema is unavailable, try the relational schema.
      const params = new URLSearchParams();
      params.set('select', 'id,barber_id,service_id,customer_name,customer_phone,customer_email,account_id,booking_date,booking_time,status,notes,created_at,updated_at');
      if (/^\d{4}-\d{2}$/.test(month)) {
        const [year, mon] = month.split('-').map(Number);
        const from = `${month}-01`;
        const next = new Date(year, mon, 1);
        const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
        params.append('booking_date', `gte.${from}`);
        params.append('booking_date', `lt.${to}`);
      }
      if (email) params.set('customer_email', `eq.${email}`);
      else if (accountId) params.set('account_id', `eq.${accountId}`);
      params.set('status', 'neq.cancelled');
      params.set('order', 'booking_date.asc,booking_time.asc');

      const relational = await rest(url, key, `${table}?${params.toString()}`);
      if (!relational.response.ok) {
        return res.status(502).json({
          ok: false,
          error: 'Database read failed',
          detail: relational.data?.message || legacy.data?.message || ''
        });
      }

      const bookings = (Array.isArray(relational.data) ? relational.data : []).map(row => ({
        id: row.id,
        barberId: row.barber_id,
        serviceId: row.service_id,
        barber: row.barber || '',
        service: row.service || '',
        serviceKey: row.serviceKey || '',
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone || '',
        customerEmail: row.customer_email || '',
        accountId: row.account_id || '',
        date: row.booking_date || '',
        time: String(row.booking_time || '').slice(0, 5),
        status: row.status || 'confirmed',
        notes: row.notes || null,
        createdAt: row.created_at || null
      }));
      return res.status(200).json({ ok: true, bookings });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Database read failed', detail: error.message || '' });
    }
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const service = String(b.service || b.serviceKey || '').trim();
    const serviceKey = String(b.serviceKey || '').trim();
    const barber = String(b.barber || '').trim();
    const date = String(b.date || '').trim();
    const time = String(b.time || '').trim();
    const customerName = String(b.customerName || '').trim();
    const customerPhone = String(b.customerPhone || '').trim();
    const customerEmail = String(b.customerEmail || '').trim().toLowerCase();
    const accountId = String(b.accountId || '').trim();

    if (!service || !serviceKey || !barber || !date || !time || !customerName || !customerPhone) {
      return res.status(400).json({ ok: false, error: 'Missing booking fields' });
    }

    try {
      // Prevent duplicate slots without depending on a database unique index.
      const existing = await readLegacyBookings(url, key, table, { month: date.slice(0, 7) });
      if (existing.response.ok) {
        const duplicate = (existing.data || []).some(row =>
          normalize(row.barber) === normalize(barber) &&
          String(row.date) === date &&
          String(row.time).slice(0, 5) === time.slice(0, 5)
        );
        if (duplicate) {
          return res.status(409).json({ ok: false, error: 'That time may already be booked' });
        }
      }

      // PRIMARY INSERT: exact documented mobile schema.
      const base = {
        service,
        serviceKey,
        price: String(b.price || '').trim(),
        barber,
        date,
        time,
        language: String(b.language || 'uk').trim(),
        createdAt: b.createdAt || new Date().toISOString()
      };

      let payload = { ...base };
      if (customerEmail) payload.customer_email = customerEmail;
      if (accountId) payload.account_id = accountId;

      let result = await rest(url, key, table, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });

      // account_id/customer_email are optional columns. If either is missing,
      // retry with the guaranteed booking columns only.
      if (!result.response.ok && schemaError(result.data)) {
        result = await rest(url, key, table, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(base)
        });
      }

      // Fallback only for a genuinely relational-only table.
      if (!result.response.ok && schemaError(result.data)) {
        const relational = {
          barber_id: b.barberId,
          service_id: b.serviceId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          account_id: accountId || null,
          booking_date: date,
          booking_time: time,
          status: 'confirmed',
          notes: b.notes || null
        };
        if (!relational.barber_id || !relational.service_id) {
          return res.status(502).json({ ok: false, error: 'Booking database schema does not match the site', detail: result.data?.message || '' });
        }
        result = await rest(url, key, table, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(relational)
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

      const raw = Array.isArray(result.data) ? result.data[0] : result.data;
      const booking = raw?.booking_date
        ? {
            id: raw.id,
            barber: b.barber,
            service,
            serviceKey,
            date: raw.booking_date,
            time: String(raw.booking_time || '').slice(0, 5),
            accountId: raw.account_id || accountId,
            customerEmail: raw.customer_email || customerEmail,
            status: raw.status || 'confirmed'
          }
        : normalizeLegacy({ ...base, ...raw, account_id: raw?.account_id || accountId, customer_email: raw?.customer_email || customerEmail });

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
      return res.status(502).json({ ok: false, error: 'Database connection failed', detail: error.message || '' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
