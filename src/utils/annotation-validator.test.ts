import { describe, it, expect } from 'vitest';
import { isValidAnnotationText } from './annotation-validator';

describe('isValidAnnotationText', () => {
  it('should accept empty string', () => {
    expect(isValidAnnotationText('')).toBe(true);
  });

  it('should accept text within 50 characters', () => {
    expect(isValidAnnotationText('Hello World')).toBe(true);
  });

  it('should accept exactly 50 characters', () => {
    expect(isValidAnnotationText('a'.repeat(50))).toBe(true);
  });

  it('should reject 51 characters', () => {
    expect(isValidAnnotationText('a'.repeat(51))).toBe(false);
  });

  it('should reject very long text', () => {
    expect(isValidAnnotationText('x'.repeat(200))).toBe(false);
  });
});
