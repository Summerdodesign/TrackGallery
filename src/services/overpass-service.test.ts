import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildQuery, fetchRoads, fetchWaterways } from './overpass-service';
import type { BoundingBox } from '../types';

const sampleBbox: BoundingBox = {
  minLat: 30.0,
  maxLat: 30.5,
  minLon: 120.0,
  maxLon: 120.5,
};

// ─── buildQuery ───

describe('buildQuery', () => {
  it('should build a road query with correct highway tags', () => {
    const query = buildQuery(sampleBbox, 'road');
    expect(query).toContain('[out:json][timeout:30]');
    expect(query).toContain('out geom');
    expect(query).toContain('"highway"~"motorway|trunk|primary|secondary|tertiary|residential"');
    expect(query).toContain('30,120,30.5,120.5');
  });

  it('should build a water query with waterway and natural=water tags', () => {
    const query = buildQuery(sampleBbox, 'water');
    expect(query).toContain('[out:json][timeout:30]');
    expect(query).toContain('out geom');
    expect(query).toContain('"waterway"~"river|stream|canal"');
    expect(query).toContain('"natural"="water"');
    expect(query).toContain('30,120,30.5,120.5');
  });

  it('road query should include all 6 highway types', () => {
    const query = buildQuery(sampleBbox, 'road');
    for (const tag of ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential']) {
      expect(query).toContain(tag);
    }
  });

  it('water query should include river, stream, canal and natural=water', () => {
    const query = buildQuery(sampleBbox, 'water');
    for (const tag of ['river', 'stream', 'canal']) {
      expect(query).toContain(tag);
    }
    expect(query).toContain('"natural"="water"');
  });

  it('water query should include relation for natural=water', () => {
    const query = buildQuery(sampleBbox, 'water');
    expect(query).toContain('relation["natural"="water"]');
  });
});

// ─── Response parsing via fetchRoads / fetchWaterways ───

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchFailThenSuccess(data: unknown) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    call++;
    if (call === 1) {
      return Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    });
  });
}

const roadResponse = {
  elements: [
    {
      type: 'way',
      id: 1,
      tags: { highway: 'primary', name: 'Main St' },
      geometry: [
        { lat: 30.1, lon: 120.1 },
        { lat: 30.2, lon: 120.2 },
      ],
    },
    {
      type: 'way',
      id: 2,
      tags: { highway: 'residential' },
      geometry: [{ lat: 30.3, lon: 120.3 }],
    },
  ],
};

const waterResponse = {
  elements: [
    {
      type: 'way',
      id: 10,
      tags: { waterway: 'river', name: 'Blue River' },
      geometry: [
        { lat: 30.0, lon: 120.0 },
        { lat: 30.05, lon: 120.05 },
      ],
    },
    {
      type: 'relation',
      id: 20,
      tags: { natural: 'water', name: 'Lake' },
      members: [
        {
          type: 'way',
          geometry: [
            { lat: 30.1, lon: 120.1 },
            { lat: 30.15, lon: 120.15 },
          ],
        },
        {
          type: 'node',
          geometry: undefined,
        },
      ],
    },
  ],
};

describe('fetchRoads', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should parse road elements into GeoFeature[]', async () => {
    globalThis.fetch = mockFetchSuccess(roadResponse) as unknown as typeof fetch;

    const features = await fetchRoads(sampleBbox);
    expect(features).toHaveLength(2);
    expect(features[0].type).toBe('road');
    expect(features[0].tags.highway).toBe('primary');
    expect(features[0].geometry).toEqual([
      { lat: 30.1, lon: 120.1 },
      { lat: 30.2, lon: 120.2 },
    ]);
    expect(features[1].geometry).toHaveLength(1);
  });

  it('should send POST request with correct query', async () => {
    const mockFn = mockFetchSuccess({ elements: [] });
    globalThis.fetch = mockFn as unknown as typeof fetch;

    await fetchRoads(sampleBbox);

    expect(mockFn).toHaveBeenCalledTimes(1);
    const [url, options] = mockFn.mock.calls[0];
    expect(url).toBe('https://overpass-api.de/api/interpreter');
    expect(options.method).toBe('POST');
    expect(options.body).toContain('highway');
  });

  it('should retry on failure and succeed', async () => {
    globalThis.fetch = mockFetchFailThenSuccess(roadResponse) as unknown as typeof fetch;

    const features = await fetchRoads(sampleBbox);
    expect(features).toHaveLength(2);
  });

  it('should throw after all retries exhausted', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    }) as unknown as typeof fetch;

    await expect(fetchRoads(sampleBbox)).rejects.toThrow('Overpass API 请求失败');
  });
});

describe('fetchWaterways', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should parse water elements including relations', async () => {
    globalThis.fetch = mockFetchSuccess(waterResponse) as unknown as typeof fetch;

    const features = await fetchWaterways(sampleBbox);
    // 1 way + 1 way member from relation (node member is skipped)
    expect(features).toHaveLength(2);
    expect(features[0].type).toBe('water');
    expect(features[0].tags.waterway).toBe('river');
    expect(features[1].type).toBe('water');
    expect(features[1].tags.natural).toBe('water');
  });

  it('should skip elements without geometry', async () => {
    const response = {
      elements: [
        { type: 'way', id: 1, tags: { waterway: 'stream' }, geometry: [] },
        { type: 'node', id: 2, tags: {} },
      ],
    };
    globalThis.fetch = mockFetchSuccess(response) as unknown as typeof fetch;

    const features = await fetchWaterways(sampleBbox);
    expect(features).toHaveLength(0);
  });

  it('should handle timeout (AbortError)', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new DOMException('The operation was aborted', 'AbortError');
      return Promise.reject(error);
    }) as unknown as typeof fetch;

    await expect(fetchWaterways(sampleBbox)).rejects.toThrow('Overpass API 请求超时');
  });

  it('should handle empty response', async () => {
    globalThis.fetch = mockFetchSuccess({ elements: [] }) as unknown as typeof fetch;

    const features = await fetchWaterways(sampleBbox);
    expect(features).toHaveLength(0);
  });
});
