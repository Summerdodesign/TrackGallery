import type { GeoPoint, Waypoint, TrackData, ValidationResult } from '../types';

/**
 * GPX 文件解析器
 * 支持 GPX 1.0 和 1.1 格式的解析、格式化和验证
 */
export class GPXParser {
  /**
   * 解析 GPX XML 字符串为 TrackData
   * 提取轨迹点 (trk/trkseg/trkpt) 和途径点 (wpt)，保持顺序
   */
  parse(gpxContent: string): TrackData {
    const normalized = this.normalizeGpxContent(gpxContent);
    const parser = new DOMParser();
    const doc = parser.parseFromString(normalized, 'application/xml');

    // 检查 XML 解析错误
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { name: '', trackPoints: [], waypoints: [] };
    }

    const name = this.extractTrackName(doc);
    const trackPoints = this.extractTrackPoints(doc);
    const waypoints = this.extractWaypoints(doc);

    return { name, trackPoints, waypoints };
  }

  /**
   * 将 TrackData 格式化为 Pretty Print 的 GPX XML 字符串
   */
  format(trackData: TrackData): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<gpx version="1.1" creator="GPX Stylized Map Generator"');
    lines.push('     xmlns="http://www.topografix.com/GPX/1/1">');

    // 输出途径点
    for (const wpt of trackData.waypoints) {
      lines.push(`  <wpt lat="${wpt.position.lat}" lon="${wpt.position.lon}">`);
      if (wpt.position.ele !== undefined) {
        lines.push(`    <ele>${wpt.position.ele}</ele>`);
      }
      lines.push(`    <name>${this.escapeXml(wpt.name)}</name>`);
      lines.push('  </wpt>');
    }

    // 输出轨迹
    lines.push('  <trk>');
    lines.push(`    <name>${this.escapeXml(trackData.name)}</name>`);
    lines.push('    <trkseg>');
    for (const pt of trackData.trackPoints) {
      lines.push(`      <trkpt lat="${pt.lat}" lon="${pt.lon}">`);
      if (pt.ele !== undefined) {
        lines.push(`        <ele>${pt.ele}</ele>`);
      }
      lines.push('      </trkpt>');
    }
    lines.push('    </trkseg>');
    lines.push('  </trk>');

    lines.push('</gpx>');
    return lines.join('\n');
  }

  /**
   * 验证 GPX XML 合法性和轨迹数据存在性
   * 返回 ValidationResult，不抛出异常
   */
  validate(gpxContent: string): ValidationResult {
    const errors: string[] = [];
    const normalized = this.normalizeGpxContent(gpxContent);

    // 验证 XML 合法性
    const parser = new DOMParser();
    const doc = parser.parseFromString(normalized, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { valid: false, errors: ['GPX 文件格式不合法'] };
    }

    // 验证根元素是 gpx
    const gpxRoot = doc.documentElement;
    if (gpxRoot.tagName.toLowerCase() !== 'gpx') {
      return { valid: false, errors: ['GPX 文件格式不合法'] };
    }

    // 验证轨迹数据存在性
    const trks = this.getElementsByTagNameNS(doc, 'trk');
    if (trks.length === 0) {
      errors.push('GPX 文件不包含轨迹数据');
      return { valid: false, errors };
    }

    // 验证轨迹段包含轨迹点
    let hasTrackPoints = false;
    for (const trk of trks) {
      const trksegs = this.getChildElementsByTagName(trk, 'trkseg');
      for (const trkseg of trksegs) {
        const trkpts = this.getChildElementsByTagName(trkseg, 'trkpt');
        if (trkpts.length > 0) {
          hasTrackPoints = true;
          break;
        }
      }
      if (hasTrackPoints) break;
    }

    if (!hasTrackPoints) {
      errors.push('轨迹段不包含任何轨迹点');
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  // --- 私有辅助方法 ---

  /**
   * 修复不完整的 GPX 内容：
   * - 补全缺失的 XML 声明和 <gpx> 根元素
   * - 截断 </gpx> 之后的垃圾数据
   */
  private normalizeGpxContent(content: string): string {
    let normalized = content.trim();

    // 截断 </gpx> 之后的所有内容
    const gpxCloseIndex = normalized.indexOf('</gpx>');
    if (gpxCloseIndex !== -1) {
      normalized = normalized.substring(0, gpxCloseIndex + '</gpx>'.length);
    }

    // 如果内容不以 <?xml 或 <gpx 开头，尝试补全
    if (!normalized.startsWith('<?xml') && !normalized.startsWith('<gpx')) {
      // 检查是否包含 trkpt/trkseg/trk 等 GPX 元素
      if (normalized.includes('<trkpt') || normalized.includes('<trkseg') || normalized.includes('<trk')) {
        // 补全缺失的包裹元素
        if (!normalized.includes('<trkseg')) {
          normalized = `<trkseg>${normalized}</trkseg>`;
        }
        if (!normalized.includes('<trk')) {
          normalized = `<trk><name>GPX Track</name>${normalized}</trk>`;
        }
        normalized = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">${normalized}</gpx>`;
      }
    } else if (normalized.startsWith('<gpx') && !normalized.startsWith('<?xml')) {
      normalized = `<?xml version="1.0" encoding="UTF-8"?>\n${normalized}`;
    }

    return normalized;
  }

  private extractTrackName(doc: Document): string {
    // 尝试从 trk/name 获取名称
    const trks = this.getElementsByTagNameNS(doc, 'trk');
    for (const trk of trks) {
      const nameEl = this.getFirstChildElementByTagName(trk, 'name');
      if (nameEl?.textContent) {
        return nameEl.textContent.trim();
      }
    }

    // 尝试从 metadata/name 获取
    const metadatas = this.getElementsByTagNameNS(doc, 'metadata');
    for (const metadata of metadatas) {
      const nameEl = this.getFirstChildElementByTagName(metadata, 'name');
      if (nameEl?.textContent) {
        return nameEl.textContent.trim();
      }
    }

    return '';
  }

  private extractTrackPoints(doc: Document): GeoPoint[] {
    const points: GeoPoint[] = [];
    const trks = this.getElementsByTagNameNS(doc, 'trk');

    for (const trk of trks) {
      const trksegs = this.getChildElementsByTagName(trk, 'trkseg');
      for (const trkseg of trksegs) {
        const trkpts = this.getChildElementsByTagName(trkseg, 'trkpt');
        for (const trkpt of trkpts) {
          const point = this.parseGeoPoint(trkpt);
          if (point) {
            points.push(point);
          }
        }
      }
    }

    return points;
  }

  private extractWaypoints(doc: Document): Waypoint[] {
    const waypoints: Waypoint[] = [];
    const wpts = this.getElementsByTagNameNS(doc, 'wpt');

    for (const wpt of wpts) {
      const point = this.parseGeoPoint(wpt);
      if (!point) continue;

      const nameEl = this.getFirstChildElementByTagName(wpt, 'name');
      const name = nameEl?.textContent?.trim() ?? '';

      waypoints.push({ name, position: point });
    }

    return waypoints;
  }

  private parseGeoPoint(element: Element): GeoPoint | null {
    const latStr = element.getAttribute('lat');
    const lonStr = element.getAttribute('lon');
    if (!latStr || !lonStr) return null;

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) return null;

    const point: GeoPoint = { lat, lon };

    const eleEl = this.getFirstChildElementByTagName(element, 'ele');
    if (eleEl?.textContent) {
      const ele = parseFloat(eleEl.textContent.trim());
      if (!isNaN(ele)) {
        point.ele = ele;
      }
    }

    return point;
  }

  /**
   * 跨命名空间获取元素 — 同时支持 GPX 1.0（无命名空间）和 1.1（有命名空间）
   */
  private getElementsByTagNameNS(parent: Document | Element, tagName: string): Element[] {
    // 先尝试带命名空间（GPX 1.1）
    const ns11 = 'http://www.topografix.com/GPX/1/1';
    let elements = Array.from(parent.getElementsByTagNameNS(ns11, tagName));
    if (elements.length > 0) return elements;

    // 再尝试 GPX 1.0 命名空间
    const ns10 = 'http://www.topografix.com/GPX/1/0';
    elements = Array.from(parent.getElementsByTagNameNS(ns10, tagName));
    if (elements.length > 0) return elements;

    // 最后尝试无命名空间
    elements = Array.from(parent.getElementsByTagName(tagName));
    return elements;
  }

  private getChildElementsByTagName(parent: Element, tagName: string): Element[] {
    const results: Element[] = [];
    for (const child of Array.from(parent.children)) {
      if (child.localName === tagName) {
        results.push(child);
      }
    }
    return results;
  }

  private getFirstChildElementByTagName(parent: Element, tagName: string): Element | null {
    for (const child of Array.from(parent.children)) {
      if (child.localName === tagName) {
        return child;
      }
    }
    return null;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
