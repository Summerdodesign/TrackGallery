import type { GeoPoint, BoundingBox, Size, PixelPoint } from '../types';

/**
 * 计算轨迹点的地理边界框
 * @param points 轨迹点数组（至少 1 个点）
 * @returns 包含所有点的最小边界框
 * @throws 当点数组为空时抛出错误
 */
export function calculateBoundingBox(points: GeoPoint[]): BoundingBox {
  if (points.length === 0) {
    throw new Error('轨迹点数组不能为空');
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;

  for (let i = 1; i < points.length; i++) {
    const { lat, lon } = points[i];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  return { minLat, maxLat, minLon, maxLon };
}

/**
 * 在边界框基础上向四周扩展指定比例
 * @param bbox 原始边界框
 * @param ratio 扩展比例，默认 0.2（20%）
 * @returns 扩展后的边界框
 */
export function expandBoundingBox(bbox: BoundingBox, ratio: number = 0.2): BoundingBox {
  const latRange = bbox.maxLat - bbox.minLat;
  const lonRange = bbox.maxLon - bbox.minLon;

  // 当范围为 0（单点）时使用一个最小扩展量
  const latExpand = latRange === 0 ? 0.001 * ratio : latRange * ratio;
  const lonExpand = lonRange === 0 ? 0.001 * ratio : lonRange * ratio;

  return {
    minLat: bbox.minLat - latExpand,
    maxLat: bbox.maxLat + latExpand,
    minLon: bbox.minLon - lonExpand,
    maxLon: bbox.maxLon + lonExpand,
  };
}

/**
 * 根据扩展后边界框和画布尺寸计算缩放级别
 * 使用 Web Mercator 投影的标准瓦片计算方式
 * @param bbox 扩展后的边界框
 * @param canvasSize 画布尺寸
 * @returns 缩放级别（0-20）
 */
export function calculateZoomLevel(bbox: BoundingBox, canvasSize: Size): number {
  const TILE_SIZE = 256;
  const MAX_ZOOM = 20;

  const latRange = bbox.maxLat - bbox.minLat;
  const lonRange = bbox.maxLon - bbox.minLon;

  if (latRange <= 0 || lonRange <= 0) {
    return MAX_ZOOM;
  }

  // 基于经度范围计算缩放级别
  const zoomLon = Math.log2((360 / lonRange) * (canvasSize.width / TILE_SIZE));

  // 基于纬度范围计算缩放级别（考虑 Mercator 投影的纬度变形）
  const latRadMax = (bbox.maxLat * Math.PI) / 180;
  const latRadMin = (bbox.minLat * Math.PI) / 180;
  const mercatorRangeY = Math.log(Math.tan(Math.PI / 4 + latRadMax / 2)) -
    Math.log(Math.tan(Math.PI / 4 + latRadMin / 2));
  const zoomLat = Math.log2((2 * Math.PI / mercatorRangeY) * (canvasSize.height / TILE_SIZE));

  // 取较小值确保整个区域可见，并限制在 [0, MAX_ZOOM]
  const zoom = Math.min(zoomLon, zoomLat);
  return Math.max(0, Math.min(MAX_ZOOM, Math.floor(zoom)));
}

/**
 * 使用 Web Mercator 投影将地理坐标转换为画布像素坐标
 * @param point 地理坐标点
 * @param bbox 边界框
 * @param canvasSize 画布尺寸
 * @returns 像素坐标点
 */
export function geoToPixel(point: GeoPoint, bbox: BoundingBox, canvasSize: Size): PixelPoint {
  const mercatorX = (lon: number) => lon * (Math.PI / 180);
  const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

  const x = ((mercatorX(point.lon) - mercatorX(bbox.minLon)) /
    (mercatorX(bbox.maxLon) - mercatorX(bbox.minLon))) * canvasSize.width;

  const y = ((mercatorY(bbox.maxLat) - mercatorY(point.lat)) /
    (mercatorY(bbox.maxLat) - mercatorY(bbox.minLat))) * canvasSize.height;

  return { x, y };
}
