# Mobile booking database

Bookings created by the mobile Confirm Booking button are stored in browser localStorage under `crown_blade_mobile_bookings`.

Each record contains: `id`, `service`, `serviceKey`, `price`, `barber`, `date`, `time`, `language`, and `createdAt`.

This is a client-side staging database. The booking object is isolated in one function so it can later be sent to a real API/database without rebuilding the booking form.
