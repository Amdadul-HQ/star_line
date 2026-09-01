'use client';

import type { AuthTokens, AuthUser, LoginResponse } from '@starline/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True once the persisted session has been read from storage. */
  hydrated: boolean;
  setSession: (session: LoginResponse) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
  markHydrated: () => void;
  clear: () => void;
}

/**
 * Client session store. This powers UX-level guards and API calls only —
 * real authorization always happens server-side (JWT + RBAC guards).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.tokens.accessToken,
          refreshToken: session.tokens.refreshToken,
        }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) => set({ user }),
      markHydrated: () => set({ hydrated: true }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'starline-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
