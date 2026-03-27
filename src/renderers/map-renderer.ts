import type {
  GeoPoint,
  PixelPoint,
  ColorScheme,
  GeoFeature,
  Waypoint,
  RouteAnnotation,
  RenderConfig,
  RenderData,
  AnnotationIcon,
} from '../types';
import { geoToPixel } from '../utils/viewport-calculator';

/** 标注图标 emoji 映射 */
const ICON_EMOJI: Record<AnnotationIcon, string> = {
  landmark: '📍',
  restaurant: '🍴',
  supply: '⛽',
  scenic: '🏞️',
  mountain: '⛰️',
  start: '🏁',
  finish: '🎯',
  camp: '⛺',
  photo: '📷',
  warning: '⚠️',
  water: '💧',
  rest: '🪑',
};

/**
 * Canvas 地图渲染器
 * 按分层顺序渲染：背景 → 上下文（道路/水系） → 路线 → 途径点 → 标注
 */
export class MapRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: RenderConfig | null = null;

  /**
   * 绑定 Canvas 元素和渲染配置
   */
  init(canvas: HTMLCanvasElement, config: RenderConfig): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;

    canvas.width = config.canvasSize.width;
    canvas.height = config.canvasSize.height;
  }

  /**
   * 按顺序调用各层渲染：背景 → 上下文 → 路线 → 途径点 → 标注
   */
  render(data: RenderData): void {
    if (!this.ctx || !this.config) {
      throw new Error('MapRenderer 未初始化，请先调用 init()');
    }

    this.renderBackground(data.colorScheme);
    this.renderContextLayer(data.geoFeatures, data.colorScheme, data.renderConfig.roadWidth ?? 3, data.renderConfig.waterWidth ?? 4);
    this.renderRouteLayer(data.trackData.trackPoints, data.colorScheme, data.renderConfig.routeWidth ?? 2.5);
    this.renderWaypointLayer(data.trackData.waypoints, data.colorScheme, data.trackData.trackPoints);
    this.renderAnnotationLayer(data.annotations);
  }

  /**
   * 使用 ColorScheme 背景色填充画布
   */
  renderBackground(colorScheme: ColorScheme): void {
    const ctx = this.getContext();
    const { width, height } = this.getCanvasSize();

    ctx.fillStyle = colorScheme.background;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * 绘制上下文层：道路网络（灰色细线 0.5-1px）和水系（深蓝灰色），不显示文字标注
   */
  renderContextLayer(features: GeoFeature[], colorScheme: ColorScheme, roadWidth: number = 3, waterWidth: number = 4): void {
    const ctx = this.getContext();
    const config = this.getConfig();

    for (const feature of features) {
      if (feature.geometry.length < 2) continue;

      ctx.beginPath();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (feature.type === 'road') {
        ctx.strokeStyle = colorScheme.roadColor;
        ctx.lineWidth = roadWidth;
      } else {
        ctx.strokeStyle = colorScheme.waterColor;
        ctx.lineWidth = waterWidth;
      }

      const firstPx = this.toPixel(feature.geometry[0], config);
      ctx.moveTo(firstPx.x, firstPx.y);

      for (let i = 1; i < feature.geometry.length; i++) {
        const px = this.toPixel(feature.geometry[i], config);
        ctx.lineTo(px.x, px.y);
      }

      ctx.stroke();
    }
  }

  /**
   * 绘制路线轨迹层：按轨迹点顺序连接，线宽可配置
   */
  renderRouteLayer(trackPoints: GeoPoint[], colorScheme: ColorScheme, routeWidth: number = 2.5): void {
    const ctx = this.getContext();
    const config = this.getConfig();

    if (trackPoints.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = colorScheme.routeColor;
    ctx.lineWidth = routeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const first = this.toPixel(trackPoints[0], config);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < trackPoints.length; i++) {
      const px = this.toPixel(trackPoints[i], config);
      ctx.lineTo(px.x, px.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 绘制途径点层：圆形标记 + 名称标签，起点/终点绘制特殊标记
   * 起点标记坐标 = 第一个轨迹点，终点标记坐标 = 最后一个轨迹点（Property 9）
   */
  renderWaypointLayer(waypoints: Waypoint[], colorScheme: ColorScheme, trackPoints?: GeoPoint[]): void {
    const config = this.getConfig();

    // 绘制普通途径点
    for (const wp of waypoints) {
      const px = this.toPixel(wp.position, config);
      this.drawWaypointMarker(px, wp.name, colorScheme);
    }

    // 起点/终点标记已禁用
  }

  /**
   * 绘制标注层：图标 emoji + 文字说明
   */
  renderAnnotationLayer(annotations: RouteAnnotation[]): void {
    const ctx = this.getContext();
    const config = this.getConfig();

    for (const annotation of annotations) {
      const px = this.toPixel(annotation.position, config);
      const emoji = ICON_EMOJI[annotation.icon] || '📍';

      // 绘制图标
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(emoji, px.x, px.y - 4);

      // 绘制文字标签
      if (annotation.label) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // 文字背景
        const metrics = ctx.measureText(annotation.label);
        const textWidth = metrics.width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(px.x - textWidth / 2 - 3, px.y + 2, textWidth + 6, 16);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(annotation.label, px.x, px.y + 4);
      }
    }
  }

  /**
   * 导出 Canvas 数据为 Data URL
   */
  toDataURL(format: string = 'image/png', quality: number = 1.0): string {
    if (!this.canvas) {
      throw new Error('MapRenderer 未初始化，请先调用 init()');
    }
    return this.canvas.toDataURL(format, quality);
  }

  // ---- 私有辅助方法 ----

  private getContext(): CanvasRenderingContext2D {
    if (!this.ctx) {
      throw new Error('MapRenderer 未初始化，请先调用 init()');
    }
    return this.ctx;
  }

  private getConfig(): RenderConfig {
    if (!this.config) {
      throw new Error('MapRenderer 未初始化，请先调用 init()');
    }
    return this.config;
  }

  private getCanvasSize() {
    const config = this.getConfig();
    return config.canvasSize;
  }

  private toPixel(point: GeoPoint, config: RenderConfig): PixelPoint {
    return geoToPixel(point, config.bbox, config.canvasSize);
  }

  private drawWaypointMarker(px: PixelPoint, name: string, colorScheme: ColorScheme): void {
    const ctx = this.getContext();

    // 圆形标记
    ctx.beginPath();
    ctx.arc(px.x, px.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = colorScheme.waypointColor;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 名称标签
    if (name) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(name, px.x, px.y - 8);
    }
  }

  private drawSpecialMarker(
    px: PixelPoint,
    label: string,
    _colorScheme: ColorScheme,
    markerColor: string,
  ): void {
    const ctx = this.getContext();

    // 外圈发光
    ctx.beginPath();
    ctx.arc(px.x, px.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = markerColor + '44';
    ctx.fill();

    // 内圈实心
    ctx.beginPath();
    ctx.arc(px.x, px.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = markerColor;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 标签
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, px.x, px.y - 14);
  }
}
