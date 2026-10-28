export interface LoadedImage {
  element: HTMLImageElement;
  width: number;
  height: number;
  dispose: () => void;
}

export const THUMBNAIL_WIDTH = 160;
export const THUMBNAIL_HEIGHT = 120;
export const PREVIEW_MAX_EDGE = 2048;

export async function loadImageElement(file: File): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);
  const element = new Image();
  element.decoding = 'async';
  element.src = url;

  try {
    await element.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('图片解码失败');
  }

  if (!element.naturalWidth || !element.naturalHeight) {
    URL.revokeObjectURL(url);
    throw new Error('图片尺寸无效');
  }

  return {
    element,
    width: element.naturalWidth,
    height: element.naturalHeight,
    dispose: () => {
      element.removeAttribute('src');
      URL.revokeObjectURL(url);
    },
  };
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建画布');
  }
  return context;
}

export function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): void {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  context.drawImage(source, (targetWidth - width) / 2, (targetHeight - height) / 2, width, height);
}

export interface ThumbnailResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function createThumbnail(file: File): Promise<ThumbnailResult> {
  const image = await loadImageElement(file);

  try {
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const context = getContext(canvas);
    context.imageSmoothingQuality = 'high';
    drawCover(context, image.element, image.width, image.height, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    return { canvas, width: image.width, height: image.height };
  } finally {
    image.dispose();
  }
}

export async function createPreviewSource(file: File): Promise<HTMLCanvasElement> {
  const image = await loadImageElement(file);

  try {
    const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = createCanvas(width, height);
    const context = getContext(canvas);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image.element, 0, 0, width, height);

    return canvas;
  } finally {
    image.dispose();
  }
}
