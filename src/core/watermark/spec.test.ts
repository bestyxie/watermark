import { describe, expect, it } from 'vitest';
import { DEFAULT_SPEC, MAX_TEXT_LENGTH } from './constants';
import { clampSpec, deserializeSpec, isBlankText, serializeSpec } from './spec';

describe('clampSpec', () => {
  it('falls back to defaults for missing or invalid input', () => {
    expect(clampSpec(null)).toEqual(DEFAULT_SPEC);
    expect(clampSpec('nope')).toEqual(DEFAULT_SPEC);
  });

  it('clamps numeric fields into range', () => {
    const spec = clampSpec({
      sizeRatio: 9,
      opacity: -1,
      angle: 999,
      gapRatio: -3,
    });

    expect(spec.sizeRatio).toBe(0.3);
    expect(spec.opacity).toBe(0);
    expect(spec.angle).toBe(180);
    expect(spec.gapRatio).toBe(0);
  });

  it('drops non-finite numbers', () => {
    const spec = clampSpec({ sizeRatio: Number.NaN, opacity: Number.POSITIVE_INFINITY });

    expect(spec.sizeRatio).toBe(DEFAULT_SPEC.sizeRatio);
    expect(spec.opacity).toBe(DEFAULT_SPEC.opacity);
  });

  it('normalizes colors', () => {
    expect(clampSpec({ color: '#ABC' }).color).toBe('#aabbcc');
    expect(clampSpec({ color: '#FF0000' }).color).toBe('#ff0000');
    expect(clampSpec({ color: 'red' }).color).toBe(DEFAULT_SPEC.color);
  });

  it('truncates text to the limit but keeps explicit empty strings', () => {
    expect(clampSpec({ text: 'a'.repeat(MAX_TEXT_LENGTH + 20) }).text).toHaveLength(
      MAX_TEXT_LENGTH,
    );
    expect(clampSpec({ text: '' }).text).toBe('');
  });

  it('rejects unknown font families', () => {
    expect(clampSpec({ fontFamily: 'comic' }).fontFamily).toBe(DEFAULT_SPEC.fontFamily);
    expect(clampSpec({ fontFamily: 'mono' }).fontFamily).toBe('mono');
  });
});

describe('persistence', () => {
  it('round-trips a normalized spec', () => {
    const spec = clampSpec({ text: '机密', opacity: 0.5 });

    expect(deserializeSpec(serializeSpec(spec))).toEqual(spec);
  });

  it('returns defaults for corrupt payloads', () => {
    expect(deserializeSpec('{')).toEqual(DEFAULT_SPEC);
    expect(deserializeSpec(null)).toEqual(DEFAULT_SPEC);
  });
});

describe('isBlankText', () => {
  it('treats whitespace as blank', () => {
    expect(isBlankText({ text: '' })).toBe(true);
    expect(isBlankText({ text: ' \n\t ' })).toBe(true);
    expect(isBlankText({ text: '机密' })).toBe(false);
  });
});
