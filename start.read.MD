You are a senior software architect, product designer, UX engineer, and full-stack engineer.

Build a production-ready, scalable, modular, multilingual Bus Transportation Management Platform for "Star Line".

This is NOT just a bus booking website.

It is a complete transport operation platform that manages:

- Passengers
- Ticketers / Booking Operators
- Branches
- Bus Drivers
- Bus Supervisors
- Bus Helpers
- Routes
- Trips
- Buses
- Fleet
- Live GPS tracking
- Seat availability
- Ticket booking
- Passenger management
- Branch operations
- Route operations
- Driver operations
- Bus operations
- Reports
- Notifications
- Admin management

The application must be highly dynamic.

Nothing important should be hardcoded.

Admins must be able to configure the system from the admin dashboard.

==================================================
1. PRODUCT VISION
==================================================

Create a modern digital transport ecosystem for Star Line where:

1. Passenger can search routes.
2. Passenger can see available buses.
3. Passenger can see real-time bus location.
4. Passenger can book seats.
5. Passenger can manage tickets.
6. Ticket operators can book/manage passenger tickets from branches.
7. Branch managers can manage their branch operations.
8. Drivers can see assigned trips and share GPS location.
9. Supervisors can manage trip-level operations.
10. Helpers can see their assigned bus/trip information.
11. Admin can manage the entire Bangladesh transportation network.
12. Admin can monitor all active buses on a live map.
13. Admin can see which bus belongs to which route.
14. Admin can see bus count per route.
15. Admin can monitor operational status in real time.
16. Admin can configure routes, branches, buses, staff, schedules, fares, seats and permissions dynamically.

The system must be designed so Star Line can expand to hundreds or thousands of buses later.

==================================================
2. BRANDING
==================================================

Brand:
Star Line

Use the existing Star Line visual identity as inspiration.

Current Star Line branding is strongly associated with:
- Red
- White
- Clean transportation visuals
- Star Line logo
- Luxury/intercity bus feeling
- Bangladesh transport ecosystem

Reference website:
https://starlinegroupbd.com

Do NOT simply copy the existing website.

Create a new modern SaaS-style transportation platform while maintaining Star Line brand recognition.

Design language:

- Modern
- Professional
- Trustworthy
- Clean
- Spacious
- Fast
- Premium
- Easy for non-technical users
- Bangladesh-friendly
- Mobile-first

Avoid:
- Overly complicated UI
- Excessive gradients
- Excessive animations
- Too much padding
- Tiny text
- Confusing dashboards
- Unnecessary cards everywhere

==================================================
3. LANGUAGE
==================================================

The entire application must support:

- English
- বাংলা

Add a global language switcher.

All user-facing content must support translation.

Do NOT hardcode UI text directly inside components.

Use a centralized i18n structure.

Example:

/i18n
  /en
  /bn

Every:
- button
- label
- error
- notification
- modal
- validation message
- table header
- dashboard title
- navigation item

must be translatable.

Language switching must happen without breaking page state.

==================================================
4. USER ROLES
==================================================

Create a proper RBAC system.

Roles:

1. SUPER_ADMIN
2. ADMIN
3. OPERATIONS_MANAGER
4. BRANCH_MANAGER
5. TICKETER
6. DRIVER
7. SUPERVISOR
8. HELPER
9. PASSENGER

Design the permission system so new roles and permissions can be added later.

Do NOT implement role checking only in frontend.

Authorization must be enforced on backend/API level.

Example permission groups:

BUS_VIEW
BUS_CREATE
BUS_EDIT
BUS_DELETE
BUS_ASSIGN

ROUTE_VIEW
ROUTE_CREATE
ROUTE_EDIT
ROUTE_DELETE

TRIP_VIEW
TRIP_CREATE
TRIP_EDIT
TRIP_ASSIGN

BOOKING_VIEW
BOOKING_CREATE
BOOKING_CANCEL

PASSENGER_VIEW
PASSENGER_EDIT

BRANCH_VIEW
BRANCH_CREATE
BRANCH_EDIT

REPORT_VIEW

