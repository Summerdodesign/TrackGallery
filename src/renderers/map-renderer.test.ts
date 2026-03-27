import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapRenderer } from './map-renderer';
import type {
  RenderConfig,
  RenderData,
  ColorScheme,
  GeoPoint,
  Waypoint,
  RouteAnnotation,
  GeoFeature,
} from '../types';

const TEST_COLOR_SCHEME: ColorScheme = {
  id: 'test',
  name: 'Test',
  background: '#1A1A2E',
  routeColor: '#00FF88',
  routeGlow: '#00FF8844',
  roadColor: '#333333',
  waterColor: '#1A3A5C',
  waypointColor: '#FFD700',
  titleColor: '#FFFFFF',
};

const TEST_CONFIG: RenderConfig = {
  canvasSize: { width: 800, height: 600 },
  bbox: { minLat: 30, maxLat: 31, minLon: 120, maxLon: 121 },
  zoomLevel: 12,
};

/** Create a mock CanvasRenderingContext2D with all methods stubbed */
function createMockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: 'round',
    lineCap: 'round',
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createCanvas(): HTMLCanvasElement {
  const mockCtx = createMockCtx();
  const canvas = document.createElement('canvas');
  // Override getContext to return our mock
  canvas.getContext = vi.fn(() => mockCtx) as unknown as typeof canvas.getContext;
  // Override toDataURL since jsdom doesn't implement it
  canvas.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
  return canvas;
}

describe('MapRenderer', () => {
  let renderer: MapRenderer;

  beforeEach(() => {
    renderer = new MapRenderer();
  });

  it('should instantiate without errors', () => {
    expect(renderer).toBeInstanceOf(MapRenderer);
  });

  it('should have all required public methods', () => {
    expect(typeof renderer.init).toBe('function');
    expect(typeof renderer.render).toBe('function');
    expect(typeof renderer.renderBackground).toBe('function');
    expect(typeof renderer.renderContextLayer).toBe('function');
    expect(typeof renderer.renderRouteLayer).toBe('function');
    expect(typeof renderer.renderWaypointLayer).toBe('function');
    expect(typeof renderer.renderAnnotationLayer).toBe('function');
    expect(typeof renderer.toDataURL).toBe('function');
  });

  describe('init', () => {
    it('should bind canvas and config without throwing', () => {
      expect(() => renderer.init(createCanvas(), TEST_CONFIG)).not.toThrow();
    });

    it('should set canvas dimensions from config', () => {
      const canvas = createCanvas();
      renderer.init(canvas, TEST_CONFIG);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });
  });

  describe('before init — throws on usage', () => {
    it('render should throw if not initialized', () => {
      const data: RenderData = {
        trackData: { name: 'test', trackPoints: [], waypoints: [] },
        geoFeatures: [],
        colorScheme: TEST_COLOR_SCHEME,
        annotations: [],
        renderConfig: TEST_CONFIG,
      };
      expect(() => renderer.render(data)).toThrow('未初始化');
    });

    it('toDataURL should throw if not initialized', () => {
      expect(() => renderer.toDataURL()).toThrow('未初始化');
    });

    it('renderBackground should throw if not initialized', () => {
      expect(() => renderer.renderBackground(TEST_COLOR_SCHEME)).toThrow('未初始化');
    });
  });

  describe('after init — methods execute without errors', () => {
    beforeEach(() => {
      renderer.init(createCanvas(), TEST_CONFIG);
    });

    it('renderBackground should not throw', () => {
      expect(() => renderer.renderBackground(TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderContextLayer should handle empty features', () => {
      expect(() => renderer.renderContextLayer([], TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderContextLayer should handle road and water features', () => {
      const features: GeoFeature[] = [
        { type: 'road', geometry: [{ lat: 30.2, lon: 120.2 }, { lat: 30.3, lon: 120.3 }], tags: {} },
        { type: 'water', geometry: [{ lat: 30.4, lon: 120.4 }, { lat: 30.5, lon: 120.5 }], tags: {} },
      ];
      expect(() => renderer.renderContextLayer(features, TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderContextLayer should skip features with < 2 geometry points', () => {
      const features: GeoFeature[] = [
        { type: 'road', geometry: [{ lat: 30.2, lon: 120.2 }], tags: {} },
      ];
      expect(() => renderer.renderContextLayer(features, TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderRouteLayer should handle empty track points', () => {
      expect(() => renderer.renderRouteLayer([], TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderRouteLayer should handle single track point (< 2)', () => {
      expect(() => renderer.renderRouteLayer([{ lat: 30, lon: 120 }], TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderRouteLayer should handle multiple track points', () => {
      const points: GeoPoint[] = [
        { lat: 30.1, lon: 120.1 },
        { lat: 30.2, lon: 120.2 },
        { lat: 30.3, lon: 120.3 },
      ];
      expect(() => renderer.renderRouteLayer(points, TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderWaypointLayer should handle empty waypoints', () => {
      expect(() => renderer.renderWaypointLayer([], TEST_COLOR_SCHEME)).not.toThrow();
    });

    it('renderWaypointLayer should draw waypoints and start/end markers', () => {
      const waypoints: Waypoint[] = [
        { name: '补给站', position: { lat: 30.5, lon: 120.5 } },
      ];
      const trackPoints: GeoPoint[] = [
        { lat: 30.1, lon: 120.1 },
        { lat: 30.9, lon: 120.9 },
      ];
      expect(() => renderer.renderWaypointLayer(waypoints, TEST_COLOR_SCHEME, trackPoints)).not.toThrow();
    });

    it('renderAnnotationLayer should handle empty annotations', () => {
      expect(() => renderer.renderAnnotationLayer([])).not.toThrow();
    });

    it('renderAnnotationLayer should handle annotations with labels', () => {
      const annotations: RouteAnnotation[] = [
        { id: '1', position: { lat: 30.5, lon: 120.5 }, icon: 'landmark', label: '地标' },
        { id: '2', position: { lat: 30.6, lon: 120.6 }, icon: 'scenic', label: '' },
      ];
      expect(() => renderer.renderAnnotationLayer(annotations)).not.toThrow();
    });

    it('render should call all layers in order without errors', () => {
      const data: RenderData = {
        trackData: {
          name: 'test-track',
          trackPoints: [
            { lat: 30.1, lon: 120.1 },
            { lat: 30.5, lon: 120.5 },
            { lat: 30.9, lon: 120.9 },
          ],
          waypoints: [{ name: 'WP1', position: { lat: 30.3, lon: 120.3 } }],
        },
        geoFeatures: [
          { type: 'road', geometry: [{ lat: 30.2, lon: 120.2 }, { lat: 30.4, lon: 120.4 }], tags: {} },
        ],
        colorScheme: TEST_COLOR_SCHEME,
        annotations: [
          { id: 'a1', position: { lat: 30.5, lon: 120.5 }, icon: 'photo', label: '拍照点' },
        ],
        renderConfig: TEST_CONFIG,
      };
      expect(() => renderer.render(data)).not.toThrow();
    });

    it('toDataURL should return a data URL string', () => {
      const result = renderer.toDataURL();
      expect(typeof result).toBe('string');
      expect(result).toContain('data:');
    });

    it('toDataURL should accept format and quality parameters', () => {
      expect(() => renderer.toDataURL('image/png', 0.9)).not.toThrow();
    });
  });
});
