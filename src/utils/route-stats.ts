import type { GeoPoint, RouteStats, TrackData } from '../types';

const EARTH_RADIUS_KM = 6371;

/** 将角度转换为弧度 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * 使用 Haversine 公式计算两个地理坐标点之间的距离（千米）
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * 计算轨迹点序列的总距离（千米）
 * - 空数组或单点返回 0
 * - 总距离 = 相邻点 Haversine 距离之和，始终非负
 */
export function calculateTotalDistance(points: GeoPoint[]): number {
  if (points.length <= 1) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * 计算路线统计信息
 */
export function calculateRouteStats(trackData: TrackData): RouteStats {
  return {
    totalDistanceKm: calculateTotalDistance(trackData.trackPoints),
    trackPointCount: trackData.trackPoints.length,
    waypointCount: trackData.waypoints.length,
  };
}