GPS_VIEW
GPS_SHARE

==================================================
5. PUBLIC WEBSITE / PASSENGER HOME PAGE
==================================================

Build a modern Star Line public homepage.

Hero section should immediately communicate:

"Travel Smarter with Star Line"

Main booking/search component:

From
To
Journey Date
Return Date (optional)
Passenger Count
Search Buses

Primary CTA:

"Search Bus"

Secondary CTA:

"Track Your Bus"

Homepage sections:

1. Hero
2. Search Bus
3. Live Bus Tracking
4. Popular Routes
5. Why Travel With Star Line
6. Available Bus Services
7. Safety & Reliability
8. Mobile-friendly booking experience
9. Customer reviews/testimonials
10. FAQ
11. Contact
12. Footer

Show realistic Bangladesh destinations as dynamic data.

Example:

Dhaka
Feni
Chattogram
Cox's Bazar
Noakhali
Comilla
etc.

BUT:
Do not hardcode routes.

These must come dynamically from database.

==================================================
6. PASSENGER LOGIN
==================================================

Passenger authentication must use:

Phone Number + OTP

For development/testing:

Use sandbox OTP provider.

Create an abstraction:

OtpProvider

so production SMS provider can later be switched.

Example:

interface OtpProvider {
  sendOtp(phone)
  verifyOtp(phone, otp)
}

Do not couple authentication directly to one SMS provider.

Support:

+880 phone numbers

Authentication flow:

1. Enter phone number
2. Validate phone
3. Send OTP
4. Enter OTP
5. Verify OTP
6. Create/login passenger
7. Redirect to passenger dashboard

Add:

Resend OTP timer
OTP expiration
Too many attempts protection
Session handling
Logout
Device/session management if needed

==================================================
7. PASSENGER DASHBOARD
==================================================

Create a dedicated passenger dashboard.

Dashboard sections:

Overview
My Tickets
Upcoming Trips
Trip History
Track Bus
Favorite Routes
Notifications
Profile
Support

Dashboard overview should show:

Upcoming Trip
Bus Number
Route
Departure Time
Boarding Point
Seat Number
Booking Status
Live Tracking button

==================================================
8. BUS SEARCH & BOOKING
==================================================

Passenger can:

From
To
Date

Search available trips.

Search result should display:

Bus name
Bus number
Bus type
AC / Non-AC
Departure
Estimated arrival
Fare
Available seats
Amenities
Live tracking availability
Boarding points

Example:

Star Line Luxury
AC
Dhaka → Feni
08:30 AM
৳ 650
23 seats available

Then:

View Seats

==================================================
9. SEAT SELECTION
==================================================

Build a reusable dynamic seat layout engine.

Do NOT hardcode one seat configuration.

Bus configuration must define:

Rows
Columns
Seat numbers
Seat type
Blocked seat
Available seat
Booked seat
Reserved seat

Support different layouts:

2+2
2+1
custom layouts

Seat states:

AVAILABLE
HELD
BOOKED
BLOCKED
RESERVED

Use temporary seat hold.

Example:

Passenger selects seat.

Seat gets:

HELD

for X minutes.

If payment/booking does not complete:

release seat.

Prevent double booking using backend transaction / database locking strategy.

==================================================
10. TICKETING SYSTEM
==================================================

Support:

Passenger self-booking
Ticket operator booking

Ticketers work from branches.

Ticket operator dashboard:

Today's bookings
Upcoming departures
Available seats
Recent bookings
Cancel booking
Reschedule
Print ticket
Search passenger
Search booking

Booking information:

Booking ID
Passenger
Phone
Route
Trip
Bus
Seat
Fare
Boarding point
Destination
Booking time
Booked by
Payment status
Ticket status

Ticket statuses:

CONFIRMED
PENDING
CANCELLED
COMPLETED
NO_SHOW

==================================================
11. BRANCH MANAGEMENT
==================================================

Admin can create unlimited branches.

Branch fields:

Name
Code
Address
District
Division
Phone
Manager
Status

Examples:

Dhaka Branch
Feni Branch
Chattogram Branch

