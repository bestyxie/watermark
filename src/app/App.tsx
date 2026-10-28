import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent as ReactDragEvent } from 'react';
import { BatchPane } from '../features/batch/BatchPane';
import { useBatchStore } from '../features/batch/store';
import { ExportBar } from '../features/export/ExportBar';
import { NoticeStack } from '../features/notices/NoticeStack';
import { Preview } from '../features/preview/Preview';
import { SpecPanel } from '../features/spec/SpecPanel';
import { useMediaQuery } from '../shared/useMediaQuery';
import styles from './App.module.css';

export function App() {
  const addFiles = useBatchStore((state) => state.addFiles);
  const isCompact = useMediaQuery('(max-width: 1023px)');
  const [paramsOpen, setParamsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);

      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      void addFiles(files);
    };

    window.addEventListener('paste', onPaste);

    return () => {
      window.removeEventListener('paste', onPaste);
    };
  }, [addFiles]);

  const openPicker = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length > 0) {
      void addFiles(files);
    }
  };

  const onDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);

    if (dragDepth.current === 0) {
      setDragging(false);
    }
  };

  const onDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) {
      void addFiles(files);
    }
  };

  return (
    <div
      className={styles.app}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>watermark</p>
          <h1 className={styles.title}>图片水印工具</h1>
        </div>
        <p className={styles.privacy}>图片不会上传，全部在本机处理</p>
      </header>

      <div className={styles.workspace}>
        <div className={styles.batchArea}>
          <BatchPane onPick={openPicker} />
        </div>

        <div className={styles.previewArea}>
          <Preview
            onPick={openPicker}
            onOpenParams={() => setParamsOpen(true)}
            showParamsButton={isCompact}
          />
        </div>

        <div className={`${styles.specHost} ${paramsOpen ? styles.specOpen : ''}`}>
          <SpecPanel onClose={isCompact ? () => setParamsOpen(false) : undefined} />
        </div>
      </div>

      <ExportBar />

      {isCompact && paramsOpen && (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setParamsOpen(false)}
          aria-label="关闭参数面板"
        />
      )}

      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onFileChange}
      />

      <NoticeStack />

      {dragging && (
        <div className={styles.dropOverlay}>
          <span>松开以导入图片</span>
        </div>
      )}
    </div>
  );
}
