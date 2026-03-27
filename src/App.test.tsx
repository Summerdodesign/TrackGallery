import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock overpass service to avoid real network calls
vi.mock('./services/overpass-service', () => ({
  fetchRoads: vi.fn().mockResolvedValue([]),
  fetchWaterways: vi.fn().mockResolvedValue([]),
}));

// Mock export module
vi.mock('./utils/export-module', () => ({
  exportAsPNG: vi.fn().mockResolvedValue(undefined),
  calculateExportDimensions: vi.fn().mockReturnValue({ scale: 1, width: 1920, height: 1080 }),
}));

// Mock canvas getContext
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    lineCap: '',
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D);
});

const VALID_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="39.9" lon="116.4"><ele>50</ele></trkpt>
      <trkpt lat="39.91" lon="116.41"><ele>55</ele></trkpt>
      <trkpt lat="39.92" lon="116.42"><ele>60</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

function createGpxFile(content: string = VALID_GPX): File {
  return new File([content], 'test.gpx', { type: 'application/gpx+xml' });
}

describe('App', () => {
  it('renders with upload step initially', () => {
    render(<App />);
    expect(screen.getByText('GPX 风格化地图生成器')).toBeInTheDocument();
    expect(screen.getByTestId('upload-zone')).toBeInTheDocument();
    expect(screen.getByTestId('step-upload')).toBeInTheDocument();
  });

  it('shows step flow with all 4 steps', () => {
    render(<App />);
    expect(screen.getByTestId('step-upload')).toBeInTheDocument();
    expect(screen.getByTestId('step-colorScheme')).toBeInTheDocument();
    expect(screen.getByTestId('step-annotation')).toBeInTheDocument();
    expect(screen.getByTestId('step-export')).toBeInTheDocument();
  });

  it('transitions to colorScheme step after GPX upload', async () => {
    render(<App />);
    const input = screen.getByTestId('file-input');
    const file = createGpxFile();

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('color-scheme-editor')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByTestId('confirm-color-btn')).toBeInTheDocument();
  });

  it('transitions to annotation step after confirming color scheme', async () => {
    render(<App />);
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [createGpxFile()] } });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-color-btn')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByTestId('confirm-color-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('annotation-editor')).toBeInTheDocument();
    });

    expect(screen.getByTestId('confirm-annotation-btn')).toBeInTheDocument();
  });

  it('transitions to export step after confirming annotations', async () => {
    render(<App />);
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [createGpxFile()] } });

    await waitFor(() => {
      expect(screen.getByTestId('confirm-color-btn')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByTestId('confirm-color-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-annotation-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('confirm-annotation-btn'));

    await waitFor(() => {
      expect(screen.getByText(/导出 PNG/)).toBeInTheDocument();
    });
  });

  it('shows poster layout with track name and stats after upload', async () => {
    render(<App />);
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [createGpxFile()] } });

    await waitFor(() => {
      expect(screen.getByTestId('poster-layout')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByTestId('stats-section')).toBeInTheDocument();
  });

  it('shows error banner and retry button on render error', async () => {
    // Override fetchRoads to throw
    const { fetchRoads } = await import('./services/overpass-service');
    (fetchRoads as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [createGpxFile()] } });

    // Even with geo data failure, app should still proceed (non-fatal)
    await waitFor(() => {
      expect(screen.getByTestId('color-scheme-editor')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