But do NOT hardcode these.

Branch managers should only see data belonging to their assigned branch unless permission allows otherwise.

==================================================
12. ROUTE MANAGEMENT
==================================================

Admin dashboard must provide route management.

Route fields:

Route Name
Origin
Destination
Stops
Distance
Estimated Duration
Base Fare
Status

Example:

Dhaka → Feni

Route stops could be:

Dhaka
Daudkandi
Comilla
Feni

Each route must support multiple buses and multiple schedules.

==================================================
13. TRIP MANAGEMENT
==================================================

A route is not the same as a trip.

Create separate concepts:

Route
Schedule
Trip
Bus

Example:

Route:
Dhaka → Feni

Schedule:
Every day 08:30 AM

Trip:
September 1, 2026
08:30 AM
Bus SL-101
Driver XYZ
Supervisor ABC

Admin should be able to assign:

Bus
Driver
Supervisor
Helper
Ticketing branch
Trip schedule

==================================================
14. BUS MANAGEMENT
==================================================

Admin can create buses dynamically.

Bus information:

Bus ID
Bus Number
Registration Number
Model
Brand
Type
AC / Non-AC
Seat Capacity
Seat Layout
Branch
Status

Bus status:

ACTIVE
IN_TRIP
IDLE
MAINTENANCE
INACTIVE
OFFLINE

Bus profile should show:

Current route
Current trip
Current driver
Supervisor
Helper
Current GPS position
Last GPS update
Mileage if available
Maintenance history

==================================================
15. LIVE GPS TRACKING
==================================================

This is one of the core features.

The platform must support real-time bus location.

Architecture:

Bus device/mobile app
        ↓
GPS coordinates
        ↓
Backend real-time gateway
        ↓
WebSocket
        ↓
Passenger/Admin dashboard

Each active bus sends:

latitude
longitude
speed
heading
accuracy
timestamp

Example:

{
  "busId": "SL-101",
  "lat": 23.4567,
  "lng": 90.1234,
  "speed": 48,
  "heading": 120,
  "timestamp": "..."
}

Use WebSocket architecture.

Preferred:

Socket.IO or equivalent real-time transport.

The architecture must support reconnecting clients.

Store latest bus location separately for fast access.

Historical location data can be stored for analytics.

==================================================
16. DRIVER GPS APP / DRIVER DASHBOARD
==================================================

Driver dashboard should be extremely simple.

Driver logs in.

Driver sees:

Today's Trip

Bus:
SL-101

Route:
Dhaka → Feni

Departure:
08:30 AM

Controls:

Start Trip
Pause GPS
Resume GPS
End Trip

GPS sharing:

STARTED
PAUSED
STOPPED

When trip is active:

Send location periodically.

Use browser/mobile geolocation abstraction so the system can later be connected to a native mobile application.

Do NOT assume browser GPS is production-perfect.

Create a GPS provider abstraction.

==================================================
17. PASSENGER LIVE BUS TRACKING
==================================================

Passenger should be able to press:

"Track My Bus"

Map opens.

Show:

Current bus location
Bus number
Route
Current location
Last updated time
Estimated arrival
Trip progress

Example:

🚌 SL-101

Dhaka → Feni

Current Location:
Comilla

ETA:
42 min

Last updated:
10 sec ago

Passenger must only see tracking information for buses/trips they are allowed to view.

==================================================
18. ADMIN LIVE TRANSPORT MAP
==================================================

Create a large live operations map.

This should be one of the most important admin dashboard screens.

Map should show ALL active buses.

Every bus marker should contain:

Bus number
Route
Driver
Speed
Status

Example:

SL-101
Dhaka → Feni
48 km/h
On Trip

SL-102
Feni → Dhaka
52 km/h
On Trip

Marker colors/status can represent:

Active
Stopped
Offline
Maintenance

Provide filters:

Route
Branch
Bus
Driver
Status
Trip
Date

==================================================
19. ADMIN FLEET OVERVIEW
==================================================

Admin dashboard must immediately show operational metrics.

Top summary:

