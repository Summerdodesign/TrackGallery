import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Upload } from './Upload';

/** Helper: create a mock File */
function mockFile(name: string, content: string, size?: number): File {
  if (size !== undefined) {
    const buf = new Uint8Array(size);
    return new File([buf], name, { type: 'application/octet-stream' });
  }
  return new File([content], name, { type: 'application/gpx+xml' });
}

const VALID_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="30.0" lon="120.0"></trkpt>
      <trkpt lat="30.1" lon="120.1"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const INVALID_GPX = `<not-gpx>bad content</not-gpx>`;

describe('Upload component', () => {
  it('renders the upload zone with prompt text', () => {
    render(<Upload onUpload={vi.fn()} />);
    expect(screen.getByTestId('upload-zone')).toBeTruthy();
    expect(screen.getByText(/点击选择或拖拽 GPX 文件到此处/)).toBeTruthy();
    expect(screen.getByText(/支持 .gpx 格式，最大 10MB/)).toBeTruthy();
  });

  it('shows loading indicator when isLoading is true', () => {
    render(<Upload onUpload={vi.fn()} isLoading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.getByText(/正在解析 GPX 文件/)).toBeTruthy();
  });

  it('calls onUpload with parsed TrackData on valid GPX file', async () => {
    const onUpload = vi.fn();
    render(<Upload onUpload={onUpload} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = mockFile('track.gpx', VALID_GPX);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledTimes(1);
    });

    const trackData = onUpload.mock.calls[0][0];
    expect(trackData.name).toBe('Test Track');
    expect(trackData.trackPoints).toHaveLength(2);
  });

  it('shows error for non-gpx file extension', async () => {
    const onError = vi.fn();
    render(<Upload onUpload={vi.fn()} onError={onError} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = mockFile('photo.jpg', 'not gpx');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy();
    });
    expect(screen.getByTestId('error-message').textContent).toContain('仅支持 GPX 格式文件');
    expect(onError).toHaveBeenCalled();
  });

  it('shows error for oversized file', async () => {
    const onError = vi.fn();
    render(<Upload onUpload={vi.fn()} onError={onError} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = mockFile('big.gpx', '', 11 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy();
    });
    expect(screen.getByTestId('error-message').textContent).toContain('文件大小超出 10MB 限制');
  });

  it('shows error for invalid GPX content', async () => {
    const onError = vi.fn();
    render(<Upload onUpload={vi.fn()} onError={onError} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = mockFile('bad.gpx', INVALID_GPX);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy();
    });
    expect(onError).toHaveBeenCalled();
  });

  it('handles drag-and-drop with valid file', async () => {
    const onUpload = vi.fn();
    render(<Upload onUpload={onUpload} />);

    const zone = screen.getByTestId('upload-zone');
    const file = mockFile('track.gpx', VALID_GPX);

    const dataTransfer = { files: [file] };

    fireEvent.dragOver(zone, { dataTransfer });
    fireEvent.drop(zone, { dataTransfer });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledTimes(1);
    });
  });

  it('opens file dialog on click', () => {
    render(<Upload onUpload={vi.fn()} />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.click(screen.getByTestId('upload-zone'));
    expect(clickSpy).toHaveBeenCalled();
  });
});
