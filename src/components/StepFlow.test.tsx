import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepFlow } from './StepFlow';

describe('StepFlow', () => {
  it('renders all 4 step buttons with Chinese labels', () => {
    render(<StepFlow currentStep="upload" onStepChange={vi.fn()} />);
    expect(screen.getByTestId('step-upload')).toBeTruthy();
    expect(screen.getByTestId('step-colorScheme')).toBeTruthy();
    expect(screen.getByTestId('step-annotation')).toBeTruthy();
    expect(screen.getByTestId('step-export')).toBeTruthy();
    expect(screen.getByText('上传文件')).toBeTruthy();
    expect(screen.getByText('选择配色')).toBeTruthy();
    expect(screen.getByText('添加标注')).toBeTruthy();
    expect(screen.getByText('导出图片')).toBeTruthy();
  });

  it('highlights the current step', () => {
    render(<StepFlow currentStep="colorScheme" onStepChange={vi.fn()} />);
    const btn = screen.getByTestId('step-colorScheme');
    expect(btn.style.border).toContain('2px solid');
  });

  it('calls onStepChange when clicking the next valid step', () => {
    const onChange = vi.fn();
    render(<StepFlow currentStep="upload" onStepChange={onChange} />);
    fireEvent.click(screen.getByTestId('step-colorScheme'));
    expect(onChange).toHaveBeenCalledWith('colorScheme');
  });

  it('does NOT call onStepChange for invalid transitions', () => {
    const onChange = vi.fn();
    render(<StepFlow currentStep="upload" onStepChange={onChange} />);
    fireEvent.click(screen.getByTestId('step-export'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows checkmark for completed steps', () => {
    render(<StepFlow currentStep="annotation" onStepChange={vi.fn()} />);
    expect(screen.getByTestId('step-upload').textContent).toContain('✓');
    expect(screen.getByTestId('step-colorScheme').textContent).toContain('✓');
  });
});
