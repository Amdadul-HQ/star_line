'use client';

import { ERROR_CODES, type ApiResponse, type LoginResponse } from '@starline/shared';
import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Attach the access token (default true). */
  auth?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

/** Single-flight refresh — concurrent 401s share one rotation. */
async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const json = (await res.json()) as ApiResponse<LoginResponse>;
        if (!res.ok || !json.success) return false;
        useAuthStore.getState().setSession(json.data);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

async function execute<T>(path: string, options: RequestOptions, retried = false): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = useAuthStore.getState().accessToken;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK', 'Network error', 0);
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, 'Invalid server response', res.status);
  }

  if (!json.success) {
    const { code, message, details } = json.error;
    const expired =
      res.status === 401 &&
      (code === ERROR_CODES.TOKEN_EXPIRED || code === ERROR_CODES.UNAUTHORIZED);
    if (expired && auth && !retried && useAuthStore.getState().refreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) return execute<T>(path, options, true);
      useAuthStore.getState().clear();
    }
    throw new ApiError(code, message, res.status, details);
  }
  return json.data;
}

export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return execute<T>(path, options);
}

export async function logoutEverywhere(): Promise<void> {
  const { refreshToken, clear } = useAuthStore.getState();
  clear();
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
}
