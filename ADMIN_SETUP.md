# Crown & Blade — internal admin panel

The admin panel is intentionally not linked from the public website.

Open directly:
`/admin.html`

Set these Vercel environment variables:

- `ADMIN_PASSWORD` — administrator password.
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BOOKINGS_TABLE` — optional, defaults to `bookings`.
- `SUPABASE_CLIENTS_TABLE` — optional, defaults to `clients`.

The client table can be created with:

```sql
create table if not exists clients (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz default now()
);
```

The public mobile menu is unchanged and contains no admin link.
