import type { ColorScheme } from '../types';

export interface LegendPanelProps {
  colorScheme: ColorScheme;
  hasWaypoints: boolean;
  hasAnnotations: boolean;
}

export function LegendPanel({ colorScheme, hasWaypoints, hasAnnotations }: LegendPanelProps) {
  return (
    <div
      data-testid="legend-panel"
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>图例</div>

      {/* 路线轨迹 */}
      <LegendItem color={colorScheme.routeColor} label="路线轨迹" type="line" />

      {/* 途径点 */}
      {hasWaypoints && (
        <LegendItem color={colorScheme.waypointColor} label="途径点" type="dot" />
      )}

      {/* 周围道路 */}
      <LegendItem color={colorScheme.roadColor} label="周围道路" type="line" />

      {/* 标注 */}
      {hasAnnotations && (
        <LegendItem color="#FFFFFF" label="路线标注" type="dot" />
      )}
    </div>
  );
}

function LegendItem({ color, label, type }: { color: string; label: string; type: 'line' | 'dot' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      {type === 'line' ? (
        <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
      ) : (
        <div style={{ width: 8, height: 8, background: color, borderRadius: '50%' }} />
      )}
      <span style={{ fontSize: 11, color: '#ccc' }}>{label}</span>
    </div>
  );
}
