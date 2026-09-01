# Database

PostgreSQL 16 · Prisma ORM · schema at `apps/api/prisma/schema.prisma`.

## ERD (logical)

```
Role ──< RolePermission >── Permission
 │
 └──< User ──┬── PassengerProfile (1:1)
             ├── StaffProfile     (1:1)
             ├──< RefreshToken
             ├──< Notification
             └──< AuditLog (as actor)

Branch ──< User (staff)        Branch ──< Bus        Branch ──< Trip (ticketing branch)
Branch ── manager → User

Route ──< RouteStop (ordered, lat/lng; optional ticket-counter config:
                     isCounter, counterPhone, counterAddress, note)
RouteStop ──< RouteStopStaff >── User   (counter staff assignments)
Route ──< Schedule ──< Trip
Route ──< Trip
Route.baseFareBdt = NON_AC fare · Route.acFareBdt = optional AC-class fare

Bus ──< Trip                Bus ── BusLocation (1:1 latest fix)
Bus ──< GpsSession          Bus ──< GpsLocationHistory

Trip ── driver/supervisor/helper → User
Trip ──< Booking ──< BookingSeat        Trip ──< SeatHold
Trip ──< GpsSession ──< GpsLocationHistory
Booking ── Payment (1:1)

SystemSetting (key/value JSON)      OtpCode (phone login codes)
```

## Integrity rules enforced by the schema

- `BookingSeat @@unique([tripId, seatNumber])` — a seat can be sold **once**
  per trip, guaranteed by the database. `tripId` is deliberately denormalized
  onto BookingSeat for exactly this constraint.
- `SeatHold @@unique([tripId, seatNumber])` + `expiresAt` — temporary holds
  (Phase 2 flow) can never overlap; expiry sweeps delete stale rows.
- `BusLocation.busId` is the **primary key** — the latest-position table can
  never grow beyond one row per bus; history goes to `GpsLocationHistory`.
- `RouteStop @@unique([routeId, order])` — stop ordering is unambiguous.
- Trip → crew relations are separate named FKs (`TripDriver`, `TripSupervisor`,
  `TripHelper`); overlap prevention is service-level (time-window logic).

## Index strategy

Matching the spec's hot paths:

- `Bus`: `status`, `branchId` (+ unique `busNumber`, `registrationNumber`)
- `Trip`: `(routeId, serviceDate)`, `(busId, departureAt)`,
  `(serviceDate, status)`, `(driverId, departureAt)`, `(supervisorId, departureAt)`, `status`
- `Booking`: `tripId`, `passengerId`, `status`, `createdAt`
- `GpsLocationHistory`: `(busId, recordedAt)`, `(tripId, recordedAt)` — replay/analytics
- `BusLocation`: `recordedAt` — staleness sweeps
- `AuditLog`: `(entity, entityId)`, `actorId`, `createdAt`
- `OtpCode`: `(phone, createdAt)` · `RefreshToken`: unique `tokenHash`, `userId`

## Conventions

- IDs: cuid strings. Money: integer BDT (`fareBdt`, `fareTotalBdt`).
- `Trip.serviceDate` is a Postgres `date` (UTC-midnight instants via
  `serviceDateValue()`); `departureAt` is a UTC timestamp derived from Dhaka
  wall-clock (`dhakaDateTime()`).
- `Bus.seatLayout` is JSON conforming to `SeatLayout` in `@starline/shared` —
  the dynamic seat engine renders any grid (2+2, 2+1, custom) without
  hardcoded configurations.

## Migrations & seed

```bash
pnpm db:migrate    # prisma migrate dev
pnpm db:seed       # deterministic demo data (re-runnable; wipes + reloads)
pnpm db:reset      # full drop + migrate + seed
```

Seed volumes: 10 branches, 30 buses, 10 routes (real BD coordinates), 50
schedules, 100 trips across −2…+2 days, ~140 users (all roles), 100
passengers, 100 bookings + payments. Demo passenger `+8801711111111` is booked
on the same today's Dhaka → Feni 08:30 trip that demo driver
`driver@starline.local` drives.
