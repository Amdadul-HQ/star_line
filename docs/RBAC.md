# RBAC

## Model

```
User → Role → RolePermission → Permission
```

- Roles and permissions live in the **database**; new roles can be added at
  runtime. The nine system roles are seeded with `isSystem: true`.
- The canonical permission catalogue is code-first in
  `packages/shared/src/rbac/permissions.ts`; the seed syncs it to the DB.
  Default grants per role live in `rbac/roles.ts` (`DEFAULT_ROLE_PERMISSIONS`).

## Enforcement (server-side, always)

1. `JwtAuthGuard` authenticates and resolves the caller's permission list from
   their role (30 s in-memory cache, invalidated on role edits).
2. `PermissionsGuard` enforces `@RequirePermissions(...)` — **any-of**
   semantics; most routes declare a single code.
3. Services add **row-level rules** the guard can't express:
   - Branch scoping: `BRANCH_MANAGER` and `TICKETER` queries are forced to
     their own `branchId` (users, buses, trips).
   - Ownership: passenger endpoints only ever return the caller's bookings;
     tracking requires an active booking on that exact trip
     (`TRACKING_NOT_ALLOWED` otherwise).
   - Crew rules: GPS start/pause/end and trip status changes require being the
     assigned driver/supervisor (or `TRIP_EDIT`).
4. The WebSocket gateway re-checks authorization **on every room join** —
   `admin:live-map` needs `GPS_VIEW`; `trip:<id>` needs GPS_VIEW, crew
   membership, or a booking.

Frontend route guards (`AuthGuard`) only handle redirects/UX. Hiding a page is
never the security boundary.

## Role → default grants (summary)

| Role | Highlights |
| --- | --- |
| SUPER_ADMIN | Everything, including `ROLE_MANAGE` |
| ADMIN | Everything except `ROLE_MANAGE` |
| OPERATIONS_MANAGER | Fleet/route/schedule/trip management, `TRIP_ASSIGN`, `GPS_VIEW`, `SIMULATOR_MANAGE` |
| BRANCH_MANAGER | Branch-scoped viewing + booking management, `GPS_VIEW` |
| TICKETER | Branch-scoped bookings (view/create/cancel), trips, passengers, `GPS_VIEW` |
| DRIVER | `TRIP_VIEW`, `GPS_SHARE` |
| SUPERVISOR | `TRIP_VIEW/EDIT`, `BOOKING_VIEW`, `GPS_VIEW/SHARE` |
| HELPER | `TRIP_VIEW` |
| PASSENGER | No admin permissions — ownership-based access only |

The full matrix is visible in-app: **Admin → Roles & Permissions** (reads the
live DB, not this file).

## Adding a permission

1. Add the code to `PERMISSIONS` + `PERMISSION_DEFINITIONS` in shared.
2. Grant it in `DEFAULT_ROLE_PERMISSIONS` where appropriate.
3. Re-run `pnpm db:seed` (dev) or write a data migration (prod).
4. Guard the new endpoint with `@RequirePermissions(PERMISSIONS.X)`.
