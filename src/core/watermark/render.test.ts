import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SPEC } from './constants';
import { createWatermarkLayout } from './layout';
import { drawWatermarkLayout, renderWatermark } from './render';

function createFakeContext() {
  const fillText = vi.fn();
  const rotate = vi.fn();
  const translate = vi.fn();
  const save = vi.fn();
  const restore = vi.fn();
  const raw = {
    font: '',
    fillStyle: '',
    globalAlpha: 1,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save,
    restore,
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    translate,
    rotate,
    fillText,
    measureText: (text: string) => ({ width: text.length * 12 }),
  };

  return {
    context: raw as unknown as CanvasRenderingContext2D,
    raw,
    fillText,
    rotate,
    translate,
    save,
  };
}

const measure = (text: string) => text.length * 12;

describe('drawWatermarkLayout', () => {
  it('draws every line of every tile inside a clipped, rotated canvas', () => {
    const layout = createWatermarkLayout(
      { ...DEFAULT_SPEC, text: 'AB\nCD', angle: -30 },
      800,
      600,
      measure,
    );
    const fake = createFakeContext();

    drawWatermarkLayout(fake.context, layout);

    expect(fake.save).toHaveBeenCalledTimes(1);
    expect(fake.translate).toHaveBeenCalledWith(400, 300);
    expect(fake.rotate).toHaveBeenCalledWith((-30 * Math.PI) / 180);
    expect(fake.fillText).toHaveBeenCalledTimes(layout.centers.length * 2);
    expect(fake.raw.globalAlpha).toBe(DEFAULT_SPEC.opacity);
    expect(fake.raw.fillStyle).toBe(DEFAULT_SPEC.color);
    expect(fake.raw.font).toBe(layout.font);
    expect(fake.raw.textAlign).toBe('center');
    expect(fake.raw.textBaseline).toBe('middle');
  });

  it('does nothing for a blank layout', () => {
    const layout = createWatermarkLayout({ ...DEFAULT_SPEC, text: '' }, 800, 600, measure);
    const fake = createFakeContext();

    drawWatermarkLayout(fake.context, layout);

    expect(fake.fillText).not.toHaveBeenCalled();
    expect(fake.save).not.toHaveBeenCalled();
  });
});

describe('renderWatermark', () => {
  it('measures, lays out and draws in one call', () => {
    const fake = createFakeContext();

    const layout = renderWatermark(fake.context, { ...DEFAULT_SPEC, text: 'X' }, 400, 300);

    expect(layout.lines).toEqual(['X']);
    expect(fake.fillText).toHaveBeenCalledTimes(layout.centers.length);
    expect(layout.fontSize).toBeCloseTo(Math.min(400, 300) * 0.04);
  });
});
