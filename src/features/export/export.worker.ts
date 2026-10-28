import { zipSync } from 'fflate';
import { decodeBitmap } from '../../core/image/decode';
import { renderWatermark } from '../../core/watermark';
import type { WatermarkSpec } from '../../core/watermark';
import { outputMimeType, resolveOutputName, zipName } from './naming';
import type {
  ExportFailure,
  ExportItem,
  StartMessage,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

let cancelled = false;
let running = false;

scope.onmessage = (event) => {
  const message = event.data;

  if (message.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (message.type === 'start') {
    if (running) {
      return;
    }

    running = true;
    cancelled = false;

    void run(message)
      .catch((reason: unknown) => {
        scope.postMessage({
          type: 'done',
          succeeded: [],
          failed: message.items.map((item) => ({
            id: item.id,
            name: item.name,
            reason: reason instanceof Error ? reason.message : '导出失败',
          })),
          cancelled: false,
          fallbacks: [],
        });
      })
      .finally(() => {
        running = false;
      });
  }
};

interface Encoded {
  blob: Blob;
  fallback: boolean;
}

async function encode(item: ExportItem, spec: WatermarkSpec, quality: number): Promise<Encoded> {
  const bitmap = await decodeBitmap(item.file);

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('无法创建画布');
    }

    context.drawImage(bitmap, 0, 0);
    renderWatermark(context, spec, canvas.width, canvas.height);

    const target = outputMimeType(item);

    if (target === 'image/png') {
      return { blob: await canvas.convertToBlob({ type: 'image/png' }), fallback: false };
    }

    try {
      const blob = await canvas.convertToBlob({ type: target, quality });

      if (target === 'image/webp' && blob.type !== 'image/webp') {
        return { blob: await canvas.convertToBlob({ type: 'image/png' }), fallback: true };
      }

      return { blob, fallback: false };
    } catch (reason) {
      if (target === 'image/webp') {
        return { blob: await canvas.convertToBlob({ type: 'image/png' }), fallback: true };
      }

      throw reason;
    }
  } finally {
    bitmap.close();
  }
}

async function run(message: StartMessage): Promise<void> {
  const { items, spec, quality, mode } = message;
  const used = new Set<string>();
  const succeeded: string[] = [];
  const failed: ExportFailure[] = [];
  const fallbacks: string[] = [];
  const zipEntries: Record<string, Uint8Array> = {};

  for (let index = 0; index < items.length; index += 1) {
    if (cancelled) {
      break;
    }

    const item = items[index];
    scope.postMessage({
      type: 'progress',
      completed: index,
      total: items.length,
      currentName: item.name,
    });

    try {
      const { blob, fallback } = await encode(item, spec, quality);
      const name = resolveOutputName(item.name, blob.type, used);

      if (fallback) {
        fallbacks.push(name);
      }

      if (mode === 'zip') {
        zipEntries[name] = new Uint8Array(await blob.arrayBuffer());
      } else {
        scope.postMessage({ type: 'file', id: item.id, name, blob, fallback });
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

    scope.postMessage({
      type: 'progress',
      completed: index + 1,
      total: items.length,
      currentName: item.name,
    });
  }

  if (mode === 'zip' && !cancelled && succeeded.length > 0) {
    try {
      const data = zipSync(zipEntries);
      const blob = new Blob([data], { type: 'application/zip' });
      scope.postMessage({ type: 'zip', name: zipName(), blob });
    } catch (reason) {
      failed.push({
        id: 'zip',
        name: 'ZIP 打包',
        reason: reason instanceof Error ? reason.message : '打包失败',
      });
    }
  }

  scope.postMessage({ type: 'done', succeeded, failed, cancelled, fallbacks });
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
