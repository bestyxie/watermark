import { MAX_FILE_MB, MAX_FILES } from '../../core/image/validate';
import styles from './BatchPane.module.css';
import { useBatchStore } from './store';
import type { SourceImage } from './store';
import { Thumbnail } from './Thumbnail';

interface BatchPaneProps {
  onPick: () => void;
}

function describe(image: SourceImage): string {
  if (image.status === 'error') {
    return image.error ?? '解码失败';
  }

  if (image.status === 'ready') {
    return `${image.width} × ${image.height}`;
  }

  if (image.status === 'decoding') {
    return '解码中…';
  }

  return '等待解码';
}

export function BatchPane({ onPick }: BatchPaneProps) {
  const images = useBatchStore((state) => state.images);
  const currentId = useBatchStore((state) => state.currentId);
  const selectImage = useBatchStore((state) => state.selectImage);
  const removeImage = useBatchStore((state) => state.removeImage);
  const clearImages = useBatchStore((state) => state.clearImages);
  const importing = useBatchStore((state) => state.importing);

  const onClear = () => {
    if (images.length > 1 && !window.confirm(`确定清空 ${images.length} 张图片吗？`)) {
      return;
    }

    clearImages();
  };

  return (
    <aside className={styles.pane} aria-label="图片列表">
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>图片</h2>
          <p className={styles.count}>
            {images.length} / {MAX_FILES}
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.add} onClick={onPick}>
            添加
          </button>
          <button
            type="button"
            className={styles.clear}
            onClick={onClear}
            disabled={images.length === 0}
          >
            清空
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <button type="button" className={styles.empty} onClick={onPick}>
          <span className={styles.emptyTitle}>拖入、粘贴或选择图片</span>
          <span className={styles.emptyHint}>
            JPG / PNG / WebP，单张 ≤ {MAX_FILE_MB}MB，最多 {MAX_FILES} 张
          </span>
        </button>
      ) : (
        <div className={styles.list} role="list">
          {images.map((image) => {
            const selected = image.id === currentId;

            return (
              <div
                key={image.id}
                role="listitem"
                className={selected ? `${styles.item} ${styles.selected}` : styles.item}
              >
                <button
                  type="button"
                  className={styles.itemMain}
                  onClick={() => selectImage(image.id)}
                  aria-pressed={selected}
                >
                  <span className={styles.thumbWrap}>
                    <Thumbnail image={image} />
                    {image.status === 'decoding' && <span className={styles.badge}>解码中</span>}
                    {image.status === 'error' && <span className={styles.badgeError}>失败</span>}
                  </span>
                  <span className={styles.meta}>
                    <span className={styles.name} title={image.name}>
                      {image.name}
                    </span>
                    <span
                      className={
                        image.status === 'error'
                          ? `${styles.detail} ${styles.detailError}`
                          : styles.detail
                      }
                    >
                      {describe(image)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeImage(image.id)}
                  aria-label={`移除 ${image.name}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {importing && <p className={styles.importing}>正在解码图片…</p>}
    </aside>
  );
}
