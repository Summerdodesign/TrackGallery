import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationEditor, findNearestTrackPoint } from './AnnotationEditor';
import type { GeoPoint, RouteAnnotation, PixelPoint } from '../types';

const TRACK_POINTS: GeoPoint[] = [
  { lat: 30.0, lon: 120.0 },
  { lat: 30.1, lon: 120.1 },
  { lat: 30.2, lon: 120.2 },
];

const SAMPLE_ANNOTATION: RouteAnnotation = {
  id: 'ann-1',
  position: { lat: 30.0, lon: 120.0 },
  icon: 'landmark',
  label: '起点标注',
};

describe('findNearestTrackPoint', () => {
  it('returns -1 for empty array', () => {
    expect(findNearestTrackPoint({ x: 0, y: 0 }, [])).toBe(-1);
  });

  it('returns 0 for single point', () => {
    expect(findNearestTrackPoint({ x: 5, y: 5 }, [{ x: 10, y: 10 }])).toBe(0);
  });

  it('returns the index of the nearest point', () => {
    const points: PixelPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    ];
    expect(findNearestTrackPoint({ x: 9, y: 9 }, points)).toBe(1);
    expect(findNearestTrackPoint({ x: 1, y: 1 }, points)).toBe(0);
    expect(findNearestTrackPoint({ x: 99, y: 99 }, points)).toBe(2);
  });
});

describe('AnnotationEditor component', () => {
  it('renders with add mode toggle button', () => {
    render(
      <AnnotationEditor annotations={[]} trackPoints={TRACK_POINTS} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId('annotation-editor')).toBeTruthy();
    expect(screen.getByTestId('add-mode-toggle')).toBeTruthy();
    expect(screen.getByTestId('add-mode-toggle').textContent).toContain('添加标注');
  });

  it('toggles add mode on button click', () => {
    render(
      <AnnotationEditor annotations={[]} trackPoints={TRACK_POINTS} onChange={vi.fn()} />,
    );
    const btn = screen.getByTestId('add-mode-toggle');
    fireEvent.click(btn);
    expect(btn.textContent).toContain('退出添加模式');
    expect(screen.getByTestId('add-mode-hint')).toBeTruthy();

    fireEvent.click(btn);
    expect(btn.textContent).toContain('添加标注');
  });

  it('displays existing annotations with edit and delete buttons', () => {
    render(
      <AnnotationEditor
        annotations={[SAMPLE_ANNOTATION]}
        trackPoints={TRACK_POINTS}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('annotation-list')).toBeTruthy();
    expect(screen.getByTestId(`annotation-item-${SAMPLE_ANNOTATION.id}`)).toBeTruthy();
    expect(screen.getByTestId(`edit-btn-${SAMPLE_ANNOTATION.id}`)).toBeTruthy();
    expect(screen.getByTestId(`delete-btn-${SAMPLE_ANNOTATION.id}`)).toBeTruthy();
    expect(screen.getByText('起点标注')).toBeTruthy();
  });

  it('deletes an annotation when delete button is clicked', () => {
    const onChange = vi.fn();
    render(
      <AnnotationEditor
        annotations={[SAMPLE_ANNOTATION]}
        trackPoints={TRACK_POINTS}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId(`delete-btn-${SAMPLE_ANNOTATION.id}`));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('opens edit panel when editing an existing annotation', () => {
    render(
      <AnnotationEditor
        annotations={[SAMPLE_ANNOTATION]}
        trackPoints={TRACK_POINTS}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`edit-btn-${SAMPLE_ANNOTATION.id}`));
    expect(screen.getByTestId('edit-panel')).toBeTruthy();
    expect(screen.getByTestId('icon-grid')).toBeTruthy();
    expect(screen.getByTestId('label-input')).toBeTruthy();
    expect((screen.getByTestId('label-input') as HTMLInputElement).value).toBe('起点标注');
  });

  it('shows all 12 icon options in the edit panel', () => {
    render(
      <AnnotationEditor
        annotations={[SAMPLE_ANNOTATION]}
        trackPoints={TRACK_POINTS}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`edit-btn-${SAMPLE_ANNOTATION.id}`));
    const icons = [
      'landmark', 'restaurant', 'supply', 'scenic', 'mountain', 'start',
      'finish', 'camp', 'photo', 'warning', 'water', 'rest',
    ];
    for (const icon of icons) {
      expect(screen.getByTestId(`icon-option-${icon}`)).toBeTruthy();
    }
  });

  it('updates annotation icon and label on save', () => {
    const onChange = vi.fn();
    render(
      <AnnotationEditor
        annotations={[SAMPLE_ANNOTATION]}
        trackPoints={TRACK_POINTS}
        onChange={onChange}
      />,
    );
    // Open edit panel
    fireEvent.click(screen.getByTestId(`edit-btn-${SAMPLE_ANNOTATION.id}`));
    // Change icon
    fireEvent.click(screen.getByTestId('icon-option-restaurant'));
    // Change label
    fireEvent.change(screen.getByTestId('label-input'), { target: { value: '午餐点' } });
    // Save
    fireEvent.click(screen.getByTestId('save-btn'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0];
    expect(updated).toHaveLength(1);
    expect(updated[0].icon).toBe('restaurant');
    expect(updated[0].label).toBe('午餐点');
  });

  it('closes edit panel on cancel', () => {
    render(
      <AnnotationEditor
        annotations={[SAMPLE_ANNOTATION]}
        trackPoints={TRACK_POINTS}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`edit-btn-${SAMPLE_ANNOTATION.id}`));
    expect(screen.getByTestId('edit-panel')).toBeTruthy();
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(screen.queryByTestId('edit-panel')).toBeNull();
  });

  it('enforces max 50 character limit on label input', () => {
    render(
      <AnnotationEditor
        annotations={[SAMPLE_ANNOTATION]}
        trackPoints={TRACK_POINTS}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId(`edit-btn-${SAMPLE_ANNOTATION.id}`));
    const input = screen.getByTestId('label-input') as HTMLInputElement;
    expect(input.maxLength).toBe(50);
  });
});
