# Star Line — Bus Transportation Management Platform

A production-grade transport operations platform for **Star Line** (Bangladesh): passenger booking & live tracking, fleet + branch operations, RBAC-secured admin, and a real-time GPS subsystem — bilingual (English / বাংলা) from day one.

**Status: Phase 1 + Real-time GPS subsystem complete.** Booking flows (search → seat selection → payment) arrive in Phase 2; their data models are already in the schema.

## Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query, Zustand |
| API | NestJS 10, TypeScript, Socket.IO, zod validation |
| Database | PostgreSQL 16, Prisma ORM |
| Realtime | Socket.IO (`/realtime` namespace, room-per-trip strategy) |
| Maps | Leaflet + OpenStreetMap behind a provider-neutral `MapView` abstraction |
| Monorepo | pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`, `packages/i18n` |

## Quick start

Prereqs: Node ≥ 20, pnpm ≥ 9, Docker.

```bash
pnpm install          # install all workspaces
pnpm db:up            # start PostgreSQL (docker, port 5433)
pnpm db:migrate       # apply migrations (auto-seeds on first run)
pnpm db:seed          # (re)seed demo data — idempotent
pnpm dev              # builds shared packages, runs API :4777 + web :3000
```

- Web: http://localhost:3000 · API: http://localhost:4777 · Swagger: http://localhost:4777/docs
- DB browser (optional): `docker compose --profile tools up -d` → http://localhost:8081

## Demo accounts

Password for all staff: **StarLine123!**

| Role | Login |
| --- | --- |
| Super Admin | `super@starline.local` |
| Admin | `admin@starline.local` |
| Operations Manager | `ops@starline.local` |
| Branch Manager (Dhaka) | `branch@starline.local` |
| Ticketer (Dhaka) | `ticket@starline.local` |
| Driver | `driver@starline.local` |
| Supervisor | `supervisor@starline.local` |
| Helper | `helper@starline.local` |
| Passenger | phone `+8801711111111`, sandbox OTP **123456** |

The demo passenger holds a booking on today's **Dhaka → Feni 08:30** trip — the same trip assigned to the demo driver, so one account pair exercises the whole GPS flow end-to-end.

## Try the live GPS in 60 seconds

1. Sign in as `admin@starline.local` → **GPS Simulator**.
2. Pick bus **SL-101**, route **Dhaka → Feni**, start the simulation.
3. Open **Live Map** — the bus moves along the route in real time.
4. In another browser/profile, sign in as passenger `+8801711111111` (OTP `123456`) → **Track Bus** → the same movement streams in with ETA + progress.
5. Alternatively sign in as `driver@starline.local` on a phone-sized window and press **START TRIP** to share real browser GPS.

The simulator pushes fixes through the *same* backend pipeline as a real device (validation → latest-location store → async history → WebSocket rooms) — nothing is faked in the frontend.

## Repository layout

```
apps/
  web/        Next.js app (public site + passenger/admin/branch/ticketing/crew portals)
  api/        NestJS REST API + Socket.IO realtime gateway + Prisma schema/seed
packages/
  shared/     Types, zod schemas, RBAC catalogue, socket events, geo/seat-layout engines
  i18n/       en/bn dictionaries + translation helpers
docs/         Architecture, database, RBAC, realtime, GPS, deployment
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design & module map
- [docs/DATABASE.md](docs/DATABASE.md) — ERD & indexing strategy
- [docs/RBAC.md](docs/RBAC.md) — roles, permissions, branch scoping
- [docs/REALTIME.md](docs/REALTIME.md) — WebSocket rooms, reconnect, stale handling
- [docs/GPS.md](docs/GPS.md) — GPS pipeline, simulator, ETA
- [docs/API.md](docs/API.md) — endpoint reference (also live at `/docs` Swagger)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production notes

## Useful commands

```bash
pnpm db:reset       # drop + re-migrate + re-seed
pnpm build          # production build of everything
pnpm --filter @starline/api db:studio   # Prisma Studio
```
