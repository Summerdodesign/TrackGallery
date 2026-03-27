import { describe, it, expect } from 'vitest';
import { isValidHexColor } from './color-validator';

describe('isValidHexColor', () => {
  it('should accept valid lowercase hex color', () => {
    expect(isValidHexColor('#ff00aa')).toBe(true);
  });

  it('should accept valid uppercase hex color', () => {
    expect(isValidHexColor('#FF00AA')).toBe(true);
  });

  it('should accept valid mixed-case hex color', () => {
    expect(isValidHexColor('#aB12cD')).toBe(true);
  });

  it('should reject missing hash', () => {
    expect(isValidHexColor('ff00aa')).toBe(false);
  });

  it('should reject 3-digit shorthand', () => {
    expect(isValidHexColor('#f0a')).toBe(false);
  });

  it('should reject 8-digit (with alpha)', () => {
    expect(isValidHexColor('#ff00aaff')).toBe(false);
  });

  it('should reject non-hex characters', () => {
    expect(isValidHexColor('#gggggg')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidHexColor('')).toBe(false);
  });

  it('should reject color name', () => {
    expect(isValidHexColor('red')).toBe(false);
  });
});
