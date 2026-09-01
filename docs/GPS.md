# GPS Subsystem

## Sources

All three sources feed one pipeline (`GpsService.processFix`):

1. **Driver app** (built) — the `/driver` portal wraps browser geolocation
   behind the `GpsProvider` interface (`apps/web/lib/gps-provider.ts`). A
   native app or dedicated tracker later implements the same interface / the
   same REST contract. Fixes are throttled to one POST per 5 s.
2. **Simulator** (built) — server-side route playback for development.
3. **Hardware devices** (future) — will authenticate as device principals and
   POST the same payload.

## Driver flow

```
START TRIP  → POST /gps/trips/:id/start   trip → DEPARTED, GpsSession ACTIVE
(fixes)     → POST /gps/location          first fix promotes → IN_TRANSIT
PAUSE GPS   → POST /gps/trips/:id/pause   session PAUSED (client stops sending)
RESUME GPS  → POST /gps/trips/:id/resume
END TRIP    → POST /gps/trips/:id/end     session ENDED, trip COMPLETED, bus IDLE
```

Crew-only (assigned driver/supervisor), `GPS_SHARE` permission required.
Client handles: permission denied, unsupported devices, network failures
(banner + automatic retry), and resumes state after reload from the trip's
persisted `GpsSession`.

## Server-side validation (every fix)

- zod ranges: lat ∈ [−90, 90], lng ∈ [−180, 180], speed ≤ 200 km/h, heading ≤ 360
- timestamp: rejected if older than `GPS_MAX_FIX_AGE_SECONDS` (120) or > 30 s in the future
- (0, 0) "null island" rejected
- trip must be BOARDING/DEPARTED/IN_TRANSIT (`TRIP_NOT_ACTIVE` otherwise)
- monotonicity per bus: duplicate/out-of-order fixes silently dropped

Accepted fixes: upsert `BusLocation` (hot row, PK = busId) → async insert to
`GpsLocationHistory` (off the request path) → broadcast (see REALTIME.md).

## Simulator

`POST /gps/simulator/start` with `{ tripId }` **or** `{ busId, routeId }`
(+ speed 15–120 km/h, interval 1–15 s). With bus+route it reuses today's
pending trip for that pair or creates a dev trip on the fly.

Each tick advances distance = speed × Δt (±10 % jitter) along the route-stop
polyline (`pointAlongPath`), producing lat/lng/heading/speed, and pushes it
through `GpsService.ingestSystem` — the same validation/store/broadcast as a
real device. Reaching the end: final fix → trip ARRIVED → COMPLETED → session
ENDED → bus IDLE.

Controls: pause / resume / speed change / stop; state streams to the admin
room as `simulator:state`. Simulations are in-memory (dev tool) — an API
restart ends them; the offline sweep then flags the abandoned bus.

Requires `SIMULATOR_MANAGE` (SUPER_ADMIN/ADMIN/OPERATIONS_MANAGER by default).

## ETA (v1)

`EtaService`: project the fix onto the stop polyline → remaining km →
divide by current speed (fallback 45 km/h when crawling) → minutes; also
yields progress % and next stop. Deliberately provider-shaped so a
traffic-aware engine (Google/Mapbox) can replace the math without touching
callers. Route deviation groundwork: `distanceFromPathKm()` exists in shared
geo for the ON_ROUTE/DEVIATED check planned in a later phase.
