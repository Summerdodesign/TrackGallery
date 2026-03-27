import type { RefObject } from 'react';
import type { ColorScheme, RouteStats } from '../types';

export interface PosterLayoutProps {
  title: string;
  stats: RouteStats;
  colorScheme: ColorScheme;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hasWaypoints?: boolean;
  hasAnnotations?: boolean;
}

export function PosterLayout({
  title,
  stats,
  colorScheme,
  canvasRef,
  hasWaypoints = false,
  hasAnnotations = false,
}: PosterLayoutProps) {
  return (
    <div
      data-testid="poster-layout"
      style={{
        background: colorScheme.background,
        color: colorScheme.titleColor,
        position: 'relative',
        width: '100%',
      }}
    >
      {/* 标题区域 */}
      <div data-testid="title-section" style={{ padding: '24px 24px 8px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
          {title}
        </h1>
        <div data-testid="stats-section" style={{ marginTop: 8, fontSize: 13, color: colorScheme.titleColor + 'AA' }}>
          总距离 {stats.totalDistanceKm.toFixed(2)} km · {stats.trackPointCount} 个轨迹点
          {stats.waypointCount > 0 && ` · ${stats.waypointCount} 个途径点`}
        </div>
      </div>

      {/* 地图区域 */}
      <div data-testid="map-section" style={{ position: 'relative', padding: '8px 0' }}>
        <canvas ref={canvasRef} data-testid="map-canvas" style={{ display: 'block', width: '100%' }} />
      </div>
    </div>
  );
}
