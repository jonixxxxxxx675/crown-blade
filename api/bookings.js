function config() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    table: process.env.SUPABASE_BOOKINGS_TABLE || 'bookings',
    barbersTable: process.env.SUPABASE_BARBERS_TABLE || 'barbers',
    servicesTable: process.env.SUPABASE_SERVICES_TABLE || 'services',
  };
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function rest(url, key, path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: headers(key, options.headers || {}),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function errorDetail(data) {
  return data?.message || data?.hint || data?.details || '';
}

function isDuplicate(response, data) {
  const code = String(data?.code || '');
  const message = String(data?.message || '');
  return response.status === 409 || code === '23505' || /duplicate|unique/i.test(message);
}

const SERVICE_ALIASES = {
  classic: ['Classic Haircut', 'Класична стрижка', 'Haircut'],
  hairBeard: ['Hair + Beard', 'Стрижка + борода'],
  beardTrim: ['Beard Trim', 'Оформлення бороди'],
  royalShave: ['Royal Shave', 'Королівське гоління'],
  kidsHaircut: ['Kids Haircut', 'Дитяча стрижка'],
};

function serviceMatches(row, service, serviceKey) {
  const wanted = new Set([
    normalize(service),
    normalize(serviceKey),
    ...(SERVICE_ALIASES[serviceKey] || []).map(normalize),
  ].filter(Boolean));

  return wanted.has(normalize(row.name));
}

async function findBarber(url, key, table, barberId, barberName) {
  if (isUuid(barberId)) {
    const result = await rest(
      url,
      key,
      `${table}?select=id,name&id=eq.${encodeURIComponent(barberId)}&limit=1`
    );
    if (result.response.ok && Array.isArray(result.data) && result.data[0]) {
      return result.data[0];
    }
  }

  const name = String(barberName || '').trim();
  if (!name) return null;

  const result = await rest(
    url,
    key,
    `${table}?select=id,name&name=eq.${encodeURIComponent(name)}&limit=1`
  );

  if (!result.response.ok || !Array.isArray(result.data)) return null;
  return result.data[0] || null;
}

async function findService(url, key, table, serviceId, service, serviceKey) {
  if (isUuid(serviceId)) {
    const result = await rest(
      url,
      key,
      `${table}?select=id,name,price,duration_minutes&id=eq.${encodeURIComponent(serviceId)}&limit=1`
    );
    if (result.response.ok && Array.isArray(result.data) && result.data[0]) {
      return result.data[0];
    }
  }

  const result = await rest(
    url,
    key,
    `${table}?select=id,name,price,duration_minutes&is_active=eq.true&order=name.asc`
  );

  if (!result.response.ok || !Array.isArray(result.data)) return null;

  return (
    result.data.find(row => serviceMatches(row, service, serviceKey)) ||
    null
  );
}

async function loadReferenceMaps(url, key, barbersTable, servicesTable) {
  const [barbersResult, servicesResult] = await Promise.all([
    rest(
      url,
      key,
      `${barbersTable}?select=id,name,is_active&order=name.asc`
    ),
    rest(
      url,
      key,
      `${servicesTable}?select=id,name,price,duration_minutes,is_active&order=name.asc`
    ),
  ]);

  return {
    barbers: barbersResult.response.ok && Array.isArray(barbersResult.data)
      ? barbersResult.data
      : [],
    services: servicesResult.response.ok && Array.isArray(servicesResult.data)
      ? servicesResult.data
      : [],
  };
}

function serializeBooking(row, barberMap, serviceMap) {
  const barber = barberMap.get(String(row.barber_id)) || {};
  const service = serviceMap.get(String(row.service_id)) || {};

  return {
    id: row.id,
    barberId: row.barber_id,
    serviceId: row.service_id,
    barber: barber.name || '',
    service: service.name || '',
    serviceKey: '',
    price: service.price ?? '',
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || '',
    date: row.booking_date || '',
    time: String(row.booking_time || '').slice(0, 5),
    status: row.status || 'confirmed',
    notes: row.notes || null,
    createdAt: row.created_at || null,
  };
}

async function sendBookingEmail(b) {
  if (!b.customerEmail || !process.env.RESEND_API_KEY) return false;

  const from =
    process.env.CONTACT_FROM ||
    process.env.RESEND_FROM ||
    'Crown & Blade <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [b.customerEmail],
        subject: 'Crown & Blade — бронювання підтверджено',
        text:
          `Ваш запис підтверджено.\n\n` +
          `Послуга: ${b.service || ''}\n` +
          `Барбер: ${b.barber || ''}\n` +
          `Дата: ${b.date || ''}\n` +
          `Час: ${b.time || ''}\n\n` +
          `Дякуємо, що обрали Crown & Blade.`,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const { url, key, table, barbersTable, servicesTable } = config();

  if (!url || !key) {
    return res.status(503).json({
      ok: false,
      error: 'Booking database is not configured',
    });
  }

  // =========================
  // GET — отримати бронювання
  // =========================

  if (req.method === 'GET') {
    const month = String(req.query.month || '').trim();
    const email = normalize(req.query.email || '');
    const barberName = String(req.query.barber || '').trim();

    if (!/^\d{4}-\d{2}$/.test(month) && !email) {
      return res.status(400).json({
        ok: false,
        error: 'Month or email filter is required',
      });
    }

    try {
      const refs = await loadReferenceMaps(
        url,
        key,
        barbersTable,
        servicesTable
      );

      const barberMap = new Map(
        refs.barbers.map(row => [String(row.id), row])
      );
      const serviceMap = new Map(
        refs.services.map(row => [String(row.id), row])
      );

      let selectedBarberId = '';
      if (barberName) {
        const wanted = normalize(barberName);
        const barber = refs.barbers.find(
          row => normalize(row.name) === wanted
        );

        if (barber) {
          selectedBarberId = String(barber.id);
        }
      }

      const params = new URLSearchParams();
      params.set(
        'select',
        'id,barber_id,service_id,customer_name,customer_phone,customer_email,booking_date,booking_time,status,notes,created_at'
      );

      if (/^\d{4}-\d{2}$/.test(month)) {
        const [year, mon] = month.split('-').map(Number);
        const from = `${month}-01`;
        const next = new Date(year, mon, 1);
        const to =
          `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;

        params.set('booking_date', `gte.${from}`);
        params.append('booking_date', `lt.${to}`);
      }

      if (selectedBarberId) {
        params.set('barber_id', `eq.${selectedBarberId}`);
      }

      if (email) {
        params.set('customer_email', `eq.${email}`);
      }

      params.set('status', 'neq.cancelled');
      params.set('order', 'booking_date.asc,booking_time.asc');

      const result = await rest(
        url,
        key,
        `${table}?${params.toString()}`
      );

      if (!result.response.ok) {
        return res.status(502).json({
          ok: false,
          error: 'Database read failed',
          detail: errorDetail(result.data),
        });
      }

      const bookings = (Array.isArray(result.data) ? result.data : []).map(
        row => serializeBooking(row, barberMap, serviceMap)
      );

      return res.status(200).json({
        ok: true,
        bookings,
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'Database read failed',
        detail: error.message || '',
      });
    }
  }

  // =========================
  // POST — створити бронювання
  // =========================

  if (req.method === 'POST') {
    const b = req.body || {};
    const barberId = String(b.barberId || '').trim();
    const serviceId = String(b.serviceId || '').trim();
    const date = String(b.date || '').trim();
    const time = String(b.time || '').trim().slice(0, 5);
    const customerName = String(b.customerName || '').trim();
    const customerPhone = String(b.customerPhone || '').trim();
    const customerEmail = String(b.customerEmail || '').trim().toLowerCase();

    if (
      !isUuid(barberId) ||
      !isUuid(serviceId) ||
      !date ||
      !time ||
      !customerName ||
      !customerPhone
    ) {
      return res.status(400).json({
        ok: false,
        error: 'Missing or invalid booking fields',
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid booking date or time',
      });
    }

    try {
      // Only the booking table is touched on the critical write path.
      // barber_id/service_id are already real UUIDs from the frontend.
      const duplicateQuery = new URLSearchParams({
        select: 'id',
        barber_id: `eq.${barberId}`,
        booking_date: `eq.${date}`,
        booking_time: `eq.${time}:00`,
        status: 'neq.cancelled',
        limit: '1',
      });

      const duplicate = await rest(
        url,
        key,
        `${table}?${duplicateQuery.toString()}`
      );

      if (!duplicate.response.ok) {
        return res.status(502).json({
          ok: false,
          error: 'Booking availability check failed',
          detail: errorDetail(duplicate.data),
        });
      }

      if (Array.isArray(duplicate.data) && duplicate.data.length) {
        return res.status(409).json({
          ok: false,
          error: 'That time may already be booked',
        });
      }

      const payload = {
        barber_id: barberId,
        service_id: serviceId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        booking_date: date,
        booking_time: `${time}:00`,
        status: 'confirmed',
        notes: b.notes || null,
      };

      const result = await rest(url, key, table, {
        method: 'POST',
        headers: {
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });

      if (!result.response.ok) {
        const conflict = isDuplicate(result.response, result.data);
        return res.status(conflict ? 409 : 502).json({
          ok: false,
          error: conflict
            ? 'That time may already be booked'
            : 'Booking creation failed',
          detail: errorDetail(result.data),
        });
      }

      const raw = Array.isArray(result.data) ? result.data[0] : result.data;

      const booking = {
        id: raw?.id,
        barberId,
        serviceId,
        barber: String(b.barber || '').trim(),
        service: String(b.service || '').trim(),
        serviceKey: String(b.serviceKey || '').trim(),
        price: b.price ?? '',
        customerName,
        customerPhone,
        customerEmail: raw?.customer_email || customerEmail,
        date: raw?.booking_date || date,
        time: String(raw?.booking_time || time).slice(0, 5),
        status: raw?.status || 'confirmed',
        notes: raw?.notes || b.notes || null,
        createdAt: raw?.created_at || new Date().toISOString(),
      };

      const emailSent = await sendBookingEmail(booking);

      return res.status(201).json({
        ok: true,
        booking,
        emailSent,
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'Booking creation failed',
        detail: error.message || '',
      });
    }
  }

  // =========================
  // DELETE — скасувати запис
  // =========================

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '').trim();

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Missing booking id',
      });
    }

    try {
      const result = await rest(
        url,
        key,
        `${table}?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: {
            Prefer: 'return=minimal',
          },
        }
      );

      if (!result.response.ok) {
        return res.status(502).json({
          ok: false,
          error: 'Booking cancellation failed',
          detail: errorDetail(result.data),
        });
      }

      return res.status(200).json({
        ok: true,
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'Database connection failed',
        detail: error.message || '',
      });
    }
  }

  return res.status(405).json({
    ok: false,
    error: 'Method not allowed',
  });
}
