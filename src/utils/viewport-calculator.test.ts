import { describe, it, expect } from 'vitest';
import {
  calculateBoundingBox,
  expandBoundingBox,
  calculateZoomLevel,
  geoToPixel,
} from './viewport-calculator';
import type { BoundingBox, GeoPoint } from '../types';

describe('calculateBoundingBox', () => {
  it('should throw for empty array', () => {
    expect(() => calculateBoundingBox([])).toThrow('轨迹点数组不能为空');
  });

  it('should return identical min/max for a single point', () => {
    const bbox = calculateBoundingBox([{ lat: 30, lon: 120 }]);
    expect(bbox).toEqual({ minLat: 30, maxLat: 30, minLon: 120, maxLon: 120 });
  });

  it('should compute correct bounds for multiple points', () => {
    const points: GeoPoint[] = [
      { lat: 30, lon: 120 },
      { lat: 31, lon: 121 },
      { lat: 29.5, lon: 119.5 },
    ];
    const bbox = calculateBoundingBox(points);
    expect(bbox.minLat).toBe(29.5);
    expect(bbox.maxLat).toBe(31);
    expect(bbox.minLon).toBe(119.5);
    expect(bbox.maxLon).toBe(121);
  });

  it('should contain all input points (Property 6 example)', () => {
    const points: GeoPoint[] = [
      { lat: -10, lon: -50 },
      { lat: 45, lon: 90 },
      { lat: 0, lon: 0 },
    ];
    const bbox = calculateBoundingBox(points);
    for (const p of points) {
      expect(p.lat).toBeGreaterThanOrEqual(bbox.minLat);
      expect(p.lat).toBeLessThanOrEqual(bbox.maxLat);
      expect(p.lon).toBeGreaterThanOrEqual(bbox.minLon);
      expect(p.lon).toBeLessThanOrEqual(bbox.maxLon);
    }
  });
});

describe('expandBoundingBox', () => {
  const baseBbox: BoundingBox = { minLat: 30, maxLat: 31, minLon: 120, maxLon: 121 };

  it('should expand by default 20%', () => {
    const expanded = expandBoundingBox(baseBbox);
    expect(expanded.minLat).toBeLessThan(baseBbox.minLat);
    expect(expanded.maxLat).toBeGreaterThan(baseBbox.maxLat);
    expect(expanded.minLon).toBeLessThan(baseBbox.minLon);
    expect(expanded.maxLon).toBeGreaterThan(baseBbox.maxLon);
  });

  it('should expand by custom ratio', () => {
    const expanded = expandBoundingBox(baseBbox, 0.5);
    // lat range = 1, expand = 0.5
    expect(expanded.minLat).toBeCloseTo(29.5);
    expect(expanded.maxLat).toBeCloseTo(31.5);
    // lon range = 1, expand = 0.5
    expect(expanded.minLon).toBeCloseTo(119.5);
    expect(expanded.maxLon).toBeCloseTo(121.5);
  });

  it('should strictly contain original bbox (Property 7 example)', () => {
    const expanded = expandBoundingBox(baseBbox, 0.1);
    expect(expanded.minLat).toBeLessThan(baseBbox.minLat);
    expect(expanded.maxLat).toBeGreaterThan(baseBbox.maxLat);
    expect(expanded.minLon).toBeLessThan(baseBbox.minLon);
    expect(expanded.maxLon).toBeGreaterThan(baseBbox.maxLon);
  });

  it('should handle single-point bbox (zero range)', () => {
    const singleBbox: BoundingBox = { minLat: 30, maxLat: 30, minLon: 120, maxLon: 120 };
    const expanded = expandBoundingBox(singleBbox, 0.2);
    expect(expanded.minLat).toBeLessThan(30);
    expect(expanded.maxLat).toBeGreaterThan(30);
    expect(expanded.minLon).toBeLessThan(120);
    expect(expanded.maxLon).toBeGreaterThan(120);
  });
});

