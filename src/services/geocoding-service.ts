import type { GeoPoint } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeocodingResult {
  name: string;
  position: GeoPoint | null;
  error?: string;
}

/**
 * 通过 Nominatim 地理编码查找地点坐标
 * 限制搜索范围到轨迹附近区域
 */
export async function geocodePlace(
  name: string,
  viewbox?: { minLon: number; maxLon: number; minLat: number; maxLat: number },
): Promise<GeocodingResult> {
  try {
    const params = new URLSearchParams({
      q: name,
      format: 'json',
      limit: '1',
      'accept-language': 'zh',
    });
    if (viewbox) {
      params.set('viewbox', `${viewbox.minLon},${viewbox.maxLat},${viewbox.maxLon},${viewbox.minLat}`);
      params.set('bounded', '1');
    }

    const resp = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'GPX-Stylized-Map/1.0' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    if (!data.length) {
      // 如果限定范围没找到，不限范围再试一次
      if (viewbox) {
        return geocodePlace(name);
      }
      return { name, position: null, error: '未找到该地点' };
    }

    return {
      name,
      position: { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) },
    };
  } catch (err) {
    return { name, position: null, error: err instanceof Error ? err.message : '查询失败' };
  }
}

/**
 * 批量地理编码，每次请求间隔 1 秒（Nominatim 限流要求）
 */
export async function geocodePlaces(
  names: string[],
  viewbox?: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  onProgress?: (done: number, total: number) => void,
): Promise<GeocodingResult[]> {
  const results: GeocodingResult[] = [];
  for (let i = 0; i < names.length; i++) {
    const result = await geocodePlace(names[i].trim(), viewbox);
    results.push(result);
    onProgress?.(i + 1, names.length);
    // Nominatim 要求每秒最多 1 次请求
    if (i < names.length - 1) {
      await new Promise(r => setTimeout(r, 1100));
    }
  }
  return results;
}
