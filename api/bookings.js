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
  const from = process.env.CONTACT_FROM || process.env.RESEND_FROM || 'Crown & Blade <onboarding@resend.dev>';
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

async function sendCancellationEmail(b) {
  if (!b.customerEmail || !process.env.RESEND_API_KEY) return;
  const from = process.env.CONTACT_FROM || process.env.RESEND_FROM || 'Crown & Blade <onboarding@resend.dev>';
  const language = b.language || 'ua';
  const subject = language === 'en' ? 'Crown & Blade — booking cancelled' : 'Crown & Blade — бронювання скасовано';
  const text = language === 'en'
    ? `Your appointment has been cancelled.\n\nService: ${b.service || b.serviceKey}\nBarber: ${b.barber}\nDate: ${b.date}\nTime: ${b.time}`
    : `Ваш запис скасовано.\n\nПослуга: ${b.service || b.serviceKey}\nБарбер: ${b.barber}\nДата: ${b.date}\nЧас: ${b.time}`;
  try { await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[b.customerEmail],subject,text})}); } catch {}
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
    // `mon` is 1–12 here; Date expects a zero-based month.
    // Building the next month this way also handles December correctly.
    const next = new Date(year, mon, 1);
    const to = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-01`;
    const params = new URLSearchParams({
      select: 'date,time,barber',
      'date': `gte.${from}`,
      'date': `lt.${to}`
    });
    if (barber) params.set('barber', `eq.${barber}`);
    let r;
    try {
      r = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, { headers: headers(key) });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Database connection failed' });
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = typeof data?.message === 'string' ? data.message : (typeof data?.hint === 'string' ? data.hint : '');
      return res.status(502).json({ ok: false, error: 'Database read failed', detail });
    }
    return res.status(200).json({ ok: true, bookings: Array.isArray(data) ? data : [] });
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
      created_at: b.createdAt || new Date().toISOString(),
      customer_email: b.customerEmail || null,
      account_id: b.accountId || null,
      payment_status: b.paymentStatus || 'confirmed'
    };
    let r = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers(key), Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    let data = await r.json().catch(() => ({}));
    // Older bookings tables may not have the optional account/email/payment columns yet.
    // Retry with the original core schema instead of breaking existing deployments.
    if (!r.ok && (data?.code === 'PGRST204' || data?.code === '42703' || /column .* does not exist/i.test(String(data?.message||'')))) {
      const corePayload = {id:b.id,service_key:b.serviceKey,service:b.service,price:b.price,barber:b.barber,date:b.date,time:b.time,language:b.language||'ua',created_at:b.createdAt||new Date().toISOString()};
      r = await fetch(`${url}/rest/v1/${table}`, {method:'POST',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify(corePayload)});
      data = await r.json().catch(()=>({}));
    }
    if (!r.ok) return res.status(r.status===409||r.status===422?409:502).json({ ok: false, error: 'That time may already be booked', detail: data?.message || '' });
    await sendBookingEmail(b);
    return res.status(201).json({ ok: true, booking: Array.isArray(data) ? data[0] : data, emailSent: Boolean(b.customerEmail && process.env.RESEND_API_KEY) });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