Total Buses
Active Buses
On Trip
Idle Buses
Maintenance
Offline

Example:

Total Buses: 200
On Trip: 82
Idle: 53
Maintenance: 11
Offline: 54

These numbers must be dynamic.

==================================================
20. ROUTE OPERATIONS DASHBOARD
==================================================

Admin needs route-level overview.

Example:

Route              Active Buses   Total Trips   Passengers
Dhaka → Feni       14             32            980
Dhaka → Chattogram 18             41            1220
Feni → Dhaka       13             31            870

Admin must be able to click a route.

Then see:

All buses
Current trips
Upcoming trips
Live locations
Drivers
Supervisors
Passenger count
Revenue
Schedule

==================================================
21. BRANCH DASHBOARD
==================================================

Branch manager dashboard:

Today's departures
Today's bookings
Available seats
Tickets sold
Revenue
Active buses
Assigned staff

Branch manager can:

Manage bookings
Manage ticketers
View branch buses
View branch trips
View passengers
View reports

But cannot access other branch data unless permission grants access.

==================================================
22. TICKETER DASHBOARD
==================================================

The ticket operator interface must be optimized for speed.

Very simple UI.

Primary actions:

New Booking
Search Booking
Today's Trips
Passenger Search
Cancel Ticket
Print Ticket

Booking flow:

Select route
Select trip
Select seat
Enter passenger phone
Enter passenger name
Confirm booking

The ticket operator should be able to complete a booking within a few seconds.

==================================================
23. DRIVER DASHBOARD
==================================================

Driver screen must be mobile-first.

Show only relevant information.

Today's trip.

Bus
Route
Departure
Stops

Big actions:

START TRIP
PAUSE GPS
END TRIP

Driver should not see sensitive admin data.

==================================================
24. SUPERVISOR DASHBOARD
==================================================

Supervisor can manage operational trip activities.

Show:

Current trip
Passenger count
Bus
Driver
Helper
Stops
Next stop

Supervisor can:

Start trip
Confirm boarding
Update trip status
Report operational issue
Report emergency

==================================================
25. HELPER DASHBOARD
==================================================

Helper sees:

Assigned bus
Trip
Route
Departure
Supervisor
Driver

Simple interface.

==================================================
26. NOTIFICATIONS
==================================================

Build a centralized notification system.

Types:

Booking confirmation
Trip reminder
Bus departure reminder
Bus tracking started
Booking cancellation
Route change
Schedule change
Admin notification
Operational alert

Channels should be abstracted:

IN_APP
SMS
EMAIL
PUSH

Do not hardcode external provider.

==================================================
27. REAL-TIME EVENT SYSTEM
==================================================

Build event-driven architecture where useful.

Important events:

TRIP_STARTED
TRIP_ENDED
BUS_LOCATION_UPDATED
BOOKING_CREATED
BOOKING_CANCELLED
SEAT_HELD
SEAT_RELEASED
DRIVER_ASSIGNED
BUS_ASSIGNED
ROUTE_UPDATED

Use internal domain events / event bus abstraction.

Do not tightly couple modules together.

==================================================
28. ADMIN PANEL
==================================================

Build a powerful admin dashboard.

Sidebar:

Dashboard
Live Map
Routes
Trips
Buses
Fleet
Branches
Passengers
Bookings
Drivers
Supervisors
Helpers
Ticketers
Schedules
Fares
Reports
Notifications
Settings
Roles & Permissions
Audit Logs

Admin can manage everything dynamically.

==================================================
29. ADMIN DASHBOARD
==================================================

Admin dashboard layout:

Header:
Search
Notifications
Language
Profile

Main:

Fleet Overview
Live Buses
Active Trips
Today's Bookings
Today's Revenue
Passenger Count

Charts:

Bookings over time
Revenue over time
Trips per route
Bus utilization
Branch performance

Live map section

Recent trips

Operational alerts

==================================================
30. REPORTING
==================================================

Build reports.

Reports:

Daily booking report
Monthly booking report
Revenue report
Route performance
Bus utilization
Branch performance
Driver trip report
Cancelled booking report
Passenger report
Trip completion report

