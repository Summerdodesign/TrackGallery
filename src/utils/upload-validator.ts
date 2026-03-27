import type { ValidationResult } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 验证上传文件的扩展名和大小
 */
export function validateUploadFile(file: File): ValidationResult {
  const errors: string[] = [];

  // 验证文件扩展名（不区分大小写）
  const ext = file.name.slice(file.name.lastIndexOf('.'));
  if (ext.toLowerCase() !== '.gpx') {
    errors.push('仅支持 GPX 格式文件');
  }

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    errors.push('文件大小超出 10MB 限制');
  }

  return { valid: errors.length === 0, errors };
}
