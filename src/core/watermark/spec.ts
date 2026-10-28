import {
  ANGLE_MAX,
  ANGLE_MIN,
  DEFAULT_SPEC,
  GAP_RATIO_MAX,
  GAP_RATIO_MIN,
  MAX_TEXT_LENGTH,
  OPACITY_MAX,
  OPACITY_MIN,
  SIZE_RATIO_MAX,
  SIZE_RATIO_MIN,
} from './constants';
import type { FontFamily, WatermarkSpec } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeFontFamily(value: unknown): FontFamily {
  if (value === 'sans' || value === 'serif' || value === 'mono') {
    return value;
  }
  return DEFAULT_SPEC.fontFamily;
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_SPEC.text;
  }
  return value.slice(0, MAX_TEXT_LENGTH);
}

export function parseColor(value: string): string | null {
  const color = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(color)) {
    return color;
  }

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(color);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  }

  return null;
}

function normalizeColor(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_SPEC.color;
  }

  return parseColor(value) ?? DEFAULT_SPEC.color;
}

export function clampSpec(input: unknown): WatermarkSpec {
  const source = isRecord(input) ? input : {};

  return {
    text: normalizeText(source.text),
    fontFamily: normalizeFontFamily(source.fontFamily),
    sizeRatio: clampNumber(
      source.sizeRatio,
      SIZE_RATIO_MIN,
      SIZE_RATIO_MAX,
      DEFAULT_SPEC.sizeRatio,
    ),
    color: normalizeColor(source.color),
    opacity: clampNumber(source.opacity, OPACITY_MIN, OPACITY_MAX, DEFAULT_SPEC.opacity),
    angle: clampNumber(source.angle, ANGLE_MIN, ANGLE_MAX, DEFAULT_SPEC.angle),
    gapRatio: clampNumber(source.gapRatio, GAP_RATIO_MIN, GAP_RATIO_MAX, DEFAULT_SPEC.gapRatio),
  };
}

export function isBlankText(spec: Pick<WatermarkSpec, 'text'>): boolean {
  return spec.text.trim().length === 0;
}

export function serializeSpec(spec: WatermarkSpec): string {
  return JSON.stringify(clampSpec(spec));
}

export function deserializeSpec(raw: string | null): WatermarkSpec {
  if (!raw) {
    return clampSpec(DEFAULT_SPEC);
  }

  try {
    return clampSpec(JSON.parse(raw));
  } catch {
    return clampSpec(DEFAULT_SPEC);
  }
}
