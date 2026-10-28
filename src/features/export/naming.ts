export type OutputMime = 'image/jpeg' | 'image/png' | 'image/webp';

const MIME_BY_EXTENSION: Record<string, OutputMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function outputMimeType(item: { name: string; type: string }): OutputMime {
  const type = item.type.toLowerCase();

  if (type === 'image/jpg') {
    return 'image/jpeg';
  }

  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') {
    return type;
  }

  const extension = item.name.split('.').pop()?.toLowerCase() ?? '';

  return MIME_BY_EXTENSION[extension] ?? 'image/jpeg';
}

export function extensionForMime(mime: string, originalName = ''): string {
  if (mime === 'image/png') {
    return 'png';
  }

  if (mime === 'image/webp') {
    return 'webp';
  }

  const originalExtension = originalName.split('.').pop()?.toLowerCase();

  return originalExtension === 'jpeg' || originalExtension === 'jpg' ? originalExtension : 'jpg';
}

function sanitizeBase(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, '');
  const safe = Array.from(withoutExtension, (character) => {
    const code = character.charCodeAt(0);

    if (code < 32 || /[\\/:*?"<>|]/.test(character)) {
      return '_';
    }

    return character;
  })
    .join('')
    .trim();

  return safe || 'image';
}

export function resolveOutputName(originalName: string, mime: string, used: Set<string>): string {
  const base = sanitizeBase(originalName);
  const extension = extensionForMime(mime, originalName);
  let candidate = `${base}-watermarked.${extension}`;
  let index = 1;

  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-watermarked-${index}.${extension}`;
    index += 1;
  }

  used.add(candidate.toLowerCase());

  return candidate;
}

export function zipName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');

  return `watermarked-${stamp}.zip`;
}
