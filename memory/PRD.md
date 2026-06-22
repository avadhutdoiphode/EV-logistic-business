# VoltGo — Porter-style EV Logistics Platform

A multi-role mobile platform that lets customers book electric vehicles for on-demand parcel and cargo delivery, drivers accept rides and track earnings, and operations admins manage the fleet.

## Tech Stack (adapted for the Emergent runtime)

| Layer | Original spec | Implementation in this environment |
| --- | --- | --- |
| Mobile | Flutter (iOS + Android) | **Expo / React Native** (single codebase, role-based navigation) |
| Admin Panel | Angular Web | Built **inside the same Expo app** as an admin tab group (works on mobile + web preview) |
| Backend | Java Spring Boot | **Python FastAPI** |
| Database | MySQL | **MongoDB** (Motor async driver) |
| Auth | Firebase OTP + Google | Mocked phone OTP (any 4-digit code; demo `1234`) — production swap is one HTTP call away |
| Payments | Razorpay | **Mocked** initiate/verify endpoints (drop in real keys to go live) |
| Maps | Google Maps | Stylized map canvas (drop-in Google Maps replacement when key is provided) |

## Modules

### Customer
- Splash + role selector
- Phone OTP login (Google sign-in stub)
- Map-first home screen with quick-book tiles & promo card
- Booking flow: pickup, **multiple drops** (up to 3), vehicle selection, fare estimate, payment method
- Live tracking screen with animated driver marker, status timeline, cancel flow
- Booking history with status filter chips
- Account screen with CO₂ saved, wallet, saved places

### Driver
- Online/offline toggle (the lime accent kicks in when online)
- Active job card with route, customer, and "Mark next status" button
- Available jobs feed (auto-refreshes every 8s)
- Earnings dashboard: weekly bar chart, payout card, performance stats
- Profile with verified-driver badge and vehicle plate

### Admin
- Overview dashboard with KPIs and 7-day revenue chart
- Drivers directory (search, online/offline pill, ratings)
- Bookings management with status chip filters
- Customers directory

## API Surface (`/api/...`)

Auth: `POST /auth/send-otp`, `POST /auth/verify-otp`, `GET /auth/me`
Vehicles & fare: `GET /vehicles`, `POST /fare/estimate`
Bookings: `POST /bookings`, `GET /bookings/my`, `GET /bookings/{id}`, `PATCH /bookings/{id}/status`
Driver: `POST /driver/online`, `POST /driver/location`, `GET /driver/available-jobs`, `POST /driver/accept/{id}`, `GET /driver/earnings`
Admin: `GET /admin/stats`, `GET /admin/drivers`, `GET /admin/customers`, `GET /admin/bookings`
Payments (mock): `POST /payments/initiate`, `POST /payments/verify`

## Seed Data

On startup the backend ensures:
- 4 EV vehicle classes (Scooter / Auto Cargo / Mini Truck / Tata Ace)
- 5 driver profiles with vehicle numbers and ratings
- 1 demo customer, 1 admin
- 3 historical bookings (so revenue & history aren't empty)

## Credentials

See `/app/memory/test_credentials.md`.

## Production swap-ins

1. **Firebase OTP** → replace the mock in `POST /auth/send-otp` with Firebase Admin verifyIdToken; the verify endpoint already exchanges OTP for a JWT.
2. **Razorpay** → put real `key_id`/`key_secret` in env, return real order from `/payments/initiate`, and verify HMAC in `/payments/verify`.
3. **Google Maps** → swap `src/components/MapView.tsx` for `react-native-maps` (`PROVIDER_GOOGLE`); markers/route props already match.
4. **Push notifications** → wire Expo push tokens on login and notify drivers on new bookings.
