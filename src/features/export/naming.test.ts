import { describe, expect, it } from 'vitest';
import { extensionForMime, outputMimeType, resolveOutputName, zipName } from './naming';

describe('outputMimeType', () => {
  it('maps supported MIME types and extensions', () => {
    expect(outputMimeType({ name: 'a.jpg', type: 'image/jpeg' })).toBe('image/jpeg');
    expect(outputMimeType({ name: 'a.jpeg', type: 'image/jpg' })).toBe('image/jpeg');
    expect(outputMimeType({ name: 'a.PNG', type: '' })).toBe('image/png');
    expect(outputMimeType({ name: 'a.webp', type: 'image/webp' })).toBe('image/webp');
  });

  it('falls back to JPEG for unknown input', () => {
    expect(outputMimeType({ name: 'a.unknown', type: '' })).toBe('image/jpeg');
  });
});

describe('extensionForMime', () => {
  it('uses the actual encoded type and keeps jpeg spelling', () => {
    expect(extensionForMime('image/png', 'a.webp')).toBe('png');
    expect(extensionForMime('image/jpeg', 'a.jpeg')).toBe('jpeg');
    expect(extensionForMime('image/jpeg', 'a.jpg')).toBe('jpg');
    expect(extensionForMime('image/jpeg', 'a.png')).toBe('jpg');
  });
});

describe('resolveOutputName', () => {
  it('adds the suffix and dedupes case-insensitively', () => {
    const used = new Set<string>();

    expect(resolveOutputName('photo.jpg', 'image/jpeg', used)).toBe('photo-watermarked.jpg');
    expect(resolveOutputName('photo.jpg', 'image/jpeg', used)).toBe('photo-watermarked-1.jpg');
    expect(resolveOutputName('PHOTO.jpg', 'image/jpeg', used)).toBe('PHOTO-watermarked-2.jpg');
  });

  it('uses the actual extension when WebP falls back to PNG', () => {
    expect(resolveOutputName('photo.webp', 'image/png', new Set())).toBe('photo-watermarked.png');
  });

  it('sanitizes path separators and control characters', () => {
    expect(resolveOutputName('../a/b.jpg', 'image/jpeg', new Set())).toBe('.._a_b-watermarked.jpg');
  });
});

describe('zipName', () => {
  it('formats a timestamped zip name', () => {
    expect(zipName(new Date(2026, 9, 28, 12, 34, 56))).toBe('watermarked-20261028-123456.zip');
  });
});
