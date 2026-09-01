# Deployment Notes

Phase 1 targets local development; this records the intended production path.

## Build & run

```bash
pnpm install
pnpm build                     # packages → api (dist/) → web (.next/)
# api
cd apps/api && npx prisma migrate deploy && node dist/main.js
# web
cd apps/web && pnpm start      # or deploy .next to your Node host
```

## Environment

- `apps/api/.env` — set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`,
  production `DATABASE_URL`, `CORS_ORIGIN` = the web origin,
  `NODE_ENV=production` (disables the OTP `devCode` echo).
- `apps/web` — `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` are **inlined at
  build time**; rebuild the web app when they change.
- Local dev note: the API port defaults to **4777** (4000/4010 were occupied
  on the original dev machine — change `PORT` + the web env if you prefer).

## Production checklist (before going live)

- [ ] Real SMS gateway implementing `OtpProvider` (swap `OTP_PROVIDER`); remove `OTP_SANDBOX_CODE`.
- [ ] Payments: `PAYMENT_PROVIDER=sslcommerz` with live store credentials and
      `SSLCOMMERZ_SANDBOX=false`; set `API_BASE_URL`/`WEB_BASE_URL` to public
      HTTPS origins (gateway callbacks depend on them). The sandbox gateway
      auto-disables (404) whenever a real provider is active.
- [ ] TLS termination (reverse proxy) for HTTP + WebSocket upgrade (`/realtime`).
- [ ] Postgres with backups/PITR; run `prisma migrate deploy` in CI, never `migrate dev`.
- [ ] Socket.IO Redis adapter + Redis caches when running >1 API instance.
- [ ] Move refresh tokens to httpOnly cookies (web currently stores tokens in
      localStorage — acceptable for dev, XSS-exposed for prod).
- [ ] Structured log shipper + error monitoring (Sentry or similar) and
      dashboards on `/health`, `/readiness`.
- [ ] Rate-limit review (global 300/min; OTP 5/min) against real traffic.
- [ ] GPS history retention job (partition or prune `GpsLocationHistory`).
- [ ] Seed only roles/permissions/settings in prod — never demo data
      (`prisma/seed.ts` is a dev tool; it wipes tables).

## Docker

`docker-compose.yml` currently ships the dev database (+ optional adminer
behind `--profile tools`). Containerizing api/web is straightforward
(node:22-alpine, `pnpm fetch`-based Dockerfiles) and planned alongside CI in a
later phase.
