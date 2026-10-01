# Crown & Blade — mobile final fixes

Desktop version is not modified by the mobile CSS/JS changes.

Mobile changes:
- Removed Maxim review on mobile.
- Hid desktop-only Hero overlays that could appear as stray blocks on mobile.
- Restored month/year picker opening.
- Added required phone number to account registration.
- Added account verification flow through `/api/verify`.
- Back is the primary 3D action; Logout is secondary.
- Booking confirmation can be emailed through `/api/notify-booking`.

For real verification/email delivery configure:
- RESEND_API_KEY
- RESEND_FROM
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM

If Twilio is not configured, email verification is used when Resend is configured.
