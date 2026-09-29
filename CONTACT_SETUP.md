# Crown & Blade — real email + shared booking availability

The mobile site works locally with `localStorage`, but real multi-user availability and real email delivery require a backend. The project now includes Vercel serverless endpoints:

- `POST /api/contact` — sends Contact/Support messages through Resend.
- `GET /api/bookings?month=YYYY-MM&barber=Alex` — reads booked slots.
- `POST /api/bookings` — creates a booking.

## Vercel environment variables

Set these in the Vercel project:

- `RESEND_API_KEY` — Resend API key.
- `CONTACT_EMAIL` — the email address that receives Contact/Support messages.
- `CONTACT_FROM` — optional verified sender, e.g. `Crown & Blade <noreply@yourdomain.com>`.
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (server only; never put this in frontend JS).
- `SUPABASE_BOOKINGS_TABLE` — optional, defaults to `bookings`.

## Supabase table

Create a table named `bookings` with these columns:

- `id` text primary key
- `service_key` text
- `service` text
- `price` text
- `barber` text
- `date` date
- `time` text
- `language` text
- `created_at` timestamptz

For production, enable a unique constraint on `(barber, date, time)` so two users cannot reserve the same slot.

Without these environment variables, the frontend automatically keeps working in local mode, but bookings are only visible in the same browser and email cannot be delivered automatically.
