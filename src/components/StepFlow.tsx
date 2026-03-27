import type { FlowStep } from '../types';
import { isValidTransition } from '../utils/step-flow';

export interface StepFlowProps {
  currentStep: FlowStep;
  onStepChange: (step: FlowStep) => void;
}

const STEPS: { key: FlowStep; label: string }[] = [
  { key: 'upload', label: '上传文件' },
  { key: 'colorScheme', label: '选择配色' },
  { key: 'annotation', label: '添加标注' },
  { key: 'export', label: '导出图片' },
];

export function StepFlow({ currentStep, onStepChange }: StepFlowProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div data-testid="step-flow" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 0' }}>
      {STEPS.map((step, i) => {
        const isActive = step.key === currentStep;
        const isCompleted = i < currentIndex;
        const canClick = isValidTransition(currentStep, step.key);

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              data-testid={`step-${step.key}`}
              onClick={() => canClick && onStepChange(step.key)}
              disabled={!canClick && !isActive}
              style={{
                padding: '6px 14px',
                borderRadius: 16,
                border: isActive ? '2px solid #4a9eff' : '1px solid #444',
                background: isActive ? 'rgba(74,158,255,0.15)' : isCompleted ? 'rgba(74,158,255,0.05)' : 'transparent',
                color: isActive ? '#4a9eff' : isCompleted ? '#6ab0ff' : '#666',
                cursor: canClick ? 'pointer' : 'default',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {isCompleted ? '✓ ' : ''}{step.label}
            </button>
            {i < STEPS.length - 1 && (
              <span style={{ color: '#444', margin: '0 4px', fontSize: 12 }}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
