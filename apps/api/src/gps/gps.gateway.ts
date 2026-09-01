import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ADMIN_MAP_ROOM,
  PERMISSIONS,
  REALTIME_NAMESPACE,
  SOCKET_EVENTS,
  tripRoom,
  type BusLocationPayload,
  type JoinTripAck,
  type SimulatorStatePayload,
  type TripStatusPayload,
} from '@starline/shared';
import type { Namespace, Socket } from 'socket.io';
import { RbacService } from '../rbac/rbac.service';
import { EVENTS } from '../events/events';
import { GpsService } from './gps.service';

interface SocketData {
  userId: string;
  role: string;
  permissions: string[];
}

/**
 * Realtime gateway (/realtime namespace).
 *
 * Room strategy — no raw fan-out to every client:
 *   trip:<id>        passengers with a booking + trip crew
 *   admin:live-map   staff holding GPS_VIEW
 *
 * Clients authenticate with the same JWT access token used for REST
 * (handshake.auth.token). Reconnects simply re-join their rooms; the server
 * keeps no per-client state beyond socket.io's own room membership.
 */
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  cors: { origin: true, credentials: true },
})
export class GpsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GpsGateway.name);

  @WebSocketServer()
  server!: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly rbac: RbacService,
    private readonly gps: GpsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token: string | undefined =
        client.handshake.auth?.token ??
        (typeof client.handshake.headers.authorization === 'string'
          ? client.handshake.headers.authorization.replace(/^Bearer /, '')
          : undefined);
      if (!token) throw new Error('missing token');

      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      const data: SocketData = {
        userId: payload.sub,
        role: payload.role,
        permissions: await this.rbac.getPermissionsForRole(payload.role),
      };
      client.data = data;
    } catch {
      client.emit(SOCKET_EVENTS.APP_ERROR, { code: 'UNAUTHORIZED', message: 'Invalid token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // Rooms are cleaned up automatically by socket.io.
    void client;
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_ADMIN_MAP)
  async joinAdminMap(@ConnectedSocket() client: Socket): Promise<JoinTripAck> {
    const data = client.data as SocketData;
    if (!data?.permissions?.includes(PERMISSIONS.GPS_VIEW)) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    await client.join(ADMIN_MAP_ROOM);
    return { ok: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_ADMIN_MAP)
  async leaveAdminMap(@ConnectedSocket() client: Socket): Promise<JoinTripAck> {
    await client.leave(ADMIN_MAP_ROOM);
    return { ok: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_TRIP)
  async joinTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId?: string },
  ): Promise<JoinTripAck> {
    const data = client.data as SocketData;
    const tripId = body?.tripId;
    if (!data?.userId || !tripId) return { ok: false, error: 'VALIDATION_ERROR' };

    const allowed =
      data.permissions.includes(PERMISSIONS.GPS_VIEW) ||
      (await this.gps.isCrew(data.userId, tripId)) ||
      (await this.gps.isPassengerAllowed(data.userId, tripId));
    if (!allowed) return { ok: false, error: 'TRACKING_NOT_ALLOWED' };

    await client.join(tripRoom(tripId));
    return { ok: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_TRIP)
  async leaveTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId?: string },
  ): Promise<JoinTripAck> {
    if (body?.tripId) await client.leave(tripRoom(body.tripId));
    return { ok: true };
  }

  // ---------------------------------------------------- domain event fan-out

  @OnEvent(EVENTS.BUS_LOCATION_UPDATED)
  onBusLocation(payload: BusLocationPayload) {
    this.server.to(ADMIN_MAP_ROOM).emit(SOCKET_EVENTS.BUS_LOCATION, payload);
    if (payload.tripId) {
      this.server.to(tripRoom(payload.tripId)).emit(SOCKET_EVENTS.BUS_LOCATION, payload);
    }
  }

  @OnEvent(EVENTS.TRIP_STATUS_CHANGED)
  onTripStatus(payload: TripStatusPayload) {
    this.server.to(ADMIN_MAP_ROOM).emit(SOCKET_EVENTS.TRIP_STATUS, payload);
    this.server.to(tripRoom(payload.tripId)).emit(SOCKET_EVENTS.TRIP_STATUS, payload);
  }

  @OnEvent(EVENTS.SIMULATOR_STATE)
  onSimulatorState(payload: SimulatorStatePayload) {
    this.server.to(ADMIN_MAP_ROOM).emit(SOCKET_EVENTS.SIMULATOR_STATE, payload);
  }
}
