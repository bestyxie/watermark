import { useState } from 'react';
import type { FontFamily } from '../../core/watermark';
import { MAX_TEXT_LENGTH, parseColor } from '../../core/watermark';
import { useBatchStore } from '../batch/store';
import styles from './SpecPanel.module.css';
import { useSpecStore } from './store';

interface SpecPanelProps {
  onClose?: () => void;
}

interface RangeFieldProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
}

function RangeField({ label, min, max, step, value, display, onChange }: RangeFieldProps) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldHead}>
        <span className={styles.label}>{label}</span>
        <output className={styles.value}>{display}</output>
      </span>
      <input
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface HexColorInputProps {
  initial: string;
  onCommit: (color: string) => void;
}

function HexColorInput({ initial, onCommit }: HexColorInputProps) {
  const [draft, setDraft] = useState(initial);

  const commit = (value: string) => {
    const parsed = parseColor(value);

    if (parsed) {
      onCommit(parsed);
      return;
    }

    setDraft(initial);
  };

  return (
    <input
      className={styles.colorText}
      type="text"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
      spellCheck={false}
      aria-label="颜色十六进制值"
    />
  );
}

function ColorField() {
  const color = useSpecStore((state) => state.spec.color);
  const setSpec = useSpecStore((state) => state.setSpec);

  return (
    <div className={styles.colorRow}>
      <input
        className={styles.colorPicker}
        type="color"
        value={color}
        onChange={(event) => setSpec({ color: event.target.value })}
        aria-label="水印颜色"
      />
      <HexColorInput key={color} initial={color} onCommit={(value) => setSpec({ color: value })} />
    </div>
  );
}

export function SpecPanel({ onClose }: SpecPanelProps) {
  const spec = useSpecStore((state) => state.spec);
  const setSpec = useSpecStore((state) => state.setSpec);
  const resetSpec = useSpecStore((state) => state.resetSpec);
  const currentWidth = useBatchStore(
    (state) => state.images.find((image) => image.id === state.currentId)?.width ?? 0,
  );
  const currentHeight = useBatchStore(
    (state) => state.images.find((image) => image.id === state.currentId)?.height ?? 0,
  );

  const sizePx =
    currentWidth && currentHeight
      ? Math.round(spec.sizeRatio * Math.min(currentWidth, currentHeight))
      : null;
  const blank = spec.text.trim().length === 0;

  return (
    <aside className={styles.panel} aria-label="水印参数">
      <span className={styles.grabber} aria-hidden="true" />

      <div className={styles.head}>
        <h2 className={styles.title}>水印参数</h2>
        <div className={styles.headActions}>
          <button type="button" className={styles.reset} onClick={resetSpec}>
            恢复默认
          </button>
          {onClose && (
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="关闭参数面板"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <label className={styles.field}>
          <span className={styles.fieldHead}>
            <span className={styles.label}>文本</span>
            <span className={styles.hint}>
              {spec.text.length} / {MAX_TEXT_LENGTH}
            </span>
          </span>
          <textarea
            className={styles.textarea}
            value={spec.text}
            maxLength={MAX_TEXT_LENGTH}
            rows={3}
            onChange={(event) => setSpec({ text: event.target.value })}
            placeholder="输入水印文字，支持换行"
          />
        </label>

        {blank && <p className={styles.warning}>水印文本为空，导出将不可用。</p>}

        <label className={styles.field}>
          <span className={styles.label}>字体</span>
          <select
            className={styles.select}
            value={spec.fontFamily}
            onChange={(event) => setSpec({ fontFamily: event.target.value as FontFamily })}
          >
            <option value="sans">无衬线</option>
            <option value="serif">衬线</option>
            <option value="mono">等宽</option>
          </select>
        </label>

        <RangeField
          label="字号"
          min={1}
          max={30}
          step={0.5}
          value={spec.sizeRatio * 100}
          display={`${(spec.sizeRatio * 100).toFixed(1)}%${sizePx ? ` · ${sizePx}px` : ''}`}
          onChange={(value) => setSpec({ sizeRatio: value / 100 })}
        />

        <div className={styles.field}>
          <span className={styles.fieldHead}>
            <span className={styles.label}>颜色</span>
            <span className={styles.value}>{spec.color}</span>
          </span>
          <ColorField />
        </div>

        <RangeField
          label="不透明度"
          min={0}
          max={100}
          step={1}
          value={Math.round(spec.opacity * 100)}
          display={`${Math.round(spec.opacity * 100)}%`}
          onChange={(value) => setSpec({ opacity: value / 100 })}
        />

        <RangeField
          label="角度"
          min={-180}
          max={180}
          step={1}
          value={spec.angle}
          display={`${spec.angle}°`}
          onChange={(value) => setSpec({ angle: value })}
        />

        <RangeField
          label="间隔"
          min={0}
          max={5}
          step={0.1}
          value={spec.gapRatio}
          display={`${spec.gapRatio.toFixed(1)}×`}
          onChange={(value) => setSpec({ gapRatio: value })}
        />
      </div>
    </aside>
  );
}
