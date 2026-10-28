import { createWatermarkLayout } from './layout';
import type { WatermarkLayout, WatermarkSpec } from './types';

type CanvasContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawWatermarkLayout(context: CanvasContext2D, layout: WatermarkLayout): void {
  if (layout.centers.length === 0 || layout.lines.length === 0) {
    return;
  }

  context.save();
  context.beginPath();
  context.rect(0, 0, layout.width, layout.height);
  context.clip();
  context.translate(layout.width / 2, layout.height / 2);
  context.rotate((layout.angle * Math.PI) / 180);
  context.font = layout.font;
  context.fillStyle = layout.color;
  context.globalAlpha = layout.opacity;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const lastLineIndex = layout.lines.length - 1;

  for (const center of layout.centers) {
    for (let index = 0; index < layout.lines.length; index += 1) {
      const offsetY = (index - lastLineIndex / 2) * layout.lineHeight;
      context.fillText(layout.lines[index], center.x, center.y + offsetY);
    }
  }

  context.restore();
}

export function renderWatermark(
  context: CanvasContext2D,
  spec: WatermarkSpec,
  width: number,
  height: number,
): WatermarkLayout {
  const layout = createWatermarkLayout(spec, width, height, (text, font) => {
    context.font = font;
    return context.measureText(text).width;
  });

  drawWatermarkLayout(context, layout);

  return layout;
}
