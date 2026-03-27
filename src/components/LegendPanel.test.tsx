import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegendPanel } from './LegendPanel';
import { PRESET_SCHEMES } from '../constants';

const scheme = PRESET_SCHEMES[0];

describe('LegendPanel', () => {
  it('renders the legend panel', () => {
    render(<LegendPanel colorScheme={scheme} hasWaypoints={true} hasAnnotations={false} />);
    expect(screen.getByTestId('legend-panel')).toBeTruthy();
    expect(screen.getByText('图例')).toBeTruthy();
  });

  it('always shows route and road legend items', () => {
    render(<LegendPanel colorScheme={scheme} hasWaypoints={false} hasAnnotations={false} />);
    expect(screen.getByText('路线轨迹')).toBeTruthy();
    expect(screen.getByText('周围道路')).toBeTruthy();
  });

  it('shows waypoint legend item when hasWaypoints is true', () => {
    render(<LegendPanel colorScheme={scheme} hasWaypoints={true} hasAnnotations={false} />);
    expect(screen.getByText('途径点')).toBeTruthy();
  });

  it('hides waypoint legend item when hasWaypoints is false', () => {
    render(<LegendPanel colorScheme={scheme} hasWaypoints={false} hasAnnotations={false} />);
    expect(screen.queryByText('途径点')).toBeNull();
  });

  it('shows annotation legend item when hasAnnotations is true', () => {
    render(<LegendPanel colorScheme={scheme} hasWaypoints={false} hasAnnotations={true} />);
    expect(screen.getByText('路线标注')).toBeTruthy();
  });
});
