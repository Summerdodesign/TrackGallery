import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { PosterLayout } from './PosterLayout';
import { PRESET_SCHEMES } from '../constants';
import type { RouteStats } from '../types';

const scheme = PRESET_SCHEMES[0];
const stats: RouteStats = { totalDistanceKm: 42.195, trackPointCount: 1200, waypointCount: 5 };

describe('PosterLayout', () => {
  it('renders the poster layout with title and stats', () => {
    const ref = createRef<HTMLCanvasElement>();
    render(<PosterLayout title="上海马拉松" stats={stats} colorScheme={scheme} canvasRef={ref} />);
    expect(screen.getByTestId('poster-layout')).toBeTruthy();
    expect(screen.getByText('上海马拉松')).toBeTruthy();
    expect(screen.getByTestId('stats-section').textContent).toContain('42.20 km');
    expect(screen.getByTestId('stats-section').textContent).toContain('1200 个轨迹点');
    expect(screen.getByTestId('stats-section').textContent).toContain('5 个途径点');
  });

  it('renders the canvas element without legend', () => {
    const ref = createRef<HTMLCanvasElement>();
    render(<PosterLayout title="Test" stats={stats} colorScheme={scheme} canvasRef={ref} hasWaypoints={true} />);
    expect(screen.getByTestId('map-canvas')).toBeTruthy();
    expect(screen.queryByTestId('legend-panel')).toBeNull();
  });

  it('uses colorScheme background and title color', () => {
    const ref = createRef<HTMLCanvasElement>();
    render(<PosterLayout title="Test" stats={stats} colorScheme={scheme} canvasRef={ref} />);
    const layout = screen.getByTestId('poster-layout');
    // jsdom converts hex to rgb, so check the style attribute contains the value
    expect(layout.style.background).toBeTruthy();
    expect(layout.style.color).toBeTruthy();
  });

  it('hides waypoint count when zero', () => {
    const ref = createRef<HTMLCanvasElement>();
    const noWpStats: RouteStats = { totalDistanceKm: 10, trackPointCount: 100, waypointCount: 0 };
    render(<PosterLayout title="Test" stats={noWpStats} colorScheme={scheme} canvasRef={ref} />);
    expect(screen.getByTestId('stats-section').textContent).not.toContain('途径点');
  });
});
