export type FontFamily = 'sans' | 'serif' | 'mono';

export interface WatermarkSpec {
  text: string;
  fontFamily: FontFamily;
  sizeRatio: number;
  color: string;
  opacity: number;
  angle: number;
  gapRatio: number;
}

export interface TileCenter {
  x: number;
  y: number;
}

export interface WatermarkLayout {
  width: number;
  height: number;
  font: string;
  fontSize: number;
  lineHeight: number;
  gap: number;
  tileWidth: number;
  tileHeight: number;
  pitchX: number;
  pitchY: number;
  angle: number;
  color: string;
  opacity: number;
  lines: string[];
  centers: TileCenter[];
  tileCount: number;
  tooDense: boolean;
}

export type MeasureText = (text: string, font: string) => number;
