import type { BusLocationPayload, SimulatorStatePayload, TripStatusPayload } from '@starline/shared';

/**
 * Internal domain events (in-process event bus). Modules communicate through
 * these instead of importing each other — e.g. the realtime gateway
 * subscribes to GPS events without the GPS service knowing about sockets.
 */
export const EVENTS = {
  BUS_LOCATION_UPDATED: 'bus.location.updated',
  TRIP_STATUS_CHANGED: 'trip.status.changed',
  SIMULATOR_STATE: 'simulator.state',
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  SEAT_HELD: 'seat.held',
  SEAT_RELEASED: 'seat.released',
  DRIVER_ASSIGNED: 'trip.driver.assigned',
  BUS_ASSIGNED: 'trip.bus.assigned',
  ROUTE_UPDATED: 'route.updated',
} as const;

export type BusLocationEvent = BusLocationPayload;
export type TripStatusEvent = TripStatusPayload;
export type SimulatorStateEvent = SimulatorStatePayload;