Filters:

Date range
Route
Branch
Bus
Driver

Export:

CSV
Excel
PDF

==================================================
31. AUDIT LOG
==================================================

Every important admin/operator action should be recorded.

Example:

Admin A
Changed bus SL-101 status
Previous:
ACTIVE

New:
MAINTENANCE

timestamp
IP/device metadata where appropriate

Audit log must be searchable.

==================================================
32. DATABASE DESIGN
==================================================

Use a relational database.

Prefer PostgreSQL.

Suggested entities:

User
Role
Permission
RolePermission

PassengerProfile

Branch

Bus
BusSeat
BusLocation

Route
RouteStop

Schedule
Trip

Driver
Supervisor
Helper
TicketAgent

Booking
BookingPassenger
BookingSeat

Payment

Notification

AuditLog

GpsSession
GpsLocationHistory

Do NOT prematurely denormalize everything.

Use proper indexes.

Important indexes:

Bus.registrationNumber
Bus.status

Trip.routeId
Trip.busId
Trip.date
Trip.status

Booking.tripId
Booking.passengerId
Booking.status

BusLocation.busId
BusLocation.timestamp

==================================================
33. MULTI-TENANCY / ORGANIZATIONAL STRUCTURE
==================================================

Architect the system so it can support:

Star Line organization
→ Branches
→ Routes
→ Buses
→ Trips
→ Staff

Admin can scope access.

Branch managers operate within their branch.

Global admins can operate across Bangladesh.

==================================================
34. SECURITY
==================================================

Implement:

JWT or secure session authentication
Refresh token strategy
RBAC
Permission checks
Rate limiting
OTP attempt limiting
Input validation
SQL injection protection
XSS protection
CSRF protection where applicable
Secure headers
Audit logging

Never trust frontend role information.

All sensitive authorization must happen server-side.

==================================================
35. API ARCHITECTURE
==================================================

Use modular REST APIs.

Suggested modules:

/auth
/users
/passengers
/branches
/buses
/routes
/trips
/schedules
/bookings
/payments
/gps
/notifications
/reports
/admin
/roles
/permissions
/audit

Realtime gateway:

/realtime

Keep API contracts strongly typed.

Generate OpenAPI/Swagger documentation.

==================================================
36. REALTIME ARCHITECTURE
==================================================

Separate:

REST API
Realtime Gateway
Database

Flow:

Driver
↓
GPS Provider
↓
Realtime API
↓
Location validation
↓
Latest location storage
↓
WebSocket broadcast
↓
Passenger/Admin UI

Do not broadcast every raw GPS event to every connected user.

Use room/channel strategy.

Example:

trip:123

route:45

admin:live-map

Passengers tracking one trip only subscribe to the relevant trip channel.

==================================================
37. MAP PROVIDER ABSTRACTION
==================================================

Do not hardcode map provider deeply into the application.

Create:

MapProvider interface

Possible implementations:

Google Maps
Mapbox
OpenStreetMap

This allows changing provider later.

Use a map-based UI optimized for Bangladesh.

==================================================
38. GPS SIMULATOR FOR DEVELOPMENT
==================================================

IMPORTANT:

Since real GPS hardware will not be available during development, create a GPS simulator.

Admin/developer mode should allow:

Select bus
Select route
Start simulation
Move bus along route

Example:

SL-101

Simulated route:

Dhaka
Daudkandi
Comilla
Feni

Bus marker should move every few seconds.

This allows testing:

Realtime map
Passenger tracking
Admin dashboard
WebSocket
ETA
Trip progress

Without physical GPS devices.

==================================================
39. ETA SYSTEM
==================================================

Create an ETA abstraction.

Initial version can calculate ETA using:

Current GPS position
Remaining route distance
Current speed
Estimated average speed

Later this can be upgraded to:

Google Maps
Mapbox
traffic APIs

Do not tightly couple ETA logic to one provider.

==================================================
40. DYNAMIC CMS-LIKE SETTINGS
==================================================

Admin can manage:

