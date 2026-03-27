import type { FlowStep } from '../types';

/**
 * 合法的步骤转换映射
 * upload → colorScheme → annotation → export
 */
const VALID_TRANSITIONS: Record<FlowStep, FlowStep | null> = {
  upload: 'colorScheme',
  colorScheme: 'annotation',
  annotation: 'export',
  export: null,
};

/**
 * 判断从 current 到 next 的步骤转换是否合法
 */
export function isValidTransition(current: FlowStep, next: FlowStep): boolean {
  return VALID_TRANSITIONS[current] === next;
}

/**
 * 获取当前步骤的下一个合法步骤，若无则返回 null
 */
export function getNextStep(current: FlowStep): FlowStep | null {
  return VALID_TRANSITIONS[current];
}
