import { useEffect, useRef } from 'react';
import { renderWatermark } from '../../core/watermark';
import { useSpecStore } from '../spec/store';
import styles from './BatchPane.module.css';
import type { SourceImage } from './store';

interface ThumbnailProps {
  image: SourceImage;
}

export function Thumbnail({ image }: ThumbnailProps) {
  const spec = useSpecStore((state) => state.spec);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = image.thumbnail?.width ?? 160;
    canvas.height = image.thumbnail?.height ?? 120;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!image.thumbnail) {
      return;
    }

    context.drawImage(image.thumbnail, 0, 0);
    renderWatermark(context, spec, canvas.width, canvas.height);
  }, [image.thumbnail, spec]);

  return <canvas ref={canvasRef} className={styles.thumbnail} aria-hidden="true" />;
}
