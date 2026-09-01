# API Reference

Base URL (dev): `http://localhost:4777` · Live interactive docs: **`/docs`** (Swagger).

Envelope: success → `{ "success": true, "data": … }`; failure →
`{ "success": false, "error": { "code", "message", "details?" } }`. The web
app translates `error.code` (en/bn) — codes are the contract, messages are
diagnostics.

Auth: `Authorization: Bearer <accessToken>`. Access tokens last 15 min;
rotate with `POST /auth/refresh`.

## Endpoints

### Auth
| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/staff/login` | public (throttled) |
| POST | `/auth/passenger/otp/request` | public (5/min) |
| POST | `/auth/passenger/otp/verify` | public |
| POST | `/auth/refresh` · `/auth/logout` | public |
| GET | `/auth/me` | authenticated |

### Public
| GET | `/public/routes` | landing-page routes |
| GET | `/settings/general` | branding/contact |
| GET | `/health` · `/liveness` · `/readiness` | probes |

### Fleet & operations (permission in parentheses)
| GET | `/fleet/overview` | (FLEET_VIEW) dashboard counters |
| GET/POST | `/branches` (+`/options`, PATCH `/:id`) | (BRANCH_*) |
| GET/POST | `/buses` (+`/options`, `/:id` profile, PATCH, DELETE) | (BUS_*) |
| GET/POST | `/routes` (+`/options`, `/:id`, PATCH, DELETE) | (ROUTE_*) |
| GET/POST | `/schedules` (PATCH `/:id`) | (SCHEDULE_*) |
| GET/POST | `/trips` | (TRIP_VIEW / TRIP_CREATE) |
| GET | `/trips/mine/today` | crew — own assignments |
| PATCH | `/trips/:id/assign` | (TRIP_ASSIGN) — conflict-checked |
| PATCH | `/trips/:id/status` | crew or TRIP_EDIT — lifecycle-checked |

### GPS
| POST | `/gps/trips/:id/start|pause|resume|end` | crew (GPS_SHARE) |
| POST | `/gps/location` | crew (GPS_SHARE), high-frequency |
| GET | `/gps/latest` | (GPS_VIEW) fleet snapshot |
| GET | `/gps/trips/:id/latest` | GPS_VIEW, crew, or booked passenger |
| GET/POST | `/gps/simulator` (+`/start`, `/:id/pause|resume|stop`, PATCH `/:id`) | (SIMULATOR_MANAGE) |

### Booking & payments
| GET | `/public/trips/search?from=&to=&date=` | public trip search with live availability |
| GET | `/public/trips/:id/seats` | public seat map (layout + per-seat state) |
| POST | `/bookings` | authenticated — atomic seat reservation (PENDING + pending payment) |
| POST | `/bookings/:id/pay` | start/retry checkout → `{ redirectUrl }` |
| GET | `/bookings/code/:code` | owner (or BOOKING_VIEW) booking lookup |
| GET | `/payments/sandbox/checkout/:code` | dev gateway page (404 when a real provider is active) |
| POST | `/payments/sslcommerz/success|fail|cancel` | gateway callbacks (success is server-validated) |

Booking safety: seats are reserved by `BookingSeat` rows inside the create
transaction — the DB unique `(tripId, seatNumber)` makes double-booking
impossible. Fail/cancel callbacks and a 60 s sweep release seats from unpaid
(PENDING) bookings after `BOOKING_PENDING_EXPIRE_MINUTES` (default 15).

### People & platform
| GET | `/users` | (USER_VIEW or PASSENGER_VIEW; branch-scoped roles auto-filtered) |
| POST | `/users/staff` | (USER_MANAGE) |
| GET | `/users/options?role=` | assignment dropdowns |
| PATCH | `/users/me` | self profile |
| GET | `/passenger/me/overview` · `/passenger/me/bookings` | own data |
| GET | `/passenger/trips/:id/track` | booked passengers only |
| GET | `/roles` · `/roles/permissions` | (ROLE_VIEW) |
| GET | `/audit` | (AUDIT_VIEW) |
| PUT | `/settings/general` | (SETTINGS_MANAGE) |

### WebSocket (`/realtime` namespace)
Client → server: `trip:join {tripId}` · `trip:leave` · `adminMap:join` · `adminMap:leave` (ack `{ok, error?}`)
Server → client: `bus:location` · `trip:status` · `simulator:state` — payload types in `@starline/shared`.

List endpoints paginate: `?page=&pageSize=` → `{ items, page, pageSize, total, totalPages }`.
