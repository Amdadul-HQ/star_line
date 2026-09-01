import type { BusStatus, GpsSessionStatus, TripStatus } from './enums';

/** Socket.IO namespace served by the API realtime gateway. */
export const REALTIME_NAMESPACE = '/realtime';

/** Room naming — passengers join a single trip room; ops join the fleet map. */
export const tripRoom = (tripId: string) => `trip:${tripId}`;
export const ADMIN_MAP_ROOM = 'admin:live-map';

export const SOCKET_EVENTS = {
  // client -> server
  JOIN_TRIP: 'trip:join',
  LEAVE_TRIP: 'trip:leave',
  JOIN_ADMIN_MAP: 'adminMap:join',
  LEAVE_ADMIN_MAP: 'adminMap:leave',
  // server -> client
  BUS_LOCATION: 'bus:location',
  TRIP_STATUS: 'trip:status',
  SIMULATOR_STATE: 'simulator:state',
  APP_ERROR: 'app:error',
} as const;

export interface BusLocationPayload {
  busId: string;
  busNumber: string;
  tripId: string | null;
  routeName: string | null;
  lat: number;
  lng: number;
  speedKph: number | null;
  heading: number | null;
  accuracy: number | null;
  /** ISO timestamp the fix was recorded at (device time, validated server-side). */
  recordedAt: string;
  source: string;
}

export interface TripStatusPayload {
  tripId: string;
  status: TripStatus;
  busId: string | null;
  busStatus?: BusStatus;
  at: string;
}

export interface SimulatorStatePayload {
  simulationId: string;
  tripId: string;
  busId: string;
  busNumber: string;
  routeName: string;
  status: GpsSessionStatus;
  speedKph: number;
  progressPct: number;
}

export interface JoinTripAck {
  ok: boolean;
  error?: string;
}
