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
    }

    const resp = await fetch(`${NOMINATIM_URL}?${params}`);
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
    const msg = err instanceof Error ? err.message : '查询失败';
    // 检测常见的网络/代理错误
    const isNetworkError = msg.includes('Failed to fetch') || msg.includes('NetworkError') ||
      msg.includes('ECONNREFUSED') || msg.includes('net::') || msg.includes('proxy') ||
      msg.includes('CORS') || msg.includes('TypeError');
    const errorMsg = isNetworkError
      ? '网络请求失败，可能被代理/防火墙拦截。请关闭代理后重试，或检查网络连接。'
      : msg;
    return { name, position: null, error: errorMsg };
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