describe('calculateZoomLevel', () => {
  it('should return a value between 0 and 20', () => {
    const bbox: BoundingBox = { minLat: 30, maxLat: 31, minLon: 120, maxLon: 121 };
    const zoom = calculateZoomLevel(bbox, { width: 800, height: 600 });
    expect(zoom).toBeGreaterThanOrEqual(0);
    expect(zoom).toBeLessThanOrEqual(20);
  });

  it('should return higher zoom for smaller area', () => {
    const smallBbox: BoundingBox = { minLat: 30, maxLat: 30.01, minLon: 120, maxLon: 120.01 };
    const largeBbox: BoundingBox = { minLat: 20, maxLat: 40, minLon: 100, maxLon: 140 };
    const canvas = { width: 800, height: 600 };

    const zoomSmall = calculateZoomLevel(smallBbox, canvas);
    const zoomLarge = calculateZoomLevel(largeBbox, canvas);
    expect(zoomSmall).toBeGreaterThan(zoomLarge);
  });

  it('should return MAX_ZOOM for degenerate bbox', () => {
    const degenerateBbox: BoundingBox = { minLat: 30, maxLat: 30, minLon: 120, maxLon: 120 };
    const zoom = calculateZoomLevel(degenerateBbox, { width: 800, height: 600 });
    expect(zoom).toBe(20);
  });
});

describe('geoToPixel', () => {
  const bbox: BoundingBox = { minLat: 30, maxLat: 31, minLon: 120, maxLon: 121 };
  const canvas = { width: 800, height: 600 };

  it('should map bbox corners to canvas corners', () => {
    // Bottom-left corner of bbox → (0, height)
    const bl = geoToPixel({ lat: 30, lon: 120 }, bbox, canvas);
    expect(bl.x).toBeCloseTo(0);
    expect(bl.y).toBeCloseTo(600);

    // Top-right corner of bbox → (width, 0)
    const tr = geoToPixel({ lat: 31, lon: 121 }, bbox, canvas);
    expect(tr.x).toBeCloseTo(800);
    expect(tr.y).toBeCloseTo(0);
  });

  it('should map top-left corner correctly', () => {
    const tl = geoToPixel({ lat: 31, lon: 120 }, bbox, canvas);
    expect(tl.x).toBeCloseTo(0);
    expect(tl.y).toBeCloseTo(0);
  });

  it('should map center point approximately to canvas center', () => {
    const center = geoToPixel({ lat: 30.5, lon: 120.5 }, bbox, canvas);
    expect(center.x).toBeCloseTo(400);
    // Y won't be exactly 300 due to Mercator projection nonlinearity, but should be close
    expect(Math.abs(center.y - 300)).toBeLessThan(5);
  });

  it('should keep all bbox-interior points within canvas (Property 8 example)', () => {
    const points: GeoPoint[] = [
      { lat: 30.2, lon: 120.3 },
      { lat: 30.8, lon: 120.7 },
      { lat: 30.5, lon: 120.5 },
    ];
    for (const p of points) {
      const px = geoToPixel(p, bbox, canvas);
      expect(px.x).toBeGreaterThanOrEqual(0);
      expect(px.x).toBeLessThanOrEqual(canvas.width);
      expect(px.y).toBeGreaterThanOrEqual(0);
      expect(px.y).toBeLessThanOrEqual(canvas.height);
    }
  });

  it('should produce increasing x for increasing longitude', () => {
    const p1 = geoToPixel({ lat: 30.5, lon: 120.2 }, bbox, canvas);
    const p2 = geoToPixel({ lat: 30.5, lon: 120.8 }, bbox, canvas);
    expect(p2.x).toBeGreaterThan(p1.x);
  });

  it('should produce decreasing y for increasing latitude', () => {
    const p1 = geoToPixel({ lat: 30.2, lon: 120.5 }, bbox, canvas);
    const p2 = geoToPixel({ lat: 30.8, lon: 120.5 }, bbox, canvas);
    expect(p2.y).toBeLessThan(p1.y);
  });
});
