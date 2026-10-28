import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEC } from './constants';
import { createWatermarkLayout } from './layout';
import type { MeasureText } from './types';

const CHAR_WIDTH_RATIO = 0.6;

const measure: MeasureText = (text, font) => {
  const fontSize = Number.parseFloat(font);
  return text.length * fontSize * CHAR_WIDTH_RATIO;
};

describe('createWatermarkLayout', () => {
  it('derives size, gap and pitch from the short side', () => {
    const layout = createWatermarkLayout(DEFAULT_SPEC, 1000, 800, measure);

    expect(layout.fontSize).toBeCloseTo(32);
    expect(layout.gap).toBeCloseTo(32);
    expect(layout.lineHeight).toBeCloseTo(38.4);
    expect(layout.tileWidth).toBeCloseTo(6 * 32 * CHAR_WIDTH_RATIO);
    expect(layout.pitchX).toBeCloseTo(layout.tileWidth + layout.gap);
    expect(layout.pitchY).toBeCloseTo(layout.tileHeight + layout.gap);
  });

  it('keeps proportions across resolutions', () => {
    const base = createWatermarkLayout(DEFAULT_SPEC, 800, 600, measure);
    const scaled = createWatermarkLayout(DEFAULT_SPEC, 3200, 2400, measure);

    expect(scaled.fontSize / base.fontSize).toBeCloseTo(4);
    expect(scaled.gap / base.gap).toBeCloseTo(4);
    expect(scaled.tileWidth / base.tileWidth).toBeCloseTo(4);
    expect(scaled.pitchX / base.pitchX).toBeCloseTo(4);
    expect(scaled.pitchY / base.pitchY).toBeCloseTo(4);
    expect(scaled.centers).toHaveLength(base.centers.length);
    expect(scaled.centers[0].x / 4).toBeCloseTo(base.centers[0].x);
    expect(scaled.centers[0].y / 4).toBeCloseTo(base.centers[0].y);
  });

  it('covers the canvas corners at any angle', () => {
    const width = 1200;
    const height = 700;

    for (const angle of [0, -30, 45, 90, 135, 180]) {
      const layout = createWatermarkLayout({ ...DEFAULT_SPEC, angle }, width, height, measure);
      const maxX = Math.max(...layout.centers.map((center) => Math.abs(center.x)));
      const maxY = Math.max(...layout.centers.map((center) => Math.abs(center.y)));
      const radians = (angle * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const corners = [
        [-width / 2, -height / 2],
        [width / 2, -height / 2],
        [-width / 2, height / 2],
        [width / 2, height / 2],
      ];

      for (const [x, y] of corners) {
        const gridX = x * cos + y * sin;
        const gridY = -x * sin + y * cos;

        expect(Math.abs(gridX)).toBeLessThanOrEqual(maxX);
        expect(Math.abs(gridY)).toBeLessThanOrEqual(maxY);
      }
    }
  });

  it('treats multiple lines as a single tile', () => {
    const layout = createWatermarkLayout(
      { ...DEFAULT_SPEC, text: '机密\n内部' },
      1000,
      1000,
      measure,
    );

    expect(layout.lines).toEqual(['机密', '内部']);
    expect(layout.tileWidth).toBeCloseTo(2 * layout.fontSize * CHAR_WIDTH_RATIO);
    expect(layout.tileHeight).toBeCloseTo(2 * layout.lineHeight);
  });

  it('renders nothing for blank text', () => {
    const layout = createWatermarkLayout({ ...DEFAULT_SPEC, text: '   ' }, 800, 600, measure);

    expect(layout.centers).toHaveLength(0);
    expect(layout.tileCount).toBe(0);
    expect(layout.lines).toHaveLength(0);
  });

  it('flags pathological layouts instead of generating them', () => {
    const layout = createWatermarkLayout(
      { ...DEFAULT_SPEC, text: 'x', sizeRatio: 0.01, gapRatio: 0 },
      100_000,
      100_000,
      () => 1,
    );

    expect(layout.tooDense).toBe(true);
    expect(layout.centers).toHaveLength(0);
    expect(layout.tileCount).toBeGreaterThan(20_000);
  });

  it('clamps the spec before layout', () => {
    const layout = createWatermarkLayout({ ...DEFAULT_SPEC, sizeRatio: 99 }, 1000, 1000, measure);

    expect(layout.fontSize).toBeCloseTo(300);
  });
});
