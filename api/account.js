import crypto from 'node:crypto';

function baseUrl(req) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers.host;
  return `${proto}://${host}`;
}

function tokenFor(email) {
  const secret = process.env.AUTH_VERIFICATION_SECRET;
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const secret = process.env.AUTH_VERIFICATION_SECRET;
  if (!secret || !token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.email || !data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

async function sendVerificationEmail({ email, name, req }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM || 'Crown & Blade <onboarding@resend.dev>';
  if (!apiKey) return { ok: false, error: 'Email service is not configured' };
  const token = tokenFor(email);
  if (!token) return { ok: false, error: 'AUTH_VERIFICATION_SECRET is not configured' };
  const verifyUrl = `${baseUrl(req)}/api/account?token=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Crown & Blade — підтвердження email',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0b0a09;color:#f5eee5;padding:32px;border-radius:16px"><h1 style="font-family:Georgia,serif">Crown &amp; Blade</h1><p>Вітаємо, ${String(name || '').replace(/[<>]/g,'')}.</p><p>Підтвердьте email, щоб завершити реєстрацію акаунта.</p><p><a href="${verifyUrl}" style="display:inline-block;padding:14px 22px;background:#e2b477;color:#17110b;text-decoration:none;border-radius:999px;font-weight:700">ПІДТВЕРДИТИ EMAIL</a></p><p style="color:#aaa;font-size:12px">Посилання дійсне 24 години.</p></div>`
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: data.message || 'Email provider error' };
  return { ok: true, id: data.id };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = verifyToken(String(req.query.token || ''));
    if (!data) return res.status(400).send('Verification link is invalid or expired.');
    const url = `${baseUrl(req)}/account.html?verified=1&email=${encodeURIComponent(data.email)}`;
    res.writeHead(302, { Location: url });
    return res.end();
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const { action = 'register', name = '', email = '', phone = '' } = req.body || {};
  if (action !== 'register') return res.status(400).json({ ok: false, error: 'Unsupported action' });
  if (!name.trim() || !email.trim() || !phone.trim()) return res.status(400).json({ ok: false, error: 'Name, email and phone are required' });
  const result = await sendVerificationEmail({ name: name.trim(), email: email.trim().toLowerCase(), req });
  if (!result.ok) return res.status(503).json(result);
  return res.status(200).json({ ok: true, verificationSent: true, id: result.id });
}
