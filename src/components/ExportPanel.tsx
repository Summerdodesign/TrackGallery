import { useState, useCallback } from 'react';

export type ExportFormat = 'png' | 'jpg' | 'svg';

export interface ExportLayers {
  background: boolean;
  route: boolean;
  roads: boolean;
  water: boolean;
}

export interface ExportSettings {
  format: ExportFormat;
  layers: ExportLayers;
  width: number;
  height: number;
}

interface ExportPanelProps {
  isLoading: boolean;
  onExport: (settings: ExportSettings) => void;
  layers: ExportLayers;
  onLayersChange: (layers: ExportLayers) => void;
}

const SIZE_PRESETS = [
  { label: '4K (4096×4096)', w: 4096, h: 4096 },
  { label: '打印 1.2m (14173×14173)', w: 14173, h: 14173 },
  { label: '2K (2048×2048)', w: 2048, h: 2048 },
  { label: '1080p (1080×1080)', w: 1080, h: 1080 },
];

export function ExportPanel({ isLoading, onExport, layers, onLayersChange }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [width, setWidth] = useState(4096);
  const [height, setHeight] = useState(4096);
  const [lockRatio, setLockRatio] = useState(true);

  const handleWidthChange = useCallback((v: number) => {
    setWidth(v);
    if (lockRatio) setHeight(v);
  }, [lockRatio]);

  const handleHeightChange = useCallback((v: number) => {
    setHeight(v);
    if (lockRatio) setWidth(v);
  }, [lockRatio]);

  const handlePreset = useCallback((w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  }, []);

  const handleExport = useCallback(() => {
    onExport({ format, layers, width, height });
  }, [format, layers, width, height, onExport]);

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 文件格式 */}
      <div>
        <div style={labelStyle}>文件格式</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['png', 'jpg', 'svg'] as ExportFormat[]).map(f => (
            <button key={f} onClick={() => setFormat(f)} style={{
              padding: '5px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: format === f ? '2px solid #4a9eff' : '1px solid #555',
              background: format === f ? 'rgba(74,158,255,0.15)' : '#2a2a2a',
              color: format === f ? '#4a9eff' : '#ccc',
            }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 图层选择 */}
      <div>
        <div style={labelStyle}>导出图层</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {([
            { key: 'background' as const, label: '背景' },
            { key: 'route' as const, label: '轨迹路线' },
            { key: 'roads' as const, label: '道路肌理' },
            { key: 'water' as const, label: '水系' },
          ]).map(({ key, label }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => onLayersChange({ ...layers, [key]: !layers[key] })}
                style={{ accentColor: '#4a9eff' }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* 尺寸预设 */}
      <div>
        <div style={labelStyle}>图片尺寸</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {SIZE_PRESETS.map(p => (
            <button key={p.label} onClick={() => handlePreset(p.w, p.h)} style={{
              padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
              border: (width === p.w && height === p.h) ? '1px solid #4a9eff' : '1px solid #444',
              background: (width === p.w && height === p.h) ? 'rgba(74,158,255,0.1)' : '#2a2a2a',
              color: '#aaa',
            }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* 自定义尺寸 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" value={width} min={100} max={20000}
            onChange={e => handleWidthChange(Math.max(100, parseInt(e.target.value) || 100))}
            style={numInputStyle} />
          <span style={{ color: '#666' }}>×</span>
          <input type="number" value={height} min={100} max={20000}
            onChange={e => handleHeightChange(Math.max(100, parseInt(e.target.value) || 100))}
            style={numInputStyle} />
          <span style={{ color: '#888', fontSize: 12 }}>px</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#888', cursor: 'pointer' }}>
          <input type="checkbox" checked={lockRatio} onChange={() => setLockRatio(p => !p)} style={{ accentColor: '#4a9eff' }} />
          锁定 1:1 比例
        </label>
      </div>

      {/* 导出按钮 */}
      <button onClick={handleExport} disabled={isLoading} style={{
        padding: '10px 0', borderRadius: 8, border: 'none',
        background: isLoading ? '#555' : '#4a9eff', color: '#fff',
        fontSize: 15, fontWeight: 600, cursor: isLoading ? 'wait' : 'pointer',
      }}>
        {isLoading ? '导出中…' : `导出 ${format.toUpperCase()}`}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: '#aaa', marginBottom: 6 };
const numInputStyle: React.CSSProperties = {
  width: 80, padding: '4px 8px', borderRadius: 4,
  border: '1px solid #555', background: '#2a2a2a', color: '#eee',
  fontSize: 13, fontFamily: 'monospace',
};
