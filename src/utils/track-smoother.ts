import type { GeoPoint } from '../types';

/**
 * Chaikin 曲线细分算法对轨迹点进行平滑
 * iterations=0 表示不平滑（原始轨迹），每增加一次迭代轨迹更平滑
 */
export function smoothTrack(points: GeoPoint[], iterations: number): GeoPoint[] {
  if (iterations <= 0 || points.length < 3) return points;

  let result = points;
  for (let i = 0; i < iterations; i++) {
    result = chaikinStep(result);
  }
  return result;
}

function chaikinStep(points: GeoPoint[]): GeoPoint[] {
  if (points.length < 2) return points;

  const out: GeoPoint[] = [points[0]]; // 保留起点

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    out.push({
      lat: p0.lat * 0.75 + p1.lat * 0.25,
      lon: p0.lon * 0.75 + p1.lon * 0.25,
      ...(p0.ele !== undefined && p1.ele !== undefined
        ? { ele: p0.ele * 0.75 + p1.ele * 0.25 }
        : {}),
    });
    out.push({
      lat: p0.lat * 0.25 + p1.lat * 0.75,
      lon: p0.lon * 0.25 + p1.lon * 0.75,
      ...(p0.ele !== undefined && p1.ele !== undefined
        ? { ele: p0.ele * 0.25 + p1.ele * 0.75 }
        : {}),
    });
  }

  out.push(points[points.length - 1]); // 保留终点
  return out;
}
