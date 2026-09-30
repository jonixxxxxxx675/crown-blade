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
```

Set `CRON_SECRET` in Vercel if you want the reminder endpoint protected. Vercel Cron calls `/api/reminders` every 15 minutes.

Online payment UI is present on mobile, but no real card transaction is faked. A payment provider must be configured before charging customers.
