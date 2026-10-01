# Mobile features setup

The mobile account/booking layer now supports profile editing, avatar, booking tabs, reminder preferences, first-registration promo and an account gate before booking.

## Supabase optional columns for email reminders

Run once if the `bookings` table does not already contain these columns:

```sql
alter table bookings add column if not exists customer_email text;
alter table bookings add column if not exists account_id text;
alter table bookings add column if not exists payment_status text default 'confirmed';
alter table bookings add column if not exists reminder_24_sent boolean default false;
alter table bookings add column if not exists reminder_2_sent boolean default false;
alter table bookings add column if not exists status text default 'confirmed';

-- Prevent two clients from booking the same barber/time. Run only if this constraint does not already exist.
create unique index if not exists bookings_barber_date_time_unique
on bookings (barber, date, time);
```

Set `CRON_SECRET` in Vercel if you want the reminder endpoint protected. Vercel Cron calls `/api/reminders` every 15 minutes.

Online payment UI is present on mobile, but no real  transaction is faked. A payment provider must be configured before charging customers.


## In-app reminders

The mobile account now supports browser notification permission and schedules 24h/2h reminders while the site is active. For guaranteed delivery when the site is fully closed, the next production step is Web Push (service worker + VAPID subscription + server-side push sender). No fake notification delivery is used.

## Promo expiry

The first-registration `WELCOME10` promo expires 4 days after account creation. Expired codes remain visible in the account history but cannot be copied/used.

## Payment methods

Mobile booking now stores `cash` or `` as the selected payment method. Cash can be confirmed immediately.  selection is intentionally blocked until a real payment provider is configured; no fake successful payment is created.
