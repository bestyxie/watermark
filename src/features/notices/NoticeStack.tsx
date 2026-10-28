import { useEffect } from 'react';
import { useBatchStore } from '../batch/store';
import styles from './NoticeStack.module.css';

const NOTICE_TIMEOUT = 6000;

export function NoticeStack() {
  const notices = useBatchStore((state) => state.notices);
  const dismissNotice = useBatchStore((state) => state.dismissNotice);

  useEffect(() => {
    if (notices.length === 0) {
      return;
    }

    const timers = notices.map((notice) =>
      window.setTimeout(() => dismissNotice(notice.id), NOTICE_TIMEOUT),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissNotice, notices]);

  if (notices.length === 0) {
    return null;
  }

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={notice.tone === 'error' ? `${styles.notice} ${styles.error}` : styles.notice}
        >
          <span className={styles.message}>{notice.message}</span>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => dismissNotice(notice.id)}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
