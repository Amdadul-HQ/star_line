Now start implementation.

Do not build the whole system at once.

Start with PHASE 1 only.

Deliver:

1. Monorepo structure
2. Frontend application
3. Backend application
4. PostgreSQL database
5. Prisma schema
6. Authentication architecture
7. RBAC architecture
8. i18n architecture
9. Design system
10. Shared types
11. API structure
12. Admin layout
13. Passenger layout
14. Responsive navigation
15. Seed data structure
16. Docker development setup

Before coding each major module:

- define types
- define database model
- define API contract
- define service
- define UI

Do not use placeholder architecture that will need to be rewritten later.

After Phase 1 is completed, stop and provide:

- files created
- architecture decisions
- database models
- API endpoints
- remaining tasks
- known limitations

Then continue to Phase 2 only.


Implement the real-time GPS subsystem now.

Requirements:

1. Driver can start a trip.
2. Driver can start GPS sharing.
3. Browser/mobile geolocation must be abstracted behind GPSProvider.
4. GPS coordinates:
   latitude
   longitude
   speed
   heading
   accuracy
   timestamp

5. Send location updates periodically.
6. Validate GPS coordinates server-side.
7. Store latest bus location separately for fast reads.
8. Store historical locations asynchronously.
9. Broadcast updates using WebSocket.
10. Create trip-specific WebSocket rooms.
11. Admin live map receives updates instantly.
12. Passenger tracking receives only authorized trip updates.
13. Handle reconnect.
14. Handle stale GPS.
15. Handle GPS permission denied.
16. Handle poor network.
17. Add GPS simulator.

GPS simulator must allow:

- selecting bus
- selecting route
- starting simulation
- changing speed
- pausing
- resuming
- ending simulation

Example:

Bus:
SL-101

Route:
Dhaka → Feni

Simulation should move the bus along route geometry.

Do not fake real-time behavior only in frontend.

The realtime state must originate from backend/WebSocket flow.