import { describe, it, expect } from 'vitest';
import { isValidTransition, getNextStep } from './step-flow';

describe('isValidTransition', () => {
  it('should allow upload → colorScheme', () => {
    expect(isValidTransition('upload', 'colorScheme')).toBe(true);
  });

  it('should allow colorScheme → annotation', () => {
    expect(isValidTransition('colorScheme', 'annotation')).toBe(true);
  });

  it('should allow annotation → export', () => {
    expect(isValidTransition('annotation', 'export')).toBe(true);
  });

  it('should reject upload → annotation (skip)', () => {
    expect(isValidTransition('upload', 'annotation')).toBe(false);
  });

  it('should reject upload → export (skip)', () => {
    expect(isValidTransition('upload', 'export')).toBe(false);
  });

  it('should reject export → upload (backward)', () => {
    expect(isValidTransition('export', 'upload')).toBe(false);
  });

  it('should reject colorScheme → upload (backward)', () => {
    expect(isValidTransition('colorScheme', 'upload')).toBe(false);
  });

  it('should reject same-step transition', () => {
    expect(isValidTransition('upload', 'upload')).toBe(false);
  });
});

describe('getNextStep', () => {
  it('should return colorScheme for upload', () => {
    expect(getNextStep('upload')).toBe('colorScheme');
  });

  it('should return annotation for colorScheme', () => {
    expect(getNextStep('colorScheme')).toBe('annotation');
  });

  it('should return export for annotation', () => {
    expect(getNextStep('annotation')).toBe('export');
  });

  it('should return null for export (terminal)', () => {
    expect(getNextStep('export')).toBeNull();
  });
});
