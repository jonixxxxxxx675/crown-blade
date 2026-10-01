function config() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bookingsTable: process.env.SUPABASE_BOOKINGS_TABLE || 'bookings',
    clientsTable: process.env.SUPABASE_CLIENTS_TABLE || 'clients'
  };
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

function authorized(req) {
  const password = process.env.ADMIN_PASSWORD || '';
  return Boolean(password && req.headers['x-admin-password'] === password);
}

const SERVICES = [
  { key:'classic', name:'Класична стрижка', price:'80 грн' },
  { key:'hairBeard', name:'Стрижка + борода', price:'130 грн' },
  { key:'beardTrim', name:'Оформлення бороди', price:'60 грн' },
  { key:'royalShave', name:'Королівське гоління', price:'70 грн' },
  { key:'kidsHaircut', name:'Дитяча стрижка', price:'60 грн' }
];
const BARBERS = ['Alex','Mia','Daniel','Emma','Max'];
const TIMES = Array.from({length:21}, (_, i) => {
  const m = 600 + i * 30;
  return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
});

async function readRows(url, key, table, query) {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: headers(key) });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    const error = String(data?.message || '');
    if (/relation .* does not exist|table .* does not exist|not found/i.test(error)) return [];
    throw new Error(error || 'Database read failed');
  }
  return Array.isArray(data) ? data : [];
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(process.env.ADMIN_PASSWORD ? 401 : 503).json({ ok:false, error: process.env.ADMIN_PASSWORD ? 'Unauthorized' : 'ADMIN_PASSWORD is not configured' });
  if (req.method !== 'GET' && req.method !== 'DELETE') return res.status(405).json({ ok:false, error:'Method not allowed' });

  const { url, key, bookingsTable, clientsTable } = config();
  if (!url || !key) return res.status(503).json({ ok:false, error:'Database is not configured' });

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '').trim();
    if (!id) return res.status(400).json({ ok:false, error:'Missing booking id' });
    const response = await fetch(`${url}/rest/v1/${bookingsTable}?id=eq.${encodeURIComponent(id)}`, {
      method:'DELETE',
      headers:headers(key, { Prefer:'return=minimal' })
    });
    if (!response.ok) return res.status(502).json({ ok:false, error:'Booking cancellation failed' });
    return res.status(200).json({ ok:true });
  }

  try {
    const bookings = await readRows(url, key, bookingsTable,
      new URLSearchParams({ select:'*', order:'date.asc,time.asc' }).toString());
    let clients = await readRows(url, key, clientsTable,
      new URLSearchParams({ select:'id,name,email,phone,created_at', order:'created_at.desc' }).toString());

    if (!clients.length && bookings.length) {
      const seen = new Map();
      bookings.forEach(b => {
        const email = String(b.customer_email || '').toLowerCase();
        if (!email || seen.has(email)) return;
        seen.set(email, {
          id:b.account_id || email,
          name:b.customer_name || '—',
          email,
          phone:b.customer_phone || '—',
          created_at:b.created_at || null
        });
      });
      clients = [...seen.values()];
    }

    const activeBookings = bookings.filter(b => String(b.status || '').toLowerCase() !== 'cancelled');
    const stats = {
      totalBookings: bookings.length,
      activeBookings: activeBookings.length,
      cancelledBookings: bookings.length - activeBookings.length,
      clients: clients.length,
      todayBookings: activeBookings.filter(b => b.date === new Date().toISOString().slice(0,10)).length
    };

    return res.status(200).json({ ok:true, bookings, clients, services:SERVICES, barbers:BARBERS, times:TIMES, stats });
  } catch (error) {
    return res.status(502).json({ ok:false, error:'Database read failed', detail:error.message || '' });
  }
}
