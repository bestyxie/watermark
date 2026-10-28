import { FONT_STACKS, LINE_HEIGHT_RATIO, MAX_TILES } from './constants';
import { clampSpec } from './spec';
import type { MeasureText, TileCenter, WatermarkLayout, WatermarkSpec } from './types';

export function createWatermarkLayout(
  spec: WatermarkSpec,
  width: number,
  height: number,
  measure: MeasureText,
): WatermarkLayout {
  const normalized = clampSpec(spec);
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));

  const fontSize = normalized.sizeRatio * Math.min(safeWidth, safeHeight);
  const font = `${fontSize}px ${FONT_STACKS[normalized.fontFamily]}`;
  const hasText = normalized.text.trim().length > 0;
  const lines = hasText ? normalized.text.split(/\r?\n/) : [];
  const lineHeight = LINE_HEIGHT_RATIO * fontSize;

  const tileWidth = hasText
    ? lines.reduce((widest, line) => Math.max(widest, measure(line, font)), 0)
    : 0;
  const tileHeight = hasText ? lines.length * lineHeight : 0;

  const gap = normalized.gapRatio * fontSize;
  const pitchX = Math.max(tileWidth + gap, 1);
  const pitchY = Math.max(tileHeight + gap, 1);

  const radius = 0.5 * Math.hypot(safeWidth, safeHeight);
  const rangeX = Math.ceil(radius / pitchX) + 1;
  const rangeY = Math.ceil(radius / pitchY) + 1;
  const tileCount = (rangeX * 2 + 1) * (rangeY * 2 + 1);
  const tooDense = hasText && tileCount > MAX_TILES;

  const centers: TileCenter[] = [];
  if (hasText && !tooDense) {
    for (let row = -rangeY; row <= rangeY; row += 1) {
      for (let column = -rangeX; column <= rangeX; column += 1) {
        centers.push({ x: column * pitchX, y: row * pitchY });
      }
    }
  }

  return {
    width: safeWidth,
    height: safeHeight,
    font,
    fontSize,
    lineHeight,
    gap,
    tileWidth,
    tileHeight,
    pitchX,
    pitchY,
    angle: normalized.angle,
    color: normalized.color,
    opacity: normalized.opacity,
    lines,
    centers,
    tileCount: hasText ? tileCount : 0,
    tooDense,
  };
}