Company name
Logo
Phone
Email
Branches
Routes
Bus types
Amenities
Seat layouts
Fare
Booking rules
Cancellation policies
Notifications
Languages

Avoid hardcoded business rules.

==================================================
41. RESPONSIVE DESIGN
==================================================

Application must work perfectly on:

Desktop
Laptop
Tablet
Mobile

Passenger:

Mobile-first

Admin:

Desktop-first but responsive

Driver:

Mobile-first

Ticket operator:

Desktop/tablet optimized

==================================================
42. UX PRINCIPLES
==================================================

The interface should feel like a modern product.

Use:

Clear visual hierarchy
Simple navigation
Consistent spacing
Search
Filters
Pagination
Empty states
Loading states
Skeleton loaders
Error states
Confirmation dialogs
Toast notifications

Every screen must include:

Loading state
Empty state
Error state
Success state

Never leave users with blank screens.

==================================================
43. ACCESSIBILITY
==================================================

Support:

Keyboard navigation
ARIA labels
Good contrast
Readable typography
Focus state
Screen reader friendly forms

==================================================
44. COMPONENT ARCHITECTURE
==================================================

Use modular architecture.

Do not build huge components.

Example:

components/
  ui/
  forms/
  tables/
  maps/
  booking/
  buses/
  routes/
  trips/
  dashboard/
  navigation/
  notifications/

Each feature should have its own module.

Example:

modules/bus/
modules/route/
modules/trip/
modules/booking/
modules/gps/

==================================================
45. FRONTEND ARCHITECTURE
==================================================

Prefer:

Next.js
TypeScript
Tailwind CSS
shadcn/ui

Use:

React Query / TanStack Query
Zustand only where client state is actually needed

Do not unnecessarily put server data into Zustand.

Use server state management correctly.

==================================================
46. BACKEND ARCHITECTURE
==================================================

Prefer:

Node.js
TypeScript

Use either:

NestJS

or a highly modular Express architecture.

Prefer NestJS if it improves long-term maintainability.

Modules:

AuthModule
UserModule
PassengerModule
BranchModule
BusModule
RouteModule
TripModule
BookingModule
GpsModule
NotificationModule
ReportModule
AdminModule

==================================================
47. PAYMENT ARCHITECTURE
==================================================

Design payment abstraction.

Initial providers can be mock/sandbox.

Create:

PaymentProvider

Support future integration with:

bKash
Nagad
SSLCommerz
Card

Do not hardcode payment provider logic into BookingService.

==================================================
48. BOOKING TRANSACTION SAFETY
==================================================

This is critical.

Prevent:

Double booking
Race conditions
Expired seat hold

Booking flow should use:

transaction
seat lock / atomic operation
seat hold expiration
booking confirmation

Two users must NEVER successfully book the same seat.

==================================================
49. ADMIN SEARCH
==================================================

Global admin search should support:

Bus number
Booking ID
Passenger phone
Passenger name
Trip ID
Route

Show grouped search results.

==================================================
50. DASHBOARD PERFORMANCE
==================================================

Optimize for large datasets.

Assume:

500+ buses
thousands of trips
millions of bookings
large GPS history

Use:

Pagination
Cursor pagination where appropriate
Proper indexing
Caching
Debounced search
Lazy loading
Code splitting

Do not load huge datasets into frontend at once.

==================================================
51. CACHING
==================================================

Cache appropriate data:

Routes
Branches
Bus metadata
Schedules
Public configuration

Do NOT cache sensitive real-time availability incorrectly.

Seat availability must remain strongly consistent.

==================================================
52. OBSERVABILITY
==================================================

Add architecture for:

Structured logging
Error monitoring
Metrics
Health checks

Endpoints:

/health
/readiness
/liveness

Track:

API response time
WebSocket connections
GPS update latency
Booking failures
Database latency

==================================================
53. NOTIFICATION / ALERT SYSTEM
==================================================

Admin should receive alerts for:

Bus offline
GPS stopped
Trip delayed
Bus maintenance
Unexpected route deviation
Booking spike
Operational issue

