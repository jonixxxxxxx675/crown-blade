export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const key = process.env.VAPID_PUBLIC_KEY || '';
  if (!key) return res.status(503).json({ ok: false, error: 'VAPID public key is not configured' });
  return res.status(200).json({ ok: true, publicKey: key });
}
