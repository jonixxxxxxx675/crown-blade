# Реальні push-сповіщення

Ця версія використовує Web Push + Vercel API + Supabase.

## 1. Supabase

Створи таблицю:

```sql
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  account_id text,
  email text,
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_account_id_idx
  on public.push_subscriptions(account_id);

create index if not exists push_subscriptions_email_idx
  on public.push_subscriptions(email);
```

## 2. Vercel Environment Variables

Додай:

```text
SUPABASE_PUSH_TABLE=push_subscriptions
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:YOUR-REAL-EMAIL@example.com
```

І залишити наявні `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BOOKINGS_TABLE` та `CRON_SECRET`.

## 3. Генерація VAPID-ключів

Якщо не хочеш використовувати ключі з готового налаштування, згенеруй нову пару командою:

```bash
npx web-push generate-vapid-keys
```

Приватний ключ не додавай у GitHub або ZIP. Зберігай його тільки у Vercel Environment Variables.

## 4. Важливо

Push API працює на Vercel/HTTPS. GitHub Pages сам по собі не запускає `/api/*.js`.

Після деплою:

1. Відкрити сайт на Vercel.
2. Увійти в акаунт.
3. Відкрити «Нагадування».
4. Натиснути «УВІМКНУТИ НАГАДУВАННЯ В ЗАСТОСУНКУ →».
5. Дозволити сповіщення.
6. Підписка збережеться в `push_subscriptions`.
7. Vercel Cron перевірятиме бронювання кожні 15 хвилин і відправлятиме push за 24 та 2 години до запису.

Старі локальні `setTimeout`-нагадування прибрані, щоб не було дублювання push.
