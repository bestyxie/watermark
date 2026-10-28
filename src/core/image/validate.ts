export const MAX_FILE_MB = 30;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_FILES = 50;

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ACCEPTED_EXTENSION = /\.(jpe?g|png|webp)$/i;

export function validateImageFile(file: File): string | null {
  const supported = file.type ? ACCEPTED_TYPES.has(file.type) : ACCEPTED_EXTENSION.test(file.name);

  if (!supported) {
    return '不是支持的图片格式（仅支持 JPG/PNG/WebP）';
  }

  if (file.size > MAX_FILE_BYTES) {
    return `超过 ${MAX_FILE_MB}MB`;
  }

  return null;
}
