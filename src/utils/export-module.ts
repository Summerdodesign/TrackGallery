import html2canvas from 'html2canvas';
import type { ExportOptions } from '../types';

/**
 * 计算导出尺寸和缩放因子
 * 确保输出不低于 minWidth x minHeight
 */
export function calculateExportDimensions(
  elementWidth: number,
  elementHeight: number,
  minWidth: number,
  minHeight: number
): { scale: number; width: number; height: number } {
  if (elementWidth <= 0 || elementHeight <= 0) {
    return { scale: 1, width: minWidth, height: minHeight };
  }

  const scaleX = elementWidth >= minWidth ? 1 : minWidth / elementWidth;
  const scaleY = elementHeight >= minHeight ? 1 : minHeight / elementHeight;
  const scale = Math.max(scaleX, scaleY);

  return {
    scale,
    width: Math.round(elementWidth * scale),
    height: Math.round(elementHeight * scale),
  };
}

/**
 * 将海报元素导出为 PNG 图片并触发下载
 */
export async function exportAsPNG(
  posterElement: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { minWidth, minHeight, filename } = options;

  const elemWidth = posterElement.offsetWidth;
  const elemHeight = posterElement.offsetHeight;
  const { scale } = calculateExportDimensions(
    elemWidth,
    elemHeight,
    minWidth,
    minHeight
  );

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(posterElement, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    });
  } catch {
    throw new Error('导出失败：无法渲染海报内容，请重试');
  }

  // 确保最终画布满足最小分辨率
  if (canvas.width < minWidth || canvas.height < minHeight) {
    const finalScale = Math.max(
      minWidth / canvas.width,
      minHeight / canvas.height
    );
    const resized = document.createElement('canvas');
    resized.width = Math.round(canvas.width * finalScale);
    resized.height = Math.round(canvas.height * finalScale);
    const ctx = resized.getContext('2d');
    if (!ctx) {
      throw new Error('导出失败：无法创建画布上下文');
    }
    ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
    canvas = resized;
  }

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('导出失败：无法生成 PNG 图片'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.png')
          ? filename
          : `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      },
      'image/png'
    );
  });
}
