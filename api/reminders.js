import webpush from 'web-push';

function config() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    table: process.env.SUPABASE_BOOKINGS_TABLE || 'bookings',
    pushTable: process.env.SUPABASE_PUSH_TABLE || 'push_subscriptions'
  };
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function setupPush() {
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return true;
}

async function sendEmail(to, subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.CONTACT_FROM || process.env.RESEND_FROM || 'Crown & Blade <onboarding@resend.dev>';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text })
    });
    return r.ok;
  } catch { return false; }
}

async function getSubscriptions(configValue, booking) {
  const filters = [];
  if (booking.account_id) filters.push(`account_id=eq.${encodeURIComponent(booking.account_id)}`);
  if (booking.customer_email) filters.push(`email=eq.${encodeURIComponent(String(booking.customer_email).toLowerCase())}`);
  if (!filters.length) return [];
  const query = filters.join('&');
  const r = await fetch(`${configValue.url}/rest/v1/${configValue.pushTable}?select=endpoint,p256dh,auth&or=(${query})`, {
    headers: headers(configValue.key)
  });
  if (!r.ok) return [];
  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function sendPush(configValue, booking, kind) {
  if (!setupPush()) return { sent: false, configured: false };
  const subscriptions = await getSubscriptions(configValue, booking);
  if (!subscriptions.length) return { sent: false, configured: true };
  const is24 = kind === '24';
  const payload = JSON.stringify({
    title: 'Crown & Blade',
    body: `Ваш запис через ${is24 ? '24 години' : '2 години'} · ${booking.service || booking.service_key || ''} · ${booking.time || ''}`,
    tag: `cb-${booking.id}-${kind}`,
    url: '/account.html'
  });
  let sent = false;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      }, payload);
      sent = true;
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await fetch(`${configValue.url}/rest/v1/${configValue.pushTable}?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE', headers: { ...headers(configValue.key), Prefer: 'return=minimal' }
        }).catch(() => {});
      }
    }
  }
  return { sent, configured: true };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  const configValue = config();
  if (!configValue.url || !configValue.key) return res.status(503).json({ ok: false, error: 'Database is not configured' });

  const now = new Date();
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    select: '*',
    created_at: `lt.${to}`,
    date: `gte.${now.toISOString().slice(0, 10)}`
  });
  let r;
  try {
    r = await fetch(`${configValue.url}/rest/v1/${configValue.table}?${params}`, { headers: headers(configValue.key) });
  } catch {
    return res.status(502).json({ ok: false, error: 'Database connection failed' });
  }
  const rows = await r.json().catch(() => []);
  if (!r.ok) return res.status(502).json({ ok: false, error: 'Database read failed' });

  let sent = 0;
  let pushSent = 0;
  let emailSent = 0;
  for (const b of Array.isArray(rows) ? rows : []) {
    const at = new Date(`${b.date}T${b.time}:00`);
    if (Number.isNaN(at.getTime())) continue;
    const diff = at - now;
    let kind = '';
    if (diff > 23.75 * 60 * 60 * 1000 && diff < 24.25 * 60 * 60 * 1000 && !b.reminder_24_sent) kind = '24';
    else if (diff > 1.75 * 60 * 60 * 1000 && diff < 2.25 * 60 * 60 * 1000 && !b.reminder_2_sent) kind = '2';
    if (!kind) continue;

    const push = await sendPush(configValue, b, kind);
    const email = b.customer_email ? await sendEmail(
      b.customer_email,
      `Crown & Blade — ${kind === '24' ? 'нагадування за 24 години' : 'нагадування за 2 години'}`,
      `Нагадування про ваш запис.\n\nПослуга: ${b.service || b.service_key}\nБарбер: ${b.barber}\nДата: ${b.date}\nЧас: ${b.time}`
    ) : false;

    if (push.sent) pushSent++;
    if (email) emailSent++;
    if (!push.sent && !email) continue;
    sent++;

    const field = kind === '24' ? 'reminder_24_sent' : 'reminder_2_sent';
    await fetch(`${configValue.url}/rest/v1/${configValue.table}?id=eq.${encodeURIComponent(b.id)}`, {
      method: 'PATCH',
      headers: { ...headers(configValue.key), Prefer: 'return=minimal' },
      body: JSON.stringify({ [field]: true })
    }).catch(() => {});
  }

  return res.status(200).json({ ok: true, sent, pushSent, emailSent, pushConfigured: pushConfigured() });
}