Create configurable alert thresholds.

==================================================
54. ROUTE DEVIATION
==================================================

Future-ready architecture for detecting whether a bus has deviated from its planned route.

Do not fully implement complicated AI.

Initial implementation:

Compare GPS position against planned route geometry.

Status:

ON_ROUTE
DEVIATED
UNKNOWN

==================================================
55. DRIVER / BUS ASSIGNMENT
==================================================

Admin should be able to assign:

Bus
Driver
Supervisor
Helper

to a trip.

Prevent conflicts.

Example:

Driver cannot be assigned to two overlapping trips.

Bus cannot be assigned to two overlapping trips.

Supervisor cannot be assigned to overlapping trips.

Validate these rules server-side.

==================================================
56. TRIP STATUS
==================================================

Trip lifecycle:

DRAFT
SCHEDULED
BOARDING
DEPARTED
IN_TRANSIT
ARRIVED
COMPLETED
CANCELLED

Bus status should update intelligently based on trip lifecycle.

==================================================
57. PASSENGER TICKET
==================================================

After successful booking generate ticket.

Ticket contains:

Star Line branding
Passenger name
Phone
Booking ID
Route
Bus
Seat
Departure
Boarding point
Destination
QR code
Fare

QR code can later be scanned by staff.

==================================================
58. QR TICKET VERIFICATION
==================================================

Supervisor / Ticket operator can scan passenger QR ticket.

Result:

VALID
USED
CANCELLED
INVALID

Show ticket details.

==================================================
59. ADMIN SETTINGS
==================================================

Settings page should contain sections:

General
Branding
Language
Booking
Cancellation
Payment
OTP
Notifications
GPS
Map
Security
Roles
Permissions

==================================================
60. DEMO DATA
==================================================

Create realistic development seed data.

At minimum:

10 branches
30 buses
10 routes
50 schedules
100 trips
100 passengers
100 bookings
20 staff members

Include demo users for every role.

Example:

admin@starline.local
branch@starline.local
ticket@starline.local
driver@starline.local
supervisor@starline.local

Passenger should use phone OTP sandbox.

==================================================
61. DEVELOPMENT MODE
==================================================

Add a developer environment.

Features:

GPS simulator
Mock OTP
Mock payment
Demo data
WebSocket testing
Route simulation

Make it easy to run locally.

==================================================
62. SEEDING
==================================================

Provide:

database migration
database seed
development reset command

Example:

npm run db:migrate
npm run db:seed
npm run db:reset

Adjust commands according to chosen stack.

==================================================
63. TESTING
==================================================

Write tests for critical features.

Unit tests:

Authentication
RBAC
Booking
Seat availability
Fare calculation
Trip assignment
GPS validation

Integration tests:

Booking flow
Seat locking
OTP flow
Trip creation
Bus assignment

E2E:

Passenger booking
Ticket operator booking
Driver trip start
GPS update
Admin live tracking

==================================================
64. ERROR HANDLING
==================================================

Create standardized API errors.

Example:

{
  "success": false,
  "error": {
    "code": "SEAT_ALREADY_BOOKED",
    "message": "This seat is no longer available."
  }
}

Frontend should map errors to friendly translated messages.

==================================================
65. PROJECT STRUCTURE
==================================================

Use a clean modular folder structure.

Example:

apps/
  web/
  api/

packages/
  types/
  ui/
  config/
  i18n/

Or an equivalent clean monorepo architecture.

Use shared types between frontend and backend if appropriate.

==================================================
66. UI SCREENS TO BUILD
==================================================

PUBLIC:

/
 /routes
 /search
 /track
 /login
 /booking
 /ticket/[id]

PASSENGER:

/passenger
/passenger/tickets
/passenger/trips
/passenger/track
/passenger/profile
/passenger/notifications

ADMIN:

/admin
/admin/live-map
/admin/routes
/admin/trips
/admin/schedules
/admin/buses
/admin/branches
/admin/bookings
/admin/passengers
/admin/drivers
/admin/supervisors
/admin/helpers
/admin/ticketers
/admin/reports
/admin/settings
/admin/roles
/admin/audit-logs

