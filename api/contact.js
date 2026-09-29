export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { email, message, language = 'ua', type = 'contact' } = req.body || {};
  if (!email || !message) return res.status(400).json({ ok: false, error: 'Email and message are required' });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.CONTACT_FROM || 'Crown & Blade <onboarding@resend.dev>';
  if (!apiKey || !to) return res.status(503).json({ ok: false, error: 'Email service is not configured' });

  const subject = type === 'support'
    ? `Crown & Blade — Support (${language.toUpperCase()})`
    : `Crown & Blade — Contact (${language.toUpperCase()})`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject,
      text: `From: ${email}\nLanguage: ${language}\nType: ${type}\n\n${message}`
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(502).json({ ok: false, error: data.message || 'Email provider error' });
  return res.status(200).json({ ok: true, id: data.id });
}
