# Mobile booking database

Bookings created by the mobile Confirm Booking button are stored in Supabase `bookings` as the primary database. The browser localStorage copy under `crown_blade_mobile_bookings` is a local cache used by the mobile account UI.

Each record contains: `id`, `service`, `serviceKey`, `price`, `barber`, `date`, `time`, `language`, and `createdAt`.

Supabase is the primary booking database. LocalStorage is only a client-side cache/fallback for the account page.


### Account fields
Bookings may also contain `account_id` and `customer_email`. Add nullable columns with those names to the Supabase `bookings` table so account-linked bookings can be edited or cancelled remotely.


## Internal admin database

The public site does not link to the admin panel. The internal page is `/admin.html` and requires the Vercel environment variable `ADMIN_PASSWORD`.

The admin API uses the existing Supabase connection:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BOOKINGS_TABLE` (optional, default `bookings`)
- `SUPABASE_CLIENTS_TABLE` (optional, default `clients`)

Create the client table once in Supabase:

```sql
create table if not exists clients (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz default now()
);
```

The internal panel contains: bookings, clients, barbers, schedule, services/prices, cancellations and statistics. It is intentionally not added to the public navigation.
