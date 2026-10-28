import { create } from 'zustand';
import { createThumbnail } from '../../core/image/load';
import { MAX_FILES, validateImageFile } from '../../core/image/validate';
import { runWithConcurrency } from '../../shared/async';

export type ImageStatus = 'pending' | 'decoding' | 'ready' | 'error';

export interface SourceImage {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  status: ImageStatus;
  error: string | null;
  thumbnail: HTMLCanvasElement | null;
}

export interface Notice {
  id: string;
  message: string;
  tone: 'error' | 'info';
}

interface BatchState {
  images: SourceImage[];
  currentId: string | null;
  importing: boolean;
  notices: Notice[];
  addFiles: (files: FileList | File[]) => Promise<void>;
  selectImage: (id: string) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  notify: (message: string, tone?: Notice['tone']) => void;
  dismissNotice: (id: string) => void;
}

const IMPORT_CONCURRENCY = 2;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createNotice(message: string, tone: Notice['tone'] = 'error'): Notice {
  return { id: createId(), message, tone };
}

function toSourceImage(file: File): SourceImage {
  return {
    id: createId(),
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    width: 0,
    height: 0,
    status: 'pending',
    error: null,
    thumbnail: null,
  };
}

let importChain: Promise<void> = Promise.resolve();
let batchGeneration = 0;

export const useBatchStore = create<BatchState>((set, get) => ({
  images: [],
  currentId: null,
  importing: false,
  notices: [],

  addFiles: (files) => {
    const list = Array.from(files);

    if (list.length === 0) {
      return Promise.resolve();
    }

    const task = importChain.then(async () => {
      const runGeneration = batchGeneration;
      const state = get();
      const slots = MAX_FILES - state.images.length;
      const notices: Notice[] = [];

      if (slots <= 0) {
        set((current) => ({
          notices: [...current.notices, createNotice(`最多 ${MAX_FILES} 张图片，请先移除部分图片`)],
        }));
        return;
      }

      const accepted: File[] = [];

      for (let index = 0; index < list.length; index += 1) {
        if (accepted.length >= slots) {
          notices.push(createNotice(`最多 ${MAX_FILES} 张图片，已忽略 ${list.length - index} 张`));
          break;
        }

        const file = list[index];
        const error = validateImageFile(file);

        if (error) {
          notices.push(createNotice(`“${file.name}”${error}`));
          continue;
        }

        accepted.push(file);
      }

      if (accepted.length === 0) {
        set((current) => ({ notices: [...current.notices, ...notices] }));
        return;
      }

      const entries = accepted.map(toSourceImage);

      set((current) => ({
        images: [...current.images, ...entries],
        currentId: current.currentId ?? entries[0].id,
        importing: true,
        notices: [...current.notices, ...notices],
      }));

      let failed = 0;

      await runWithConcurrency(entries, IMPORT_CONCURRENCY, async (entry) => {
        set((current) => ({
          images: current.images.map((image) =>
            image.id === entry.id ? { ...image, status: 'decoding' } : image,
          ),
        }));

        try {
          const { canvas, width, height } = await createThumbnail(entry.file);

          set((current) => ({
            images: current.images.map((image) =>
              image.id === entry.id
                ? { ...image, status: 'ready', width, height, thumbnail: canvas, error: null }
                : image,
            ),
          }));
        } catch (reason) {
          failed += 1;
          const message = reason instanceof Error ? reason.message : '无法解码这张图片';

          set((current) => ({
            images: current.images.map((image) =>
              image.id === entry.id ? { ...image, status: 'error', error: message } : image,
            ),
          }));
        }
      });

      set((current) => ({
        importing: runGeneration === batchGeneration ? false : current.importing,
        notices:
          failed && runGeneration === batchGeneration
            ? [...current.notices, createNotice(`${failed} 张图片解码失败`)]
            : current.notices,
      }));
    });

    importChain = task.catch(() => undefined);
    return importChain;
  },

  selectImage: (id) => set({ currentId: id }),

  removeImage: (id) =>
    set((state) => {
      const images = state.images.filter((image) => image.id !== id);

      return {
        images,
        currentId: state.currentId === id ? (images[0]?.id ?? null) : state.currentId,
      };
    }),

  clearImages: () => {
    batchGeneration += 1;
    set({ images: [], currentId: null, importing: false });
  },

  notify: (message, tone = 'info') =>
    set((state) => ({ notices: [...state.notices, createNotice(message, tone)] })),

  dismissNotice: (id) =>
    set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) })),
}));
