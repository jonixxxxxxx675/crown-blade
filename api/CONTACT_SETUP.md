# Crown & Blade — mobile account + email setup

Mobile account UI is local-first: the profile and hashed password survive reloads on the same device. The session can be logged out without deleting the saved profile. Real email verification and booking confirmation use the existing Vercel serverless API + Resend integration.

## Vercel environment variables

Add these in **Vercel → Project → Settings → Environment Variables**:

- `RESEND_API_KEY` — Resend API key.
- `CONTACT_FROM` — verified sender, for example `Crown & Blade <noreply@yourdomain.com>`.
- `SITE_URL` — public site URL, for example `https://your-domain.com`.
- `AUTH_VERIFICATION_SECRET` — long random secret used to sign 24-hour verification links.

Existing booking database variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BOOKINGS_TABLE` — optional, defaults to `bookings`.

## Email flows

- `POST /api/account` sends a signed 24-hour verification link.
- `GET /api/account?token=...` validates the link and redirects to `account.html?verified=1&email=...`.
- `POST /api/bookings` sends a booking confirmation email to `customerEmail` after a successful database booking.

The frontend shows the email state as **Email підтверджено** / **Email ще не підтверджено**. The email service must be configured on Vercel for real delivery.

## Important Resend step

The `CONTACT_FROM` address/domain must be allowed by Resend. For production, verify the domain in Resend and use that verified sender address. Do not put `RESEND_API_KEY` or `AUTH_VERIFICATION_SECRET` into frontend files.

## Local fallback

If the mail service is not configured, the mobile account still works locally and keeps the profile on the device, but no real verification email is delivered.

## Supabase bookings table

Keep a unique constraint on `(barber, date, time)` so two users cannot reserve the same slot simultaneously.
