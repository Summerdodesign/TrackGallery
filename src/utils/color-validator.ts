const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

/**
 * 验证十六进制色值格式
 * 仅接受 `#` 后跟恰好 6 位十六进制字符（0-9, a-f, A-F）
 */
export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value);
}
