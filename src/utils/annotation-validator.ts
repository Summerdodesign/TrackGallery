const MAX_ANNOTATION_LENGTH = 50;

/**
 * 验证标注文字长度是否合法（不超过 50 字符）
 */
export function isValidAnnotationText(text: string): boolean {
  return text.length <= MAX_ANNOTATION_LENGTH;
}
