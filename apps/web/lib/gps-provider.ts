'use client';

/**
 * Device-positioning abstraction. The driver dashboard talks to this
 * interface only, so the browser implementation can be swapped for a native
 * bridge (React Native / Capacitor) or a dedicated tracker device without
 * touching UI code. Browser GPS is treated as best-effort, not
 * production-perfect — errors surface through onError.
 */

export interface DeviceFix {
  lat: number;
  lng: number;
  speedKph: number | null;
  heading: number | null;
  accuracy: number | null;
  recordedAt: string;
}

export type GpsProviderError = 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'TIMEOUT';

export interface GpsProvider {
  isSupported(): boolean;
  start(onFix: (fix: DeviceFix) => void, onError: (error: GpsProviderError) => void): void;
  stop(): void;
}

export class BrowserGeolocationProvider implements GpsProvider {
  private watchId: number | null = null;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  start(onFix: (fix: DeviceFix) => void, onError: (error: GpsProviderError) => void): void {
    if (!this.isSupported()) {
      onError('UNAVAILABLE');
      return;
    }
    this.stop();
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speedKph: pos.coords.speed != null ? Math.max(0, pos.coords.speed * 3.6) : null,
          heading: pos.coords.heading ?? null,
          accuracy: pos.coords.accuracy ?? null,
          recordedAt: new Date(pos.timestamp).toISOString(),
        });
      },
      (err) => {
        onError(
          err.code === err.PERMISSION_DENIED
            ? 'PERMISSION_DENIED'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'UNAVAILABLE'
              : 'TIMEOUT',
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 },
    );
  }

  stop(): void {
    if (this.watchId != null && this.isSupported()) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
