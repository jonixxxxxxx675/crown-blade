# Crown & Blade — реальна email-відправка

Ця версія використовує Vercel Serverless Functions + Resend. API-ключі не знаходяться у frontend.

## 1. Vercel

У Vercel → Project → Settings → Environment Variables додати для **Production**:

- `RESEND_API_KEY` — API key з Resend.
- `AUTH_VERIFICATION_SECRET` — довгий випадковий секрет.
- `CONTACT_FROM` — відправник. Для production це має бути адреса з підтвердженого в Resend домену.
- `SITE_URL` — повна адреса сайту, наприклад `https://your-domain.com`.

Після зміни environment variables потрібен новий deployment.

## 2. Resend

Для production додайте й підтвердьте свій домен у Resend та використовуйте адресу цього домену в `CONTACT_FROM`.

Для первинного тесту можна використовувати `Crown & Blade <onboarding@resend.dev>`, якщо Resend дозволяє доставку на адресу одержувача у вашому поточному режимі.

## 3. Перевірка

Після deployment відкрийте:

`/api/account?health=1`

Очікувано:

- `ok: true`
- `emailConfigured: true`
- `verificationConfigured: true`

Потім створіть акаунт. Лист має прийти на введений email із кнопкою **ПІДТВЕРДИТИ EMAIL**.

Після натискання кнопки посилання веде назад на `/account.html?verified=1&email=...`, і локальний акаунт отримує статус **Email підтверджено ✓**.

На сторінці акаунта також є кнопка повторної відправки листа, якщо користувач не отримав повідомлення.
