import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, MAX_FILE_MB, validateImageFile } from './validate';

function fileOf(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe('validateImageFile', () => {
  it('accepts supported types', () => {
    expect(validateImageFile(fileOf('a.jpg', 'image/jpeg', 1024))).toBeNull();
    expect(validateImageFile(fileOf('a.png', 'image/png', 1024))).toBeNull();
    expect(validateImageFile(fileOf('a.webp', 'image/webp', 1024))).toBeNull();
  });

  it('falls back to the extension when the type is missing', () => {
    expect(validateImageFile(fileOf('a.JPEG', '', 1024))).toBeNull();
    expect(validateImageFile(fileOf('a.heic', '', 1024))).not.toBeNull();
  });

  it('rejects unsupported types', () => {
    expect(validateImageFile(fileOf('a.gif', 'image/gif', 1024))).not.toBeNull();
    expect(validateImageFile(fileOf('a.pdf', 'application/pdf', 1024))).not.toBeNull();
  });

  it('rejects files above the size limit', () => {
    expect(validateImageFile(fileOf('a.jpg', 'image/jpeg', MAX_FILE_BYTES + 1))).toContain(
      `${MAX_FILE_MB}MB`,
    );
    expect(validateImageFile(fileOf('a.jpg', 'image/jpeg', MAX_FILE_BYTES))).toBeNull();
  });
});
