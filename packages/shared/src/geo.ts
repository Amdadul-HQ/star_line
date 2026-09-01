/** Geometry helpers used by the GPS pipeline, ETA service and simulator. */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees 0–360. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function totalPathKm(points: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += haversineKm(points[i - 1], points[i]);
  return sum;
}

export interface PointOnPath extends LatLng {
  headingDeg: number;
  /** Index of the segment start point the position falls on. */
  segmentIndex: number;
  distanceFromStartKm: number;
}

/**
 * Position along a polyline at `distanceKm` from its start (linear
 * interpolation between stops). Clamps to the endpoints.
 */
export function pointAlongPath(points: LatLng[], distanceKm: number): PointOnPath {
  if (points.length === 0) throw new Error('pointAlongPath: empty path');
  if (points.length === 1 || distanceKm <= 0) {
    const heading = points.length > 1 ? bearingDeg(points[0], points[1]) : 0;
    return { ...points[0], headingDeg: heading, segmentIndex: 0, distanceFromStartKm: 0 };
  }
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = haversineKm(points[i - 1], points[i]);
    if (travelled + seg >= distanceKm && seg > 0) {
      const t = (distanceKm - travelled) / seg;
      return {
        lat: points[i - 1].lat + (points[i].lat - points[i - 1].lat) * t,
        lng: points[i - 1].lng + (points[i].lng - points[i - 1].lng) * t,
        headingDeg: bearingDeg(points[i - 1], points[i]),
        segmentIndex: i - 1,
        distanceFromStartKm: distanceKm,
      };
    }
    travelled += seg;
  }
  const last = points[points.length - 1];
  return {
    ...last,
    headingDeg: bearingDeg(points[points.length - 2], last),
    segmentIndex: points.length - 2,
    distanceFromStartKm: travelled,
  };
}

/**
 * Distance already covered along the path for an arbitrary position:
 * projects the position onto the nearest segment. Good enough for
 * progress/ETA; can be replaced by a road-aware provider later.
 */
export function progressAlongPathKm(points: LatLng[], pos: LatLng): number {
  if (points.length < 2) return 0;
  let best = { dist: Number.POSITIVE_INFINITY, alongKm: 0 };
  let cumulative = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segKm = haversineKm(a, b);
    // Approximate projection in lat/lng space (fine at city scale).
    const abLat = b.lat - a.lat;
    const abLng = b.lng - a.lng;
    const denom = abLat * abLat + abLng * abLng;
    let t = denom === 0 ? 0 : ((pos.lat - a.lat) * abLat + (pos.lng - a.lng) * abLng) / denom;
    t = Math.max(0, Math.min(1, t));
    const proj = { lat: a.lat + abLat * t, lng: a.lng + abLng * t };
    const d = haversineKm(pos, proj);
    if (d < best.dist) best = { dist: d, alongKm: cumulative + segKm * t };
    cumulative += segKm;
  }
  return best.alongKm;
}

/** Perpendicular-ish distance from the path, km — used for route deviation checks. */
export function distanceFromPathKm(points: LatLng[], pos: LatLng): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  if (points.length === 1) return haversineKm(points[0], pos);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const abLat = b.lat - a.lat;
    const abLng = b.lng - a.lng;
    const denom = abLat * abLat + abLng * abLng;
    let t = denom === 0 ? 0 : ((pos.lat - a.lat) * abLat + (pos.lng - a.lng) * abLng) / denom;
    t = Math.max(0, Math.min(1, t));
    const proj = { lat: a.lat + abLat * t, lng: a.lng + abLng * t };
    best = Math.min(best, haversineKm(pos, proj));
  }
  return best;
}
