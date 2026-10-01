import webpush from 'web-push';

function config() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    table: process.env.SUPABASE_PUSH_TABLE || 'push_subscriptions'
  };
}

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

function validSubscription(value) {
  return value && typeof value.endpoint === 'string' && value.endpoint.startsWith('https://') &&
    value.keys && typeof value.keys.p256dh === 'string' && typeof value.keys.auth === 'string';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const { url, key, table } = config();
  if (!url || !key) return res.status(503).json({ ok: false, error: 'Push database is not configured' });

  const body = req.body || {};
  const action = String(body.action || 'subscribe');
  const subscription = body.subscription;
  const accountId = String(body.accountId || '').trim();
  const email = String(body.email || '').trim().toLowerCase();

  if (action === 'unsubscribe') {
    if (!subscription?.endpoint) return res.status(400).json({ ok: false, error: 'Missing subscription endpoint' });
    const response = await fetch(`${url}/rest/v1/${table}?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`, {
      method: 'DELETE',
      headers: { ...headers(key), Prefer: 'return=minimal' }
    });
    if (!response.ok) return res.status(502).json({ ok: false, error: 'Could not remove push subscription' });
    return res.status(200).json({ ok: true });
  }

  if (!validSubscription(subscription)) return res.status(400).json({ ok: false, error: 'Invalid push subscription' });
  if (!accountId && !email) return res.status(400).json({ ok: false, error: 'Missing account identity' });

  const payload = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    account_id: accountId || null,
    email: email || null,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...headers(key),
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(502).json({ ok: false, error: 'Could not save push subscription', detail: data?.message || '' });

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return res.status(503).json({ ok: false, error: 'VAPID is not configured' });
  }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    await webpush.sendNotification(subscription, JSON.stringify({
      title: 'Crown & Blade',
      body: 'Сповіщення увімкнено. Ми зможемо надіслати нагадування про ваш запис.',
      tag: 'cb-push-enabled',
      url: '/account.html'
    }));
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Push subscription saved, but test notification failed', detail: error?.message || '' });
  }
  return res.status(200).json({ ok: true, testSent: true });
}
