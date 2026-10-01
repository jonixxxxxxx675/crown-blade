function config() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    table: process.env.SUPABASE_BOOKINGS_TABLE || 'bookings'
  };
}

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

async function sendBookingEmail(b) {
  if (!b.customerEmail || !process.env.RESEND_API_KEY) return;

  const from =
    process.env.CONTACT_FROM ||
    process.env.RESEND_FROM ||
    'Crown & Blade <onboarding@resend.dev>';

  const subject = 'Crown & Blade — бронювання підтверджено';

  const text = `
Ваш запис підтверджено.

Послуга: ${b.service || ''}
Барбер: ${b.barber || ''}
Дата: ${b.date}
Час: ${b.time}

Дякуємо, що обрали Crown & Blade.
`;

  try {
    await fetch('https://api.resend.com/emails', {
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
  } catch {}
}

export default async function handler(req, res) {
  const { url, key, table } = config();

  if (!url || !key) {
    return res.status(503).json({
      ok: false,
      error: 'Booking database is not configured'
    });
  }

  // =========================
  // GET — отримати бронювання
  // =========================

  if (req.method === 'GET') {
    const month = String(req.query.month || '');

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid month'
      });
    }

    const [year, mon] = month.split('-').map(Number);

    const from = `${month}-01`;

    const next = new Date(year, mon, 1);

    const to =
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;

    const params = new URLSearchParams();

    params.set(
      'select',
      'id,barber_id,service_id,booking_date,booking_time,status'
    );

    params.set('booking_date', `gte.${from}`);
    params.set('booking_date', `lt.${to}`);

    let r;

    try {
      r = await fetch(
        `${url}/rest/v1/${table}?${params.toString()}`,
        {
          headers: headers(key)
        }
      );
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Database connection failed'
      });
    }

    const data = await r.json().catch(() => []);

    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Database read failed',
        detail: data?.message || ''
      });
    }

    return res.status(200).json({
      ok: true,
      bookings: Array.isArray(data) ? data : []
    });
  }

  // =========================
  // POST — створити бронювання
  // =========================

  if (req.method === 'POST') {
    const b = req.body || {};

    if (
      !b.barberId ||
      !b.serviceId ||
      !b.date ||
      !b.time ||
      !b.customerName ||
      !b.customerPhone
    ) {
      return res.status(400).json({
        ok: false,
        error: 'Missing booking fields'
      });
    }

    const payload = {
      barber_id: b.barberId,
      service_id: b.serviceId,
      customer_name: b.customerName,
      customer_phone: b.customerPhone,
      customer_email: b.customerEmail || null,
      booking_date: b.date,
      booking_time: b.time,
      status: 'confirmed',
      notes: b.notes || null
    };

    let r;

    try {
      r = await fetch(
        `${url}/rest/v1/${table}`,
        {
          method: 'POST',
          headers: {
            ...headers(key),
            Prefer: 'return=representation'
          },
          body: JSON.stringify(payload)
        }
      );
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'Database connection failed'
      });
    }

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(
        r.status === 409 || r.status === 422 ? 409 : 502
      ).json({
        ok: false,
        error: 'That time may already be booked',
        detail: data?.message || ''
      });
    }

    await sendBookingEmail(b);

    return res.status(201).json({
      ok: true,
      booking: Array.isArray(data) ? data[0] : data,
      emailSent: Boolean(
        b.customerEmail && process.env.RESEND_API_KEY
      )
    });
  }

  // =========================
  // DELETE — скасувати запис
  // =========================

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Missing booking id'
      });
    }

    const r = await fetch(
      `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          ...headers(key),
          Prefer: 'return=minimal'
        }
      }
    );

    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Booking cancellation failed'
      });
    }

    return res.status(200).json({
      ok: true
    });
  }

  return res.status(405).json({
    ok: false,
    error: 'Method not allowed'
  });
}
