import type { FontFamily, WatermarkSpec } from './types';

export const MAX_TEXT_LENGTH = 500;
export const MAX_TILES = 20_000;
export const SPEC_STORAGE_KEY = 'watermark:spec:v1';

export const SIZE_RATIO_MIN = 0.01;
export const SIZE_RATIO_MAX = 0.3;
export const OPACITY_MIN = 0;
export const OPACITY_MAX = 1;
export const ANGLE_MIN = -180;
export const ANGLE_MAX = 180;
export const GAP_RATIO_MIN = 0;
export const GAP_RATIO_MAX = 5;

export const DEFAULT_SPEC: Readonly<WatermarkSpec> = Object.freeze({
  text: '仅供内部使用',
  fontFamily: 'sans',
  sizeRatio: 0.04,
  color: '#000000',
  opacity: 0.3,
  angle: -30,
  gapRatio: 1,
});

export const FONT_STACKS: Readonly<Record<FontFamily, string>> = {
  sans: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

export const LINE_HEIGHT_RATIO = 1.2;
