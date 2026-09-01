import { Injectable } from '@nestjs/common';
import {
  haversineKm,
  progressAlongPathKm,
  totalPathKm,
  type LatLng,
} from '@starline/shared';

export interface EtaResult {
  etaMinutes: number | null;
  progressPct: number | null;
  nextStop: string | null;
  remainingKm: number | null;
}

/** Used when the bus is crawling/stopped so ETA doesn't blow up to infinity. */
const FALLBACK_AVG_SPEED_KPH = 45;
const MIN_LIVE_SPEED_KPH = 8;

/**
 * ETA v1 — straight-line route-geometry estimate (current position projected
 * onto the stop polyline). The interface is provider-shaped so a
 * traffic-aware implementation (Google/Mapbox) can replace the math later
 * without touching callers.
 */
@Injectable()
export class EtaService {
  compute(
    stops: Array<LatLng & { name: string }>,
    position: LatLng,
    speedKph: number | null | undefined,
  ): EtaResult {
    if (stops.length < 2) {
      return { etaMinutes: null, progressPct: null, nextStop: null, remainingKm: null };
    }
    const totalKm = totalPathKm(stops);
    const doneKm = Math.min(totalKm, progressAlongPathKm(stops, position));
    const remainingKm = Math.max(0, totalKm - doneKm);

    const effectiveSpeed =
      speedKph && speedKph > MIN_LIVE_SPEED_KPH ? speedKph : FALLBACK_AVG_SPEED_KPH;
    const etaMinutes = Math.round((remainingKm / effectiveSpeed) * 60);
    const progressPct = totalKm > 0 ? Math.min(100, Math.round((doneKm / totalKm) * 100)) : null;

    let nextStop: string | null = null;
    let cumulative = 0;
    for (let i = 1; i < stops.length; i++) {
      cumulative += haversineKm(stops[i - 1], stops[i]);
      if (cumulative > doneKm + 0.5) {
        nextStop = stops[i].name;
        break;
      }
    }

    return { etaMinutes, progressPct, nextStop, remainingKm: Math.round(remainingKm * 10) / 10 };
  }
}
