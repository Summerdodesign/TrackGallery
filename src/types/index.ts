/** 地理坐标点 */
export interface GeoPoint {
  lat: number;   // 纬度
  lon: number;   // 经度
  ele?: number;  // 海拔（可选）
}

/** 像素坐标点 */
export interface PixelPoint {
  x: number;
  y: number;
}

/** 尺寸 */
export interface Size {
  width: number;
  height: number;
}

/** 地理边界框 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** 途径点 */
export interface Waypoint {
  name: string;
  position: GeoPoint;
}

/** 轨迹数据（GPX 解析结果） */
export interface TrackData {
  name: string;                // 轨迹名称
  trackPoints: GeoPoint[];     // 轨迹点坐标序列
  waypoints: Waypoint[];       // 途径点列表
}

/** 配色方案 */
export interface ColorScheme {
  id: string;
  name: string;
  background: string;          // 背景色
  routeColor: string;          // 路线颜色
  routeGlow: string;           // 路线发光色
  roadColor: string;           // 道路肌理颜色
  waterColor: string;          // 水系颜色
  waypointColor: string;       // 途径点标记颜色
  titleColor: string;          // 标题文字颜色
}

/** 预设图标类型（12 种） */
export type AnnotationIcon =
  | 'landmark'     // 地标
  | 'restaurant'   // 餐饮
  | 'supply'       // 补给站
  | 'scenic'       // 景点
  | 'mountain'     // 山峰
  | 'start'        // 起点
  | 'finish'       // 终点
  | 'camp'         // 营地
  | 'photo'        // 拍照点
  | 'warning'      // 警告
  | 'water'        // 水源
  | 'rest';        // 休息点

/** 路线标注 */
export interface RouteAnnotation {
  id: string;
  position: GeoPoint;          // 标注点坐标（吸附到路线上）
  icon: AnnotationIcon;        // 图标类型
  label: string;               // 文字说明（最多 50 字符）
}

/** 步骤流程 */
export type FlowStep = 'upload' | 'colorScheme' | 'annotation' | 'export';

/** 应用全局状态 */
export interface AppState {
  step: FlowStep;
  gpxFile: File | null;
  trackData: TrackData | null;
  colorScheme: ColorScheme;
  annotations: RouteAnnotation[];
  geoFeatures: GeoFeature[];
  isLoading: boolean;
  error: string | null;
}

/** 地理要素（Overpass API 返回） */
export interface GeoFeature {
  type: 'road' | 'water';
  geometry: GeoPoint[];        // 线段坐标序列
  tags: Record<string, string>; // OSM 标签
}

/** GPX 验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** 路线统计信息 */
export interface RouteStats {
  totalDistanceKm: number;
  trackPointCount: number;
  waypointCount: number;
}

/** 渲染配置 */
export interface RenderConfig {
  canvasSize: Size;
  bbox: BoundingBox;
  zoomLevel: number;
  routeWidth?: number;
  roadWidth?: number;
  waterWidth?: number;
  annotationFontSize?: number;
}

/** 渲染数据 */
export interface RenderData {
  trackData: TrackData;
  geoFeatures: GeoFeature[];
  colorScheme: ColorScheme;
  annotations: RouteAnnotation[];
  renderConfig: RenderConfig;
}

/** 导出选项 */
export interface ExportOptions {
  minWidth: number;   // 最小宽度，默认 1920
  minHeight: number;  // 最小高度，默认 1080
  filename: string;
}
