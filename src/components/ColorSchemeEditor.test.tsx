import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorSchemeEditor } from './ColorSchemeEditor';
import { PRESET_SCHEMES } from '../constants';
import type { ColorScheme } from '../types';

const defaultScheme: ColorScheme = { ...PRESET_SCHEMES[0] };

function renderEditor(overrides?: Partial<{ colorScheme: ColorScheme; onChange: ReturnType<typeof vi.fn>; onRouteWidthChange: ReturnType<typeof vi.fn> }>) {
  const onChange = overrides?.onChange ?? vi.fn();
  const onRouteWidthChange = overrides?.onRouteWidthChange ?? vi.fn();
  const colorScheme = overrides?.colorScheme ?? defaultScheme;
  render(
    <ColorSchemeEditor
      colorScheme={colorScheme}
      presets={PRESET_SCHEMES}
      onChange={onChange}
      routeWidth={2.5}
      onRouteWidthChange={onRouteWidthChange}
      roadWidth={3}
      onRoadWidthChange={vi.fn()}
      waterWidth={4}
      onWaterWidthChange={vi.fn()}
    />,
  );
  return { onChange, onRouteWidthChange };
}

describe('ColorSchemeEditor', () => {
  it('renders all 6 color fields with Chinese labels', () => {
    renderEditor();
    const labels = ['背景色', '路线颜色', '道路肌理颜色', '水系颜色', '途径点标记颜色', '标题文字颜色'];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('renders preset buttons for each preset scheme', () => {
    renderEditor();
    for (const preset of PRESET_SCHEMES) {
      expect(screen.getByTestId(`preset-${preset.id}`)).toBeTruthy();
      expect(screen.getByText(preset.name)).toBeTruthy();
    }
  });

  it('calls onChange with full preset when a preset button is clicked', () => {
    const { onChange } = renderEditor();
    const target = PRESET_SCHEMES[1]; // 午夜蓝
    fireEvent.click(screen.getByTestId(`preset-${target.id}`));
    expect(onChange).toHaveBeenCalledWith(target);
  });

  it('displays current hex value in each text input', () => {
    renderEditor();
    const bgInput = screen.getByTestId('hex-input-background') as HTMLInputElement;
    expect(bgInput.value).toBe(defaultScheme.background);
    const routeInput = screen.getByTestId('hex-input-routeColor') as HTMLInputElement;
    expect(routeInput.value).toBe(defaultScheme.routeColor);
  });

  it('calls onChange when color picker value changes', () => {
    const { onChange } = renderEditor();
    const picker = screen.getByTestId('color-picker-background') as HTMLInputElement;
    fireEvent.change(picker, { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultScheme, background: '#ff0000' });
  });

  it('calls onChange with valid hex input', () => {
    const { onChange } = renderEditor();
    const input = screen.getByTestId('hex-input-routeColor') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#AABBCC' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultScheme, routeColor: '#AABBCC' });
  });

  it('does NOT call onChange with invalid hex input (keeps previous value)', () => {
    const { onChange } = renderEditor();
    const input = screen.getByTestId('hex-input-routeColor') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'not-a-color' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does NOT call onChange for partial hex input', () => {
    const { onChange } = renderEditor();
    const input = screen.getByTestId('hex-input-waterColor') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#FFF' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders all 6 color picker inputs and width sliders', () => {
    renderEditor();
    const keys = ['background', 'routeColor', 'roadColor', 'waterColor', 'waypointColor', 'titleColor'];
    for (const key of keys) {
      expect(screen.getByTestId(`color-picker-${key}`)).toBeTruthy();
      expect(screen.getByTestId(`hex-input-${key}`)).toBeTruthy();
    }
    expect(screen.getByTestId('route-width-slider')).toBeTruthy();
    expect(screen.getByTestId('road-width-slider')).toBeTruthy();
    expect(screen.getByTestId('water-width-slider')).toBeTruthy();
  });

  it('highlights the currently active preset button', () => {
    renderEditor({ colorScheme: PRESET_SCHEMES[1] });
    const activeBtn = screen.getByTestId(`preset-${PRESET_SCHEMES[1].id}`);
    expect(activeBtn.style.border).toContain('2px solid');
  });
});
