import { describe, it, expect } from 'vitest';
import { haversineDistance, calculateTotalDistance, calculateRouteStats } from './route-stats';
import type { GeoPoint, TrackData } from '../types';

describe('haversineDistance', () => {
  it('should return 0 for the same point', () => {
    const p: GeoPoint = { lat: 40.0, lon: 116.0 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it('should compute a known distance (Beijing to Shanghai ≈ 1068 km)', () => {
    const beijing: GeoPoint = { lat: 39.9042, lon: 116.4074 };
    const shanghai: GeoPoint = { lat: 31.2304, lon: 121.4737 };
    const dist = haversineDistance(beijing, shanghai);
    expect(dist).toBeGreaterThan(1050);
    expect(dist).toBeLessThan(1090);
  });

  it('should always return a non-negative value', () => {
    const a: GeoPoint = { lat: -33.8688, lon: 151.2093 };
    const b: GeoPoint = { lat: 51.5074, lon: -0.1278 };
    expect(haversineDistance(a, b)).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateTotalDistance', () => {
  it('should return 0 for empty array', () => {
    expect(calculateTotalDistance([])).toBe(0);
  });

  it('should return 0 for a single point', () => {
    expect(calculateTotalDistance([{ lat: 0, lon: 0 }])).toBe(0);
  });

  it('should equal haversine distance for two points', () => {
    const a: GeoPoint = { lat: 39.9, lon: 116.4 };
    const b: GeoPoint = { lat: 31.2, lon: 121.5 };
    expect(calculateTotalDistance([a, b])).toBeCloseTo(haversineDistance(a, b), 10);
  });

  it('should sum distances for multiple points', () => {
    const pts: GeoPoint[] = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 0 },
      { lat: 1, lon: 1 },
    ];
    const expected = haversineDistance(pts[0], pts[1]) + haversineDistance(pts[1], pts[2]);
    expect(calculateTotalDistance(pts)).toBeCloseTo(expected, 10);
  });
});

describe('calculateRouteStats', () => {
  it('should compute stats for a track', () => {
    const track: TrackData = {
      name: 'Test',
      trackPoints: [
        { lat: 0, lon: 0 },
        { lat: 1, lon: 0 },
      ],
      waypoints: [{ name: 'WP1', position: { lat: 0.5, lon: 0 } }],
    };
    const stats = calculateRouteStats(track);
    expect(stats.totalDistanceKm).toBeGreaterThan(0);
    expect(stats.trackPointCount).toBe(2);
    expect(stats.waypointCount).toBe(1);
  });
});
