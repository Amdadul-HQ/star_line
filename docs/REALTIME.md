# Realtime

Socket.IO on the API server, namespace **`/realtime`**. Event names and
payload types are shared in `packages/shared/src/realtime.ts` — the web app
and the gateway import the same constants.

## Flow

```
Driver app / Simulator
        │  POST /gps/location (validated, authorized)
        ▼
GpsService.processFix ── validate → upsert BusLocation → async history insert
        │  EventEmitter: bus.location.updated
        ▼
GpsGateway ── emits SOCKET bus:location to rooms:
        ├── admin:live-map          (staff with GPS_VIEW)
        └── trip:<tripId>           (booked passengers + crew)
```

Trip status changes (`trip:status`) and simulator state (`simulator:state`)
follow the same event-bus → room fan-out path. **No event is broadcast
globally** — passengers tracking one trip only receive that trip's room.

## Authentication & authorization

- Clients connect with the same JWT access token used for REST
  (`handshake.auth.token`). Invalid/missing token → immediate disconnect.
- Room joins are explicit messages (`trip:join`, `adminMap:join`) and are
  authorization-checked server-side **every time** (permission, crew
  membership, or booking lookup). Ack `{ ok, error? }` tells the client.

## Reconnection

- socket.io client auto-reconnects with backoff (1 s → 10 s).
- The token is provided through a callback, so a refreshed token is used on
  the next reconnect automatically.
- Components register their `join` on the socket's `connect` event — which
  also fires on every reconnect — so rooms are re-joined with zero
  server-side session state.

## Staleness & liveness

- Every location payload carries `recordedAt` (validated: not too old, not in
  the future, monotonic per bus — duplicates/out-of-order fixes are dropped).
- UIs re-render a ticker and show "Updated Xs ago"; past 60 s
  (`GPS_STALE_AFTER_SECONDS`) the marker greys out and text switches to
  "Location unavailable".
- Server-side sweep (every 60 s): buses `IN_TRIP` with no fix for
  `GPS_OFFLINE_AFTER_SECONDS` (default 300) are flagged `OFFLINE`.

## Initial state vs deltas

Dashboards load a REST snapshot first (`GET /gps/latest`, `GET
/passenger/trips/:id/track`) then apply socket deltas, keeping whichever
timestamp is fresher — no flash of stale data, no missed updates.

## Scaling note

Single-instance today. For horizontal scale, add the socket.io Redis adapter
and move the RBAC/trip-meta caches to Redis; the room strategy is already
adapter-compatible.
