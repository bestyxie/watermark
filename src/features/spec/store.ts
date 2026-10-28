import { create } from 'zustand';
import {
  DEFAULT_SPEC,
  SPEC_STORAGE_KEY,
  clampSpec,
  deserializeSpec,
  serializeSpec,
} from '../../core/watermark';
import type { WatermarkSpec } from '../../core/watermark';

interface SpecState {
  spec: WatermarkSpec;
  setSpec: (patch: Partial<WatermarkSpec>) => void;
  resetSpec: () => void;
}

function readStoredSpec(): WatermarkSpec {
  if (typeof localStorage === 'undefined') {
    return clampSpec(DEFAULT_SPEC);
  }

  try {
    return deserializeSpec(localStorage.getItem(SPEC_STORAGE_KEY));
  } catch {
    return clampSpec(DEFAULT_SPEC);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persistSpec(spec: WatermarkSpec): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SPEC_STORAGE_KEY, serializeSpec(spec));
    } catch {
      return;
    }
  }, 300);
}

export const useSpecStore = create<SpecState>((set) => ({
  spec: readStoredSpec(),

  setSpec: (patch) => {
    set((state) => {
      const spec = clampSpec({ ...state.spec, ...patch });
      persistSpec(spec);
      return { spec };
    });
  },

  resetSpec: () => {
    set(() => {
      const spec = clampSpec(DEFAULT_SPEC);
      persistSpec(spec);
      return { spec };
    });
  },
}));
