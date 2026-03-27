import type { BoundingBox, GeoFeature, GeoPoint } from '../types';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export type FeatureType = 'road' | 'water';

/**
 * 根据 BoundingBox 和要素类型构建 Overpass QL 查询语句
 */
export function buildQuery(bbox: BoundingBox, type: FeatureType): string {
  const { minLat, minLon, maxLat, maxLon } = bbox;
  const bboxStr = `${minLat},${minLon},${maxLat},${maxLon}`;

  if (type === 'road') {
    return [
      '[out:json][timeout:30];',
      '(',
      `  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential"]`,
      `    (${bboxStr});`,
      ');',
      'out geom;',
    ].join('\n');
  }

  // water
  return [
    '[out:json][timeout:30];',
    '(',
    `  way["waterway"~"river|stream|canal"]`,
    `    (${bboxStr});`,
    `  way["natural"="water"]`,
    `    (${bboxStr});`,
    `  relation["natural"="water"]`,
    `    (${bboxStr});`,
    ');',
    'out geom;',
  ].join('\n');
}

/** Overpass API JSON 响应中的元素 */
interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  members?: Array<{
    type: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * 将 Overpass API 返回的元素解析为 GeoFeature[]
 */
function parseElements(
  elements: OverpassElement[],
  featureType: 'road' | 'water',
): GeoFeature[] {
  const features: GeoFeature[] = [];

  for (const el of elements) {
    if (el.type === 'way' && el.geometry && el.geometry.length > 0) {
      const geometry: GeoPoint[] = el.geometry.map((p) => ({
        lat: p.lat,
        lon: p.lon,
      }));
      features.push({
        type: featureType,
        geometry,
        tags: el.tags ?? {},
      });
    } else if (el.type === 'relation' && el.members) {
      // relation 中提取 way 成员的 geometry
      for (const member of el.members) {
        if (
          member.type === 'way' &&
          member.geometry &&
          member.geometry.length > 0
        ) {
          const geometry: GeoPoint[] = member.geometry.map((p) => ({
            lat: p.lat,
            lon: p.lon,
          }));
          features.push({
            type: featureType,
            geometry,
            tags: el.tags ?? {},
          });
        }
      }
    }
  }

  return features;
}

/**
 * 带超时和重试的 fetch 请求
 */
async function fetchWithRetry(
  query: string,
  retries = MAX_RETRIES,
): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Overpass API 请求失败: HTTP ${response.status} ${response.statusText}`,
        );
      }

      const data: OverpassResponse = await response.json();
      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Check for AbortError (timeout) - works with both Error and DOMException
      const isAbort =
        error instanceof DOMException
          ? error.name === 'AbortError'
          : error instanceof Error && error.name === 'AbortError';

      if (isAbort) {
        lastError = new Error('Overpass API 请求超时');
      } else {
        lastError =
          error instanceof Error ? error : new Error(String(error));
      }

      // 最后一次重试仍失败则抛出
      if (attempt === retries) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Overpass API 请求失败');
}

/**
 * 获取道路网络数据
 */
export async function fetchRoads(bbox: BoundingBox): Promise<GeoFeature[]> {
  const query = buildQuery(bbox, 'road');
  const data = await fetchWithRetry(query);
  return parseElements(data.elements, 'road');
}

/**
 * 获取水系数据
 */
export async function fetchWaterways(bbox: BoundingBox): Promise<GeoFeature[]> {
  const query = buildQuery(bbox, 'water');
  const data = await fetchWithRetry(query);
  return parseElements(data.elements, 'water');
}

export const OverpassService = {
  buildQuery,
  fetchRoads,
  fetchWaterways,
};