BRANCH:

/branch
/branch/bookings
/branch/trips
/branch/buses
/branch/staff
/branch/reports

TICKETER:

/ticketing
/ticketing/new
/ticketing/search
/ticketing/today

DRIVER:

/driver

SUPERVISOR:

/supervisor

HELPER:

/helper

==================================================
67. IMPORTANT PRODUCT REQUIREMENT
==================================================

The system must be completely dynamic.

Never hardcode:

Routes
Buses
Branches
Drivers
Schedules
Fares
Seat numbers
Passengers
Permissions
Dashboard counts

Everything should originate from backend/database/configuration.

==================================================
68. SECURITY REQUIREMENT
==================================================

Never rely on frontend role hiding.

For example:

Hiding /admin/users from a ticketer is NOT enough.

Backend must reject unauthorized requests.

Every sensitive endpoint must verify:

Authentication
Authorization
Resource ownership / branch scope

==================================================
69. REAL-TIME REQUIREMENT
==================================================

The live tracking experience must feel real.

When driver updates GPS:

Admin map updates automatically.

Passenger tracking screen updates automatically.

Do NOT require page refresh.

The system should gracefully handle:

Disconnected driver
Weak network
GPS unavailable
WebSocket reconnect
Stale location
Duplicate events

Show:

"Updated 8 seconds ago"

and if stale:

"Location unavailable"

==================================================
70. FINAL UX GOAL
==================================================

The product should feel like a combination of:

Modern bus ticketing platform
+
Fleet management software
+
Live GPS tracking system
+
Branch operations platform
+
Transport ERP

It should be simple enough for a passenger to book a bus in under 1 minute.

It should be powerful enough for a transport operations manager to monitor hundreds of buses from one screen.

==================================================
71. IMPLEMENTATION STRATEGY
==================================================

Do NOT try to create everything as one giant implementation.

Work in phases.

PHASE 1:
Project setup
Design system
Authentication
RBAC
Database
Basic navigation

PHASE 2:
Passenger homepage
Search routes
Trip listing
Seat layout
Booking

PHASE 3:
Admin
Branches
Routes
Buses
Schedules
Trips

PHASE 4:
Driver
Supervisor
Helper
Ticket operator dashboards

PHASE 5:
Realtime GPS
WebSocket
Live map
GPS simulator

PHASE 6:
Notifications
Reports
Audit logs
QR tickets

PHASE 7:
Testing
Performance
Security
Production hardening

==================================================
72. FIRST TASK
==================================================

Before writing code:

1. Analyze the entire requirement.
2. Create architecture document.
3. Create database ERD.
4. Create module dependency map.
5. Create RBAC matrix.
6. Create API contract.
7. Create frontend route map.
8. Create real-time architecture.
9. Create development milestones.

Then start implementation.

Do not skip architecture.

==================================================
73. IMPORTANT CODING RULES
==================================================

Write clean production-quality TypeScript.

Use:

SOLID principles
Clean architecture where useful
DRY
Separation of concerns
Reusable services
Reusable components
Typed APIs
Validation
Error boundaries
Proper loading states

Avoid:

Huge components
Huge services
Circular dependencies
Business logic in UI
Hardcoded data
Duplicate logic
Magic numbers
Magic strings

==================================================
74. DOCUMENTATION
==================================================

Generate:

README.md
ARCHITECTURE.md
DATABASE.md
API.md
RBAC.md
REALTIME.md
GPS.md
DEPLOYMENT.md

Explain:

How the system works
How GPS works
How booking locking works
How roles work
How to seed data
How to run locally
How to configure OTP
How to configure maps
How to configure payment

==================================================
75. FINAL QUALITY BAR
==================================================

Do not create a basic CRUD demo.

Build this as a serious production-ready transportation platform.

Prioritize:

Reliability
Security
Scalability
Performance
Real-time accuracy
Good UX
Mobile responsiveness
Maintainability
Extensibility

The final application should look like a real commercial product that could be used by a major transportation company in Bangladesh.