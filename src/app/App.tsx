import { useEffect, useRef } from 'react';
import { DEFAULT_SPEC, renderWatermark } from '../core/watermark';
import styles from './App.module.css';

const DEMO_WIDTH = 960;
const DEMO_HEIGHT = 600;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = DEMO_WIDTH * dpr;
    canvas.height = DEMO_HEIGHT * dpr;

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#dbeafe');
    gradient.addColorStop(0.5, '#f8fafc');
    gradient.addColorStop(1, '#fde68a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    renderWatermark(context, DEFAULT_SPEC, canvas.width, canvas.height);
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>watermark</p>
        <h1 className={styles.title}>图片水印工具</h1>
        <p className={styles.lede}>
          骨架已就绪：渲染核心、参数规格与领域文档已落地。下一步接入导入与参数面板。
        </p>
      </header>

      <section className={styles.preview} aria-label="水印渲染演示">
        <canvas ref={canvasRef} className={styles.canvas} />
      </section>

      <footer className={styles.footer}>
        <span>默认参数渲染演示</span>
        <span>图片不会上传，全部在本机处理</span>
      </footer>
    </main>
  );
}
