import { describe, it, expect } from 'vitest';
import { PRESET_SCHEMES, ANNOTATION_ICONS } from '../constants';
import type { ColorScheme, AnnotationIcon } from './index';

describe('预设配色方案', () => {
  it('应包含至少 3 套预设方案', () => {
    expect(PRESET_SCHEMES.length).toBeGreaterThanOrEqual(3);
  });

  it('每套方案应包含所有 7 个颜色字段', () => {
    const colorFields: (keyof ColorScheme)[] = [
      'background', 'routeColor', 'routeGlow',
      'roadColor', 'waterColor', 'waypointColor', 'titleColor',
    ];
    for (const scheme of PRESET_SCHEMES) {
      for (const field of colorFields) {
        expect(scheme[field]).toBeDefined();
        expect(typeof scheme[field]).toBe('string');
        expect(scheme[field].length).toBeGreaterThan(0);
      }
    }
  });

  it('每套方案应有唯一的 id 和 name', () => {
    const ids = PRESET_SCHEMES.map(s => s.id);
    const names = PRESET_SCHEMES.map(s => s.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('预设标注图标', () => {
  it('应包含至少 10 种图标类型', () => {
    expect(ANNOTATION_ICONS.length).toBeGreaterThanOrEqual(10);
  });

  it('应包含 12 种预设图标类型', () => {
    expect(ANNOTATION_ICONS.length).toBe(12);
  });

  it('每种图标应有唯一的 type', () => {
    const types = ANNOTATION_ICONS.map(i => i.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('应包含必要的图标类型', () => {
    const types = ANNOTATION_ICONS.map(i => i.type);
    const required: AnnotationIcon[] = [
      'landmark', 'restaurant', 'supply', 'scenic',
      'mountain', 'start', 'finish',
    ];
    for (const t of required) {
      expect(types).toContain(t);
    }
  });
});
