import { describe, it, expect } from 'vitest';
import { calculateExportDimensions } from './export-module';

describe('calculateExportDimensions', () => {
  const MIN_W = 1920;
  const MIN_H = 1080;

  it('should return scale 1 when element already meets minimum', () => {
    const result = calculateExportDimensions(1920, 1080, MIN_W, MIN_H);
    expect(result.scale).toBe(1);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('should return scale 1 when element exceeds minimum', () => {
    const result = calculateExportDimensions(3840, 2160, MIN_W, MIN_H);
    expect(result.scale).toBe(1);
    expect(result.width).toBe(3840);
    expect(result.height).toBe(2160);
  });

  it('should scale up when width is below minimum', () => {
    const result = calculateExportDimensions(960, 1080, MIN_W, MIN_H);
    expect(result.scale).toBe(2);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(2160);
  });

  it('should scale up when height is below minimum', () => {
    const result = calculateExportDimensions(1920, 540, MIN_W, MIN_H);
    expect(result.scale).toBe(2);
    expect(result.width).toBe(3840);
    expect(result.height).toBe(1080);
  });

  it('should scale up when both dimensions are below minimum', () => {
    const result = calculateExportDimensions(640, 360, MIN_W, MIN_H);
    // scaleX = 1920/640 = 3, scaleY = 1080/360 = 3
    expect(result.scale).toBe(3);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('should use the larger scale factor to satisfy both dimensions', () => {
    // scaleX = 1920/800 = 2.4, scaleY = 1080/600 = 1.8 → use 2.4
    const result = calculateExportDimensions(800, 600, MIN_W, MIN_H);
    expect(result.scale).toBe(2.4);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1440);
  });

  it('should handle zero element width gracefully', () => {
    const result = calculateExportDimensions(0, 500, MIN_W, MIN_H);
    expect(result.scale).toBe(1);
    expect(result.width).toBe(MIN_W);
    expect(result.height).toBe(MIN_H);
  });

  it('should handle zero element height gracefully', () => {
    const result = calculateExportDimensions(500, 0, MIN_W, MIN_H);
    expect(result.scale).toBe(1);
    expect(result.width).toBe(MIN_W);
    expect(result.height).toBe(MIN_H);
  });

  it('should handle negative dimensions gracefully', () => {
    const result = calculateExportDimensions(-100, -200, MIN_W, MIN_H);
    expect(result.scale).toBe(1);
    expect(result.width).toBe(MIN_W);
    expect(result.height).toBe(MIN_H);
  });

  it('should always produce width >= minWidth and height >= minHeight', () => {
    const result = calculateExportDimensions(100, 50, MIN_W, MIN_H);
    expect(result.width).toBeGreaterThanOrEqual(MIN_W);
    expect(result.height).toBeGreaterThanOrEqual(MIN_H);
  });

  it('should preserve aspect ratio', () => {
    const elemW = 800;
    const elemH = 400;
    const result = calculateExportDimensions(elemW, elemH, MIN_W, MIN_H);
    const originalRatio = elemW / elemH;
    const exportRatio = result.width / result.height;
    expect(exportRatio).toBeCloseTo(originalRatio, 1);
  });
});
