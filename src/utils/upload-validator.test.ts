import { describe, it, expect } from 'vitest';
import { validateUploadFile } from './upload-validator';

/** Helper to create a mock File with given name and size */
function mockFile(name: string, size: number): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type: 'application/octet-stream' });
}

const MB = 1024 * 1024;

describe('validateUploadFile', () => {
  it('should accept a valid .gpx file under 10MB', () => {
    const result = validateUploadFile(mockFile('track.gpx', 1 * MB));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept .GPX extension (case-insensitive)', () => {
    const result = validateUploadFile(mockFile('route.GPX', 500));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept .Gpx mixed-case extension', () => {
    const result = validateUploadFile(mockFile('data.Gpx', 100));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-gpx extension', () => {
    const result = validateUploadFile(mockFile('photo.jpg', 1000));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('仅支持 GPX 格式文件');
  });

  it('should reject file with no extension', () => {
    const result = validateUploadFile(mockFile('noext', 1000));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('仅支持 GPX 格式文件');
  });

  it('should accept file exactly at 10MB', () => {
    const result = validateUploadFile(mockFile('exact.gpx', 10 * MB));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject file exceeding 10MB', () => {
    const result = validateUploadFile(mockFile('big.gpx', 10 * MB + 1));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('文件大小超出 10MB 限制');
  });

  it('should return both errors for wrong extension and oversized file', () => {
    const result = validateUploadFile(mockFile('big.txt', 20 * MB));
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('仅支持 GPX 格式文件');
    expect(result.errors).toContain('文件大小超出 10MB 限制');
  });

  it('should accept zero-byte .gpx file', () => {
    const result = validateUploadFile(mockFile('empty.gpx', 0));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
