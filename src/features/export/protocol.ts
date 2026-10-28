import type { WatermarkSpec } from '../../core/watermark';

export type DeliveryMode = 'direct' | 'zip' | 'per-file';

export interface ExportItem {
  id: string;
  name: string;
  type: string;
  file: File;
}

export interface StartMessage {
  type: 'start';
  items: ExportItem[];
  spec: WatermarkSpec;
  quality: number;
  mode: DeliveryMode;
}

export interface CancelMessage {
  type: 'cancel';
}

export type WorkerRequest = StartMessage | CancelMessage;

export interface ProgressMessage {
  type: 'progress';
  completed: number;
  total: number;
  currentName: string;
}

export interface FileMessage {
  type: 'file';
  id: string;
  name: string;
  blob: Blob;
  fallback: boolean;
}

export interface ZipMessage {
  type: 'zip';
  name: string;
  blob: Blob;
}

export interface ExportFailure {
  id: string;
  name: string;
  reason: string;
}

export interface DoneMessage {
  type: 'done';
  succeeded: string[];
  failed: ExportFailure[];
  cancelled: boolean;
  fallbacks: string[];
}

export type WorkerResponse = ProgressMessage | FileMessage | ZipMessage | DoneMessage;

export interface ExportOutcome {
  succeeded: string[];
  failed: ExportFailure[];
  cancelled: boolean;
  fallbacks: string[];
}
