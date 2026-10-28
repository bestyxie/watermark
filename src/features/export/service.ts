import { zipSync } from 'fflate';
import { decodeBitmap } from '../../core/image/decode';
import { renderWatermark } from '../../core/watermark';
import type { WatermarkSpec } from '../../core/watermark';
import { outputMimeType, resolveOutputName, zipName } from './naming';
import type {
  DeliveryMode,
  ExportFailure,
  ExportItem,
  ExportOutcome,
  StartMessage,
  WorkerResponse,
} from './protocol';

export interface ExportRequest {
  items: ExportItem[];
  spec: WatermarkSpec;
  quality: number;
  mode: DeliveryMode;
}

export interface ExportCallbacks {
  onProgress: (completed: number, total: number, currentName: string) => void;
  onFile: (blob: Blob, name: string) => void;
  onZip: (blob: Blob, name: string) => void;
}

export interface ExportHandle {
  promise: Promise<ExportOutcome>;
  cancel: () => void;
}

interface Encoded {
  blob: Blob;
  fallback: boolean;
}

export function startExport(request: ExportRequest, callbacks: ExportCallbacks): ExportHandle {
  if (canUseWorker()) {
    try {
      return startWorkerExport(request, callbacks);
    } catch {
      return startMainThreadExport(request, callbacks);
    }
  }

  return startMainThreadExport(request, callbacks);
}

function canUseWorker(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

function startWorkerExport(request: ExportRequest, callbacks: ExportCallbacks): ExportHandle {
  const worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
  const deliveredIds = new Set<string>();
  const deliveredNames: string[] = [];
  let settled = false;

  const promise = new Promise<ExportOutcome>((resolve) => {
    const finish = (outcome: ExportOutcome) => {
      if (settled) {
        return;
      }

      settled = true;
      worker.terminate();
      resolve(outcome);
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      if (message.type === 'progress') {
        callbacks.onProgress(message.completed, message.total, message.currentName);
        return;
      }

      if (message.type === 'file') {
        deliveredIds.add(message.id);
        deliveredNames.push(message.name);
        callbacks.onFile(message.blob, message.name);
        return;
      }

      if (message.type === 'zip') {
        callbacks.onZip(message.blob, message.name);
        return;
      }

      if (message.type === 'done') {
        finish({
          succeeded: message.succeeded,
          failed: message.failed,
          cancelled: message.cancelled,
          fallbacks: message.fallbacks,
        });
      }
    };

    worker.onerror = (event) => {
      finish({
        succeeded: deliveredNames,
        failed: request.items
          .filter((item) => !deliveredIds.has(item.id))
          .map((item) => ({
            id: item.id,
            name: item.name,
            reason: event.message || '导出线程异常',
          })),
        cancelled: false,
        fallbacks: [],
      });
    };

    const start: StartMessage = { type: 'start', ...request };

    try {
      worker.postMessage(start);
    } catch (reason) {
      finish({
        succeeded: [],
        failed: request.items.map((item) => ({
          id: item.id,
          name: item.name,
          reason: reason instanceof Error ? reason.message : '无法启动导出',
        })),
        cancelled: false,
        fallbacks: [],
      });
    }
  });

  return {
    promise,
    cancel: () => {
      if (settled) {
        return;
      }

      worker.postMessage({ type: 'cancel' });
    },
  };
}

function startMainThreadExport(request: ExportRequest, callbacks: ExportCallbacks): ExportHandle {
  let cancelled = false;
  const used = new Set<string>();
  const succeeded: string[] = [];
  const failed: ExportFailure[] = [];
  const fallbacks: string[] = [];
  const zipEntries: Record<string, Uint8Array> = {};

  const promise = (async (): Promise<ExportOutcome> => {
    for (let index = 0; index < request.items.length; index += 1) {
      if (cancelled) {
        break;
      }

      const item = request.items[index];
      callbacks.onProgress(index, request.items.length, item.name);

      try {
        const { blob, fallback } = await encodeMainThread(item, request.spec, request.quality);
        const name = resolveOutputName(item.name, blob.type, used);

        if (fallback) {
          fallbacks.push(name);
        }

        if (request.mode === 'zip') {
          zipEntries[name] = new Uint8Array(await blob.arrayBuffer());
        } else {
          callbacks.onFile(blob, name);
          await wait(200);
        }

        succeeded.push(name);
      } catch (reason) {
        failed.push({
          id: item.id,
          name: item.name,
          reason: reason instanceof Error ? reason.message : '导出失败',
        });
      }

      callbacks.onProgress(index + 1, request.items.length, item.name);
      await wait(0);
    }

    if (request.mode === 'zip' && !cancelled && succeeded.length > 0) {
      try {
        const data = zipSync(zipEntries);
        callbacks.onZip(new Blob([data], { type: 'application/zip' }), zipName());
      } catch (reason) {
        failed.push({
          id: 'zip',
          name: 'ZIP 打包',
          reason: reason instanceof Error ? reason.message : '打包失败',
        });
      }
    }

    return { succeeded, failed, cancelled, fallbacks };
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
    },
  };
}

async function encodeMainThread(
  item: ExportItem,
  spec: WatermarkSpec,
  quality: number,
): Promise<Encoded> {
  const bitmap = await decodeBitmap(item.file);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('无法创建画布');
    }

    context.drawImage(bitmap, 0, 0);
    renderWatermark(context, spec, canvas.width, canvas.height);

    const target = outputMimeType(item);

    if (target === 'image/png') {
      return { blob: await canvasToBlob(canvas, 'image/png'), fallback: false };
    }

    try {
      const blob = await canvasToBlob(canvas, target, quality);

      if (target === 'image/webp' && blob.type !== 'image/webp') {
        return { blob: await canvasToBlob(canvas, 'image/png'), fallback: true };
      }

      return { blob, fallback: false };
    } catch (reason) {
      if (target === 'image/webp') {
        return { blob: await canvasToBlob(canvas, 'image/png'), fallback: true };
      }

      throw reason;
    }
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('图片编码失败'));
      },
      type,
      quality,
    );
  });
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
