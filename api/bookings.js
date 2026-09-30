function config() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    table: process.env.SUPABASE_BOOKINGS_TABLE || 'bookings'
  };
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function sendBookingEmail(b) {
  if (!b.customerEmail || !process.env.RESEND_API_KEY) return;
  const from = process.env.CONTACT_FROM || 'Crown & Blade <onboarding@resend.dev>';
  const language = b.language || 'ua';
  const subject = language === 'en' ? 'Crown & Blade — booking confirmed' : 'Crown & Blade — бронювання підтверджено';
  const text = language === 'en'
    ? `Your appointment is confirmed.\n\nService: ${b.service || b.serviceKey}\nBarber: ${b.barber}\nDate: ${b.date}\nTime: ${b.time}`
    : `Ваш запис підтверджено.\n\nПослуга: ${b.service || b.serviceKey}\nБарбер: ${b.barber}\nДата: ${b.date}\nЧас: ${b.time}`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [b.customerEmail], subject, text })
    });
  } catch {}
}

export default async function handler(req, res) {
  const { url, key, table } = config();
  if (!url || !key) return res.status(503).json({ ok: false, error: 'Booking database is not configured' });

  if (req.method === 'GET') {
    const month = String(req.query.month || '');
    const barber = String(req.query.barber || '');
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ ok: false, error: 'Invalid month' });
    const from = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const next = new Date(year, mon, 1);
    const to = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-01`;
    let query = `select=date,time,barber&date=gte.${from}&date=lt.${to}`;
    if (barber) query += `&barber=eq.${encodeURIComponent(barber)}`;
    const r = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: headers(key) });
    const data = await r.json().catch(() => []);
    if (!r.ok) return res.status(502).json({ ok: false, error: 'Database read failed' });
    return res.status(200).json({ ok: true, bookings: data });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.date || !b.time || !b.barber || !b.serviceKey) return res.status(400).json({ ok: false, error: 'Missing booking fields' });
    const payload = {
      id: b.id,
      service_key: b.serviceKey,
      service: b.service,
      price: b.price,
      barber: b.barber,
      date: b.date,
      time: b.time,
      language: b.language || 'ua',
      created_at: b.createdAt || new Date().toISOString()
    };
    const r = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers(key), Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(409).json({ ok: false, error: 'That time may already be booked' });
    await sendBookingEmail(b);
    return res.status(201).json({ ok: true, booking: Array.isArray(data) ? data[0] : data, emailSent: Boolean(b.customerEmail && process.env.RESEND_API_KEY) });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
