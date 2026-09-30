# Crown & Blade — mobile account + email setup

The mobile site keeps account details locally so the account survives reloads on the same device. Real email verification and booking confirmation use the existing Vercel serverless API + Resend integration.

## Vercel environment variables

Required for real email delivery:

- `RESEND_API_KEY` — Resend API key.
- `CONTACT_FROM` — verified sender, e.g. `Crown & Blade <noreply@yourdomain.com>`.
- `SITE_URL` — public site URL, e.g. `https://your-domain.com`.
- `AUTH_VERIFICATION_SECRET` — long random secret used to sign email verification links.

Existing booking database variables remain:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BOOKINGS_TABLE` — optional, defaults to `bookings`.

## Email flows

- `POST /api/account` sends a signed 24-hour email verification link.
- `GET /api/account?token=...` validates the link and returns the user to the account page as verified.
- `POST /api/bookings` sends a booking confirmation email to `customerEmail` after a successful database booking.

If the mail service is not configured, the mobile account still saves locally and the booking flow continues to work in local mode.

## Supabase bookings table

The existing `bookings` table remains compatible with the current frontend. For production, keep a unique constraint on `(barber, date, time)` so two users cannot reserve the same slot.
