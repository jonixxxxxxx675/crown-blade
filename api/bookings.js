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

const SERVICE_NAMES = {
  classic: 'Класична стрижка',
  hairBeard: 'Стрижка + борода',
  beardTrim: 'Оформлення бороди',
  royalShave: 'Королівське гоління',
  kidsHaircut: 'Дитяча стрижка'
};

async function rest(url, key, path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: headers(key, options.headers || {})
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function findId(url, key, table, name) {
  const params = new URLSearchParams({
    select: 'id,name',
    name: `eq.${name}`,
    limit: '1'
  });

  const { response, data } = await rest(url, key, `${table}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(data?.message || `Failed to read ${table}`);
  }

  return Array.isArray(data) && data[0] ? data[0].id : null;
}

async function getBarbersMap(url, key) {
  const { response, data } = await rest(url, key, 'barbers?select=id,name');
  if (!response.ok) throw new Error(data?.message || 'Failed to read barbers');

  const map = new Map();
  for (const row of Array.isArray(data) ? data : []) {
    map.set(String(row.id), row.name);
  }
  return map;
}

async function sendBookingEmail(b) {
  if (!b.customerEmail || !process.env.RESEND_API_KEY) return false;

  const from =
    process.env.CONTACT_FROM ||
    process.env.RESEND_FROM ||
    'Crown & Blade <onboarding@resend.dev>';

  const subject = 'Crown & Blade — бронювання підтверджено';

  const text = `
Ваш запис підтверджено.

Послуга: ${b.service || b.serviceKey || ''}
Барбер: ${b.barber || ''}
Дата: ${b.date || ''}
Час: ${b.time || ''}

Дякуємо, що обрали Crown & Blade.
`;

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
        subject,
        text
      })
    });

    return response.ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const { url, key, table } = config();

  if (!url || !key) {
    return res.status(503).json({
      ok: false,
      error: 'Booking database is not configured'
    });
  }

  // GET: return bookings for the selected month.
  if (req.method === 'GET') {
    const month = String(req.query.month || '');

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ ok: false, error: 'Invalid month' });
    }

    const [year, mon] = month.split('-').map(Number);
    const from = `${month}-01`;
    const next = new Date(year, mon, 1);
    const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;

    const params = new URLSearchParams();
    params.set('select', 'id,barber_id,service_id,booking_date,booking_time,status');
    params.append('booking_date', `gte.${from}`);
    params.append('booking_date', `lt.${to}`);
    params.set('status', 'neq.cancelled');
    params.set('order', 'booking_date.asc,booking_time.asc');

    try {
      const { response, data } = await rest(url, key, `${table}?${params.toString()}`);
      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          error: 'Database read failed',
          detail: data?.message || data?.hint || ''
        });
      }

      const barberMap = await getBarbersMap(url, key);

      const bookings = (Array.isArray(data) ? data : []).map(row => ({
        id: row.id,
        barberId: row.barber_id,
        serviceId: row.service_id,
        barber: barberMap.get(String(row.barber_id)) || '',
        date: row.booking_date,
        time: String(row.booking_time || '').slice(0, 5),
        status: row.status || 'confirmed'
      }));

      return res.status(200).json({ ok: true, bookings });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'Database read failed',
        detail: error.message || ''
      });
    }
  }

  // POST: create a real booking in Supabase.
  if (req.method === 'POST') {
    const b = req.body || {};

    if (!b.barber || !b.serviceKey || !b.date || !b.time || !b.customerName || !b.customerPhone) {
      return res.status(400).json({
        ok: false,
        error: 'Missing booking fields'
      });
    }

    try {
      const barberId = b.barberId || await findId(url, key, 'barbers', b.barber);
      const serviceName = SERVICE_NAMES[b.serviceKey] || b.service;
      const serviceId = b.serviceId || await findId(url, key, 'services', serviceName);

      if (!barberId) {
        return res.status(400).json({ ok: false, error: `Barber not found: ${b.barber}` });
      }

      if (!serviceId) {
        return res.status(400).json({ ok: false, error: `Service not found: ${serviceName || b.serviceKey}` });
      }

      const payload = {
        id: b.id || undefined,
        barber_id: barberId,
        service_id: serviceId,
        customer_name: b.customerName,
        customer_phone: b.customerPhone,
        customer_email: b.customerEmail || null,
        booking_date: b.date,
        booking_time: b.time,
        status: 'confirmed',
        notes: b.notes || null
      };

      const { response, data } = await rest(url, key, table, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = String(data?.message || '');
        const conflict = response.status === 409 || /duplicate|unique/i.test(message);

        return res.status(conflict ? 409 : 502).json({
          ok: false,
          error: conflict ? 'That time may already be booked' : 'Booking creation failed',
          detail: message
        });
      }

      const booking = Array.isArray(data) ? data[0] : data;
      const emailSent = await sendBookingEmail(b);

      return res.status(201).json({
        ok: true,
        booking,
        emailSent
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'Booking creation failed',
        detail: error.message || ''
      });
    }
  }

  // DELETE: remove a booking completely so the time becomes available again.
  if (req.method === 'DELETE') {
    const id = String(req.query.id || '').trim();

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Missing booking id' });
    }

    try {
      const { response } = await rest(
        url,
        key,
        `${table}?id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
      );

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          error: 'Booking cancellation failed'
        });
      }

      return res.status(200).json({ ok: true });
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Database connection failed'
      });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
