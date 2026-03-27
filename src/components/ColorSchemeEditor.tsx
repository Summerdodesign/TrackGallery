import { useCallback } from 'react';
import type { ColorScheme } from '../types';
import { isValidHexColor } from '../utils/color-validator';

export interface ColorSchemeEditorProps {
  colorScheme: ColorScheme;
  presets: ColorScheme[];
  onChange: (scheme: ColorScheme) => void;
  routeWidth: number;
  onRouteWidthChange: (width: number) => void;
  roadWidth: number;
  onRoadWidthChange: (width: number) => void;
  waterWidth: number;
  onWaterWidthChange: (width: number) => void;
  smoothness: number;
  onSmoothnessChange: (value: number) => void;
  annotationFontSize: number;
  onAnnotationFontSizeChange: (size: number) => void;
}

/** Color field key → Chinese label mapping (no glow) */
const COLOR_FIELDS: { key: keyof ColorScheme; label: string }[] = [
  { key: 'background', label: '背景色' },
  { key: 'routeColor', label: '路线颜色' },
  { key: 'roadColor', label: '道路肌理颜色' },
  { key: 'waterColor', label: '水系颜色' },
  { key: 'waypointColor', label: '途径点标记颜色' },
  { key: 'titleColor', label: '标题文字颜色' },
];

export function ColorSchemeEditor({ colorScheme, presets, onChange, routeWidth, onRouteWidthChange, roadWidth, onRoadWidthChange, waterWidth, onWaterWidthChange, smoothness, onSmoothnessChange, annotationFontSize, onAnnotationFontSizeChange }: ColorSchemeEditorProps) {
  const handleColorChange = useCallback(
    (key: keyof ColorScheme, value: string) => {
      onChange({ ...colorScheme, [key]: value });
    },
    [colorScheme, onChange],
  );

  const handleHexInput = useCallback(
    (key: keyof ColorScheme, value: string) => {
      // Normalize: add # prefix if user forgot it
      const normalized = value.startsWith('#') ? value : `#${value}`;
      if (isValidHexColor(normalized)) {
        onChange({ ...colorScheme, [key]: normalized });
      }
      // Invalid input → keep previous valid value (no-op)
    },
    [colorScheme, onChange],
  );

  const handlePresetSelect = useCallback(
    (preset: ColorScheme) => {
      onChange(preset);
    },
    [onChange],
  );

  return (
    <div data-testid="color-scheme-editor" style={{ padding: 16 }}>
      {/* Preset scheme buttons */}
      <div data-testid="preset-section" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>预设配色方案</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              data-testid={`preset-${preset.id}`}
              onClick={() => handlePresetSelect(preset)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: colorScheme.id === preset.id ? '2px solid #4a9eff' : '1px solid #555',
                background: preset.background,
                color: preset.titleColor,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 7 color pickers */}
      <div data-testid="color-fields" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {COLOR_FIELDS.map(({ key, label }) => (
          <div
            key={key}
            data-testid={`color-field-${key}`}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <label style={{ width: 120, fontSize: 13, color: '#ccc', flexShrink: 0 }}>
              {label}
            </label>
            <input
              type="color"
              data-testid={`color-picker-${key}`}
              value={(colorScheme[key] as string).substring(0, 7)}
              onChange={(e) => handleColorChange(key, e.target.value)}
              style={{ width: 36, height: 28, border: 'none', cursor: 'pointer', background: 'transparent' }}
            />
            <input
              type="text"
              data-testid={`hex-input-${key}`}
              value={colorScheme[key] as string}
              onChange={(e) => handleHexInput(key, e.target.value)}
              placeholder="#000000"
              style={{
                width: 90,
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #555',
                background: '#2a2a2a',
                color: '#eee',
                fontSize: 13,
                fontFamily: 'monospace',
              }}
            />
          </div>
        ))}
      </div>
      {/* Route width slider */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ width: 120, fontSize: 13, color: '#ccc', flexShrink: 0 }}>路线粗细</label>
          <input type="range" data-testid="route-width-slider" min={1} max={20} step={0.5} value={routeWidth} onChange={(e) => onRouteWidthChange(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#ccc', minWidth: 36, textAlign: 'right' }}>{routeWidth}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ width: 120, fontSize: 13, color: '#ccc', flexShrink: 0 }}>道路粗细</label>
          <input type="range" data-testid="road-width-slider" min={0.5} max={15} step={0.5} value={roadWidth} onChange={(e) => onRoadWidthChange(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#ccc', minWidth: 36, textAlign: 'right' }}>{roadWidth}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ width: 120, fontSize: 13, color: '#ccc', flexShrink: 0 }}>水系粗细</label>
          <input type="range" data-testid="water-width-slider" min={0.5} max={15} step={0.5} value={waterWidth} onChange={(e) => onWaterWidthChange(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#ccc', minWidth: 36, textAlign: 'right' }}>{waterWidth}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ width: 120, fontSize: 13, color: '#ccc', flexShrink: 0 }}>轨迹平滑度</label>
          <input type="range" data-testid="smoothness-slider" min={0} max={5} step={1} value={smoothness} onChange={(e) => onSmoothnessChange(parseInt(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#ccc', minWidth: 36, textAlign: 'right' }}>{smoothness === 0 ? '原始' : `${smoothness}级`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ width: 120, fontSize: 13, color: '#ccc', flexShrink: 0 }}>标注字体</label>
          <input type="range" data-testid="annotation-font-slider" min={24} max={300} step={6} value={annotationFontSize} onChange={(e) => onAnnotationFontSizeChange(parseInt(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#ccc', minWidth: 42, textAlign: 'right' }}>{annotationFontSize}px</span>
        </div>
      </div>
    </div>
  );
}
