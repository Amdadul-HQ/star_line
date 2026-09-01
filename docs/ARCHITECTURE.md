# Architecture

## System overview

```
                    ┌────────────────────────────────────────────┐
                    │                apps/web (Next.js)          │
                    │  public site · passenger · admin · branch  │
                    │  ticketing · driver · supervisor · helper  │
                    └───────────────┬────────────────┬───────────┘
                          REST (fetch + JWT)   WebSocket (socket.io)
                    ┌───────────────▼────────────────▼───────────┐
                    │               apps/api (NestJS)            │
                    │  Guards: Throttler → JwtAuth → Permissions │
                    │  Modules: auth users rbac branches buses   │
                    │  routes schedules trips fleet gps audit    │
                    │  passenger settings health                 │
                    │  GpsGateway (/realtime) ← EventEmitter bus │
                    └───────────────────┬────────────────────────┘
                                 Prisma ORM
                    ┌───────────────────▼────────────────────────┐
                    │            PostgreSQL 16 (docker)          │
                    └────────────────────────────────────────────┘
```

## Monorepo

- `packages/shared` — the **contract layer**: enums, DTO types, zod schemas, RBAC
  catalogue (permissions + default role grants), socket event names/payloads,
  geo math and the seat-layout engine. Both apps import it; there is no
  duplicated definition of anything across the stack.
- `packages/i18n` — en/bn dictionaries + `translate()`. UI text never lives in
  components.
- `apps/api` — NestJS. Each domain is a module; modules communicate through the
  in-process event bus (`@nestjs/event-emitter`), not direct imports (e.g. the
  GPS service emits `bus.location.updated`; the gateway subscribes).
- `apps/web` — Next.js App Router. Server state via TanStack Query, client
  session via a small zustand store, realtime via one shared socket.

## Key decisions (and why)

| Decision | Rationale |
| --- | --- |
| NestJS over plain Express | First-class DI, guards, gateways and module boundaries → the RBAC + WebSocket architecture stays maintainable as modules multiply (spec §46). |
| zod (not class-validator) everywhere | One schema per payload shared verbatim by API validation and web forms; no drift between frontend and backend validation. |
| Opaque rotated refresh tokens (hashed at rest) | Access JWTs stay short-lived (15 min); refresh reuse triggers whole-session revocation. |
| Permissions resolved per-request from DB (30 s cache) | Role/permission edits take effect within seconds without re-login; cache swaps to Redis when scaling horizontally. |
| `BookingSeat @@unique([tripId, seatNumber])` | The double-booking guarantee lives in the database, not in application code (spec §48). Phase 2's booking flow builds on it. |
| Fares as integer BDT | No floating-point money; ৳ has no fractional usage here. |
| Asia/Dhaka fixed offset (+06:00, no DST) helpers | Schedule times are wall-clock Dhaka, stored as UTC instants; date-only values use Postgres `date`. |
| Leaflet + OSM default map | No API key needed for dev; `MapView` props are provider-neutral so Google/Mapbox drop in behind the same interface (spec §37). |
| Simulator reuses the real GPS pipeline | Realtime behaviour originates from backend flow — the map is driven by the same validation → store → broadcast path a physical device will use. |
| Client route guards are UX-only | Every endpoint enforces authentication + permission + branch scope server-side; hiding pages is never the security boundary (spec §68). |
| Next 14 + React 18 (not 15/19 yet) | react-leaflet v4 peer range + strict-mode map issues; upgrade path documented in `next.config.mjs`. |

## Request lifecycle (REST)

1. `ThrottlerGuard` — global 300 req/min; tighter budgets on auth/OTP routes.
2. `JwtAuthGuard` — verifies bearer token, re-loads the user (status can change
   mid-session), resolves permissions for the role, attaches `RequestUser`.
3. `PermissionsGuard` — enforces `@RequirePermissions(...)` (any-of).
4. Controller — validates body/query with `ZodValidationPipe` against shared schemas.
5. Service — business rules (branch scoping, assignment conflicts, lifecycle
   transitions), Prisma access, `AuditService.log()` fire-and-forget.
6. `TransformInterceptor` — wraps result as `{ success: true, data }`.
   `AllExceptionsFilter` maps every error to `{ success: false, error: { code, message } }`;
   the web app translates `code` via i18n.

## Realtime lifecycle

See [REALTIME.md](REALTIME.md). Short version: domain services emit internal
events → `GpsGateway` fans out to socket.io **rooms** (`trip:<id>`,
`admin:live-map`) — never to all clients. Room joins are authorization-checked
server-side on every join (including rejoins after reconnect).

## Scaling path (documented, not yet needed)

- Socket.IO Redis adapter + Redis-backed permission/trip-meta caches → N API replicas.
- GPS history writes batched to a queue (BullMQ) once fix volume grows.
- `BusLocation` (1 row per bus) already separates hot reads from the
  append-only `GpsLocationHistory` trail.
- Cursor pagination is available in the shared pagination helpers when offset
  pagination stops being enough.
