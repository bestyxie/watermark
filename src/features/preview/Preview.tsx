import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPreviewSource } from '../../core/image/load';
import { renderWatermark } from '../../core/watermark';
import type { WatermarkSpec } from '../../core/watermark';
import { useBatchStore } from '../batch/store';
import type { SourceImage } from '../batch/store';
import { useSpecStore } from '../spec/store';
import styles from './Preview.module.css';

interface PreviewProps {
  onPick: () => void;
  onOpenParams: () => void;
  showParamsButton: boolean;
}

interface WorkspaceProps {
  image: SourceImage;
  spec: WatermarkSpec;
  onOpenParams: () => void;
  showParamsButton: boolean;
}

interface PlaceholderProps {
  image: SourceImage | null;
  onPick: () => void;
  onOpenParams: () => void;
  showParamsButton: boolean;
}

interface ToolbarProps {
  image: SourceImage | null;
  onOpenParams: () => void;
  showParamsButton: boolean;
  zoomLabel?: string;
  zoomed?: boolean;
  onToggleZoom?: () => void;
}

interface Size {
  width: number;
  height: number;
}

interface DragState {
  pointerId: number;
  x: number;
  y: number;
  panX: number;
  panY: number;
}

function PreviewToolbar({
  image,
  onOpenParams,
  showParamsButton,
  zoomLabel,
  zoomed,
  onToggleZoom,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.info}>
        {image ? (
          <>
            <strong className={styles.name} title={image.name}>
              {image.name}
            </strong>
            <span className={styles.dimensions}>
              {image.width && image.height ? `${image.width} × ${image.height}` : '读取中…'}
            </span>
          </>
        ) : (
          <span className={styles.dimensions}>未导入图片</span>
        )}
      </div>

      <div className={styles.actions}>
        {zoomLabel && <span className={styles.zoom}>{zoomLabel}</span>}
        {onToggleZoom && (
          <button type="button" className={styles.toolButton} onClick={onToggleZoom}>
            {zoomed ? '适应屏幕' : '1:1'}
          </button>
        )}
        {showParamsButton && (
          <button type="button" className={styles.toolButton} onClick={onOpenParams}>
            参数
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewPlaceholder({ image, onPick, onOpenParams, showParamsButton }: PlaceholderProps) {
  const failed = image?.status === 'error';

  return (
    <>
      <PreviewToolbar
        image={image}
        onOpenParams={onOpenParams}
        showParamsButton={showParamsButton}
      />
      <div className={styles.stage}>
        {!image && (
          <div className={styles.placeholder}>
            <p className={styles.placeholderTitle}>导入图片开始加水印</p>
            <p className={styles.placeholderHint}>支持点击、拖拽或粘贴，全部在本机处理</p>
            <button type="button" className={styles.primary} onClick={onPick}>
              选择图片
            </button>
          </div>
        )}

        {image && !failed && <p className={styles.state}>正在准备预览…</p>}
        {image && failed && <p className={styles.error}>{image.error ?? '图片解码失败'}</p>}
      </div>
    </>
  );
}

function PreviewWorkspace({ image, spec, onOpenParams, showParamsButton }: WorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fit, setFit] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;

    createPreviewSource(image.file)
      .then((canvas) => {
        if (cancelled) {
          return;
        }

        setSource(canvas);
        setStatus('ready');
      })
      .catch((reason: unknown) => {
        if (cancelled) {
          return;
        }

        setStatus('error');
        setError(reason instanceof Error ? reason.message : '预览加载失败');
      });

    return () => {
      cancelled = true;
    };
  }, [image.file]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!source || !canvas) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      canvas.width = source.width;
      canvas.height = source.height;

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0);
      renderWatermark(context, spec, canvas.width, canvas.height);
    });

    return () => cancelAnimationFrame(frame);
  }, [source, spec]);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || !source) {
      return;
    }

    const update = () => {
      const rect = stage.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const scale = Math.min(rect.width / source.width, rect.height / source.height);
      setFit({ width: source.width * scale, height: source.height * scale });
    };

    const observer = new ResizeObserver(update);
    observer.observe(stage);
    const frame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [source]);

  const fitScale = source && fit.width > 0 ? fit.width / source.width : 0;
  const zoom = zoomed && fitScale > 0 ? 1 / fitScale : 1;
  const displayZoom = fitScale > 0 ? fitScale * zoom : 0;

  const clampPan = (next: { x: number; y: number }, scale: number) => {
    const maxX = Math.max(0, (fit.width * scale - fit.width) / 2);
    const maxY = Math.max(0, (fit.height * scale - fit.height) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  const toggleZoom = () => {
    setZoomed((value) => !value);
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (zoom === 1) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setPan(
      clampPan(
        {
          x: drag.panX + event.clientX - drag.x,
          y: drag.panY + event.clientY - drag.y,
        },
        zoom,
      ),
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <>
      <PreviewToolbar
        image={image}
        onOpenParams={onOpenParams}
        showParamsButton={showParamsButton}
        zoomLabel={source ? `${Math.round(displayZoom * 100)}%` : undefined}
        zoomed={zoomed}
        onToggleZoom={source ? toggleZoom : undefined}
      />

      <div className={styles.stage} ref={stageRef}>
        {status === 'loading' && <p className={styles.state}>正在准备预览…</p>}
        {status === 'error' && <p className={styles.error}>{error}</p>}

        {source && status === 'ready' && (
          <canvas
            ref={canvasRef}
            className={zoom !== 1 ? `${styles.canvas} ${styles.zoomed}` : styles.canvas}
            style={{
              width: fit.width || source.width,
              height: fit.height || source.height,
              visibility: fit.width > 0 ? 'visible' : 'hidden',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            onDoubleClick={toggleZoom}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="img"
            aria-label="水印预览画布"
          />
        )}
      </div>
    </>
  );
}

export function Preview({ onPick, onOpenParams, showParamsButton }: PreviewProps) {
  const image = useBatchStore(
    (state) => state.images.find((item) => item.id === state.currentId) ?? null,
  );
  const spec = useSpecStore((state) => state.spec);
  const ready = Boolean(image && image.status === 'ready' && image.width > 0 && image.height > 0);

  return (
    <section className={styles.preview} aria-label="水印预览">
      {ready && image ? (
        <PreviewWorkspace
          key={image.id}
          image={image}
          spec={spec}
          onOpenParams={onOpenParams}
          showParamsButton={showParamsButton}
        />
      ) : (
        <PreviewPlaceholder
          image={image}
          onPick={onPick}
          onOpenParams={onOpenParams}
          showParamsButton={showParamsButton}
        />
      )}
    </section>
  );
}
