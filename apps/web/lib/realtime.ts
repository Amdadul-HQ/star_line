'use client';

import { REALTIME_NAMESPACE } from '@starline/shared';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './auth-store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Shared realtime connection. The auth callback re-reads the store on every
 * (re)connect, so reconnects after a token refresh authenticate correctly.
 * Components join rooms in their own `connect` handlers, which also re-runs
 * on automatic reconnection — no extra bookkeeping needed.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}${REALTIME_NAMESPACE}`, {
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
  }
  return socket;
}

/** Call on login/logout so the next connection uses the new identity. */
export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
