import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';

const FIXTURES = path.join(process.cwd(), 'e2e', 'fixtures');
const JPEG = path.join(FIXTURES, 'sample.jpg');
const PNG = path.join(FIXTURES, 'sample.png');
const BROKEN = path.join(FIXTURES, 'broken.jpg');
const NOT_IMAGE = path.join(FIXTURES, 'not-image.txt');

async function upload(page: Page, files: string | string[]): Promise<void> {
  await page.locator('input[type=file]').setInputFiles(files);
}

async function uploadDuplicateJpeg(page: Page, count: number): Promise<void> {
  const buffer = await readFile(JPEG);

  await page.locator('input[type=file]').setInputFiles(
    Array.from({ length: count }, () => ({
      name: 'sample.jpg',
      mimeType: 'image/jpeg',
      buffer,
    })),
  );
}

async function waitForReady(page: Page, count: number): Promise<void> {
  await expect(page.locator('[role=listitem]')).toHaveCount(count);
  await expect(page.locator('[role=listitem]').filter({ hasText: / × / })).toHaveCount(count);

  const action = count > 1 ? '打包 ZIP' : '导出';
  await expect(page.getByRole('button', { name: action, exact: true })).toBeVisible();
}

async function readDownload(download: Download): Promise<Buffer> {
  const file = await download.path();

  if (!file) {
    throw new Error('download has no local path');
  }

  return readFile(file);
}

test('imports a single JPEG and exports it in the original format', async ({ page }) => {
  await page.goto('/');
  await upload(page, JPEG);
  await waitForReady(page, 1);

  await expect(page.locator('input[aria-label="导出质量"]')).toHaveCount(1);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出', exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('sample-watermarked.jpg');

  const buffer = await readDownload(download);
  expect(buffer.subarray(0, 2).toString('hex')).toBe('ffd8');
  expect(buffer.length).toBeGreaterThan(1024);
});

test('exports a mixed batch as a ZIP with original formats', async ({ page }) => {
  await page.goto('/');
  await upload(page, [JPEG, PNG]);
  await waitForReady(page, 2);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '打包 ZIP' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^watermarked-\d{8}-\d{6}\.zip$/);

  const entries = unzipSync(new Uint8Array(await readDownload(download)));

  expect(Object.keys(entries).sort()).toEqual(['sample-watermarked.jpg', 'sample-watermarked.png']);
  expect(Buffer.from(entries['sample-watermarked.jpg'].subarray(0, 2)).toString('hex')).toBe(
    'ffd8',
  );
  expect(Buffer.from(entries['sample-watermarked.png'].subarray(0, 4)).toString('hex')).toBe(
    '89504e47',
  );
});

test('downloads each image and dedupes identical filenames', async ({ page }) => {
  await page.goto('/');
  await uploadDuplicateJpeg(page, 2);
  await waitForReady(page, 2);

  const downloads: Download[] = [];
  page.on('download', (download) => downloads.push(download));

  await page.getByRole('button', { name: '逐张下载' }).click();
  await expect.poll(() => downloads.length, { timeout: 30_000 }).toBe(2);

  expect(downloads.map((download) => download.suggestedFilename()).sort()).toEqual([
    'sample-watermarked-1.jpg',
    'sample-watermarked.jpg',
  ]);
});

test('hides the quality control for PNG-only batches', async ({ page }) => {
  await page.goto('/');
  await upload(page, PNG);
  await waitForReady(page, 1);

  await expect(page.locator('input[aria-label="导出质量"]')).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出', exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('sample-watermarked.png');

  const buffer = await readDownload(download);
  expect(buffer.subarray(0, 4).toString('hex')).toBe('89504e47');
});

test('rejects unsupported files and isolates decode failures', async ({ page }) => {
  await page.goto('/');

  await upload(page, NOT_IMAGE);
  await expect(page.getByText(/不是支持的图片格式/)).toBeVisible();
  await expect(page.locator('[role=listitem]')).toHaveCount(0);

  await upload(page, BROKEN);
  await expect(page.locator('[role=listitem]')).toHaveCount(1);
  await expect(
    page.locator('[role=listitem]').getByText('图片解码失败', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '导出', exact: true })).toBeDisabled();
  await expect(page.getByText('没有可导出的图片')).toBeVisible();
});

test('disables export when the watermark text is blank', async ({ page }) => {
  await page.goto('/');
  await upload(page, JPEG);
  await waitForReady(page, 1);

  await page.locator('textarea').fill('   ');

  await expect(page.getByRole('button', { name: '导出', exact: true })).toBeDisabled();
  await expect(page.getByText('水印文本为空').first()).toBeVisible();
});

test('updates the preview on parameter change and restores it after reload', async ({ page }) => {
  await page.goto('/');
  await upload(page, JPEG);
  await waitForReady(page, 1);

  const canvas = page.locator('canvas[aria-label="水印预览画布"]');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(200);

  const before = await canvas.screenshot();

  await page.locator('textarea').fill('机密文件');

  await expect.poll(async () => Buffer.compare(before, await canvas.screenshot()) !== 0).toBe(true);
  await expect(page.locator('textarea')).toHaveValue('机密文件');

  await page.waitForTimeout(450);
  await page.reload();

  await expect(page.locator('textarea')).toHaveValue('机密文件');
});

test('toggles the preview between fit and 1:1', async ({ page }) => {
  await page.goto('/');
  await upload(page, JPEG);
  await waitForReady(page, 1);
  await expect(page.locator('canvas[aria-label="水印预览画布"]')).toBeVisible();

  await page.getByRole('button', { name: '1:1' }).click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '适应屏幕' })).toBeVisible();

  await page.getByRole('button', { name: '适应屏幕' }).click();
  await expect(page.getByRole('button', { name: '1:1' })).toBeVisible();
});

test('cancels a per-file export before it completes', async ({ page }) => {
  await page.goto('/');
  await uploadDuplicateJpeg(page, 10);
  await waitForReady(page, 10);

  const downloads: Download[] = [];
  page.on('download', (download) => downloads.push(download));

  await page.getByRole('button', { name: '逐张下载' }).click();
  await expect(page.getByText(/完成 \d+ \/ 10/)).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();

  await expect(page.getByText('已取消导出')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500);

  expect(downloads.length).toBeLessThan(10);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens the parameter sheet and shows the export bar', async ({ page }) => {
    await page.goto('/');
    await upload(page, [JPEG, PNG]);
    await waitForReady(page, 2);
    await expect(page.getByRole('button', { name: '打包 ZIP' })).toBeVisible();

    const panel = page.locator('aside[aria-label="水印参数"]');
    const closedY = (await panel.boundingBox())?.y ?? 0;
    expect(closedY).toBeGreaterThanOrEqual(844);

    await page.getByRole('button', { name: '参数', exact: true }).click();
    await expect.poll(async () => (await panel.boundingBox())?.y ?? 9999).toBeLessThan(300);

    await panel.getByRole('button', { name: '关闭参数面板' }).click();
    await expect.poll(async () => (await panel.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(844);
  });
});

test('falls back to the main thread when OffscreenCanvas is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'OffscreenCanvas', { value: undefined, configurable: true });
  });

  await page.goto('/');
  await upload(page, [JPEG, PNG]);
  await waitForReady(page, 2);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '打包 ZIP' }).click();
  const download = await downloadPromise;

  const entries = unzipSync(new Uint8Array(await readDownload(download)));

  expect(Object.keys(entries)).toHaveLength(2);
});
