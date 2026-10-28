import { useEffect, useRef, useState } from 'react';
import { isBlankText } from '../../core/watermark';
import type { WatermarkSpec } from '../../core/watermark';
import { useBatchStore } from '../batch/store';
import { useSpecStore } from '../spec/store';
import { downloadBlob } from './download';
import { outputMimeType } from './naming';
import type { DeliveryMode, ExportItem, ExportOutcome } from './protocol';
import { startExport } from './service';
import type { ExportHandle } from './service';
import styles from './ExportBar.module.css';

interface Job {
  completed: number;
  total: number;
  currentName: string;
}

interface LastRequest {
  mode: DeliveryMode;
  items: ExportItem[];
  spec: WatermarkSpec;
  quality: number;
}

export function ExportBar() {
  const images = useBatchStore((state) => state.images);
  const notify = useBatchStore((state) => state.notify);
  const spec = useSpecStore((state) => state.spec);
  const [quality, setQuality] = useState(0.92);
  const [job, setJob] = useState<Job | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<ExportOutcome | null>(null);
  const handleRef = useRef<ExportHandle | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);

  useEffect(
    () => () => {
      handleRef.current?.cancel();
    },
    [],
  );

  const readyItems: ExportItem[] = images
    .filter((image) => image.status === 'ready' && image.width > 0 && image.height > 0)
    .map((image) => ({
      id: image.id,
      name: image.name,
      type: image.type,
      file: image.file,
    }));

  const hasLossy = readyItems.some((item) => outputMimeType(item) !== 'image/png');
  const blank = isBlankText(spec);
  const disabled = blank || readyItems.length === 0;
  const qualityPercent = Math.round(quality * 100);

  const runExport = async (
    mode: DeliveryMode,
    items: ExportItem[],
    snapshot: WatermarkSpec,
    qualityValue: number,
  ) => {
    if (items.length === 0) {
      return;
    }

    lastRequestRef.current = {
      mode,
      items,
      spec: { ...snapshot },
      quality: qualityValue,
    };
    setResult(null);
    setCancelling(false);
    setJob({ completed: 0, total: items.length, currentName: items[0].name });

    const handle = startExport(
      { items, spec: { ...snapshot }, quality: qualityValue, mode },
      {
        onProgress: (completed, total, currentName) => {
          setJob({ completed, total, currentName });
        },
        onFile: (blob, name) => {
          downloadBlob(blob, name);
        },
        onZip: (blob, name) => {
          downloadBlob(blob, name);
        },
      },
    );

    handleRef.current = handle;
    const outcome = await handle.promise;
    handleRef.current = null;

    setJob(null);
    setCancelling(false);
    setResult(outcome);

    if (outcome.fallbacks.length > 0) {
      notify(`${outcome.fallbacks.length} 张 WebP 编码不可用，已回退为 PNG`, 'info');
    }

    if (outcome.cancelled) {
      notify('已取消导出', 'info');
    } else if (outcome.failed.length === 0 && outcome.succeeded.length > 0) {
      notify(`已导出 ${outcome.succeeded.length} 张图片`, 'info');
    }
  };

  const start = (mode: DeliveryMode) => {
    const snapshot = useSpecStore.getState().spec;
    void runExport(mode, readyItems, snapshot, quality);
  };

  const cancel = () => {
    if (!handleRef.current) {
      return;
    }

    setCancelling(true);
    handleRef.current.cancel();
  };

  const retryFailed = () => {
    const last = lastRequestRef.current;

    if (!last || !result) {
      return;
    }

    const failedIds = new Set(result.failed.map((failure) => failure.id));
    const items = last.items.filter((item) => failedIds.has(item.id));
    const zipFailed = result.failed.some((failure) => failure.id === 'zip');

    if (items.length === 0 && !zipFailed) {
      return;
    }

    void runExport(last.mode, items.length > 0 ? items : last.items, last.spec, last.quality);
  };

  const statusText =
    readyItems.length > 0
      ? `${readyItems.length} 张可导出`
      : images.some((image) => image.status === 'pending' || image.status === 'decoding')
        ? '等待图片解码…'
        : images.length > 0
          ? '没有可导出的图片'
          : '导入图片后即可导出';

  const progressPercent = job && job.total > 0 ? (job.completed / job.total) * 100 : 0;

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.info}>
          <span className={styles.status}>{statusText}</span>

          {blank && <span className={styles.warning}>水印文本为空</span>}

          {hasLossy && (
            <label className={styles.quality}>
              <span className={styles.qualityLabel}>质量</span>
              <input
                className={styles.qualityRange}
                type="range"
                min={60}
                max={100}
                step={1}
                value={qualityPercent}
                onChange={(event) => setQuality(Number(event.target.value) / 100)}
                aria-label="导出质量"
              />
              <span className={styles.qualityValue}>{qualityPercent}%</span>
            </label>
          )}
        </div>

        <div className={styles.actions}>
          {job ? (
            <>
              <div className={styles.progress} role="status" aria-live="polite">
                <span>{cancelling ? '正在取消…' : `完成 ${job.completed} / ${job.total}`}</span>
                <span className={styles.current} title={job.currentName}>
                  {job.currentName}
                </span>
                <span className={styles.progressTrack}>
                  <span className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                </span>
              </div>
              <button
                type="button"
                className={styles.button}
                onClick={cancel}
                disabled={cancelling}
              >
                取消
              </button>
            </>
          ) : (
            <>
              {readyItems.length > 1 ? (
                <>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.secondary}`}
                    onClick={() => start('zip')}
                    disabled={disabled}
                    title={blank ? '水印文本为空' : undefined}
                  >
                    打包 ZIP
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    onClick={() => start('per-file')}
                    disabled={disabled}
                    title={blank ? '水印文本为空' : undefined}
                  >
                    逐张下载
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={() => start('direct')}
                  disabled={disabled}
                  title={blank ? '水印文本为空' : undefined}
                >
                  导出
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {result && result.failed.length > 0 && (
        <div className={styles.dialogBackdrop} role="presentation" onClick={() => setResult(null)}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-result-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="export-result-title" className={styles.dialogTitle}>
              {result.cancelled ? '导出已取消' : '导出完成'}
            </h2>
            <p className={styles.dialogSummary}>
              成功 {result.succeeded.length} 张，失败 {result.failed.length} 张
            </p>

            <ul className={styles.failureList}>
              {result.failed.map((failure) => (
                <li key={`${failure.id}-${failure.name}`} className={styles.failure}>
                  <strong className={styles.failureName}>{failure.name}</strong>
                  <span className={styles.failureReason}>{failure.reason}</span>
                </li>
              ))}
            </ul>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                onClick={() => setResult(null)}
                autoFocus
              >
                关闭
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={retryFailed}
              >
                重试失败项
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
