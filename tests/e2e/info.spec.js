// Gazo E2E — Info Tool (comprehensive)
import { test, expect } from '@playwright/test';
import { getExtensionId, openTool, goHome, docScreenshot } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');
const EXIF = path.resolve(FIXTURES, 'exif');

test.describe('Info Tool', () => {
  let page, extId, browserName;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    extId = await getExtensionId(context);
    page = await context.newPage();
    browserName = browser.browserType().name();
    await page.goto(`chrome-extension://${extId}/editor/editor.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test.afterAll(async () => { await page.close(); });

  // ══════════════════════════════════════════
  //  NAVIGATION & INITIAL STATE
  // ══════════════════════════════════════════
  test('opens info mode from home', async () => {
    await openTool(page, 'info');
    await expect(page.locator('#mode-info')).toBeVisible();
  });

  test('dropzone visible when no image loaded', async () => {
    await expect(page.locator('#info-drop')).toBeVisible();
    await expect(page.locator('#info-preview')).toBeHidden();
    await expect(page.locator('#info-details-grid')).toBeHidden();
  });

  // ── Ribbon buttons disabled initially ──
  test('Copy Data URI disabled initially', async () => {
    await expect(page.locator('#btn-copy-base64')).toBeDisabled();
  });

  test('Copy JSON disabled initially', async () => {
    await expect(page.locator('#btn-info-copy-json')).toBeDisabled();
  });

  test('Strip Metadata disabled initially', async () => {
    await expect(page.locator('#btn-info-strip-meta')).toBeDisabled();
  });

  test('Reset button exists', async () => {
    await expect(page.locator('#btn-info-reset')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  LOAD PNG — No EXIF
  // ══════════════════════════════════════════
  test('loads PNG via file chooser', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#info-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#info-drop')).toBeHidden();
    await expect(page.locator('#info-preview')).toBeVisible();
    await expect(page.locator('#info-details-grid')).toBeVisible();
  });

  test('file info shows filename', async () => {
    const text = await page.locator('#info-file-details').textContent();
    expect(text).toContain('test-500x300.png');
  });

  test('file info shows dimensions', async () => {
    const text = await page.locator('#info-file-details').textContent();
    expect(text).toContain('500');
    expect(text).toContain('300');
  });

  test('file info shows file size', async () => {
    const text = await page.locator('#info-file-details').textContent();
    expect(text).toMatch(/[0-9.]+\s*(B|KB|MB)/);
  });

  test('file info shows type', async () => {
    const text = await page.locator('#info-file-details').textContent();
    expect(text).toMatch(/png/i);
  });

  test('file info shows aspect ratio', async () => {
    const text = await page.locator('#info-file-details').textContent();
    expect(text).toMatch(/\d+:\d+/);
  });

  test('EXIF shows no data for PNG', async () => {
    const text = await page.locator('#info-exif').textContent();
    expect(text).toMatch(/No EXIF/i);
  });

  test('Strip Metadata disabled for PNG without EXIF', async () => {
    await expect(page.locator('#btn-info-strip-meta')).toBeDisabled();
  });

  test('Copy Data URI enabled after load', async () => {
    await expect(page.locator('#btn-copy-base64')).toBeEnabled();
  });

  test('Copy JSON enabled after load', async () => {
    await expect(page.locator('#btn-info-copy-json')).toBeEnabled();
  });

  test('hash section shows SHA-256 and pHash', async () => {
    await page.waitForTimeout(500); // hash computation
    const text = await page.locator('#info-hash').textContent();
    expect(text).toContain('SHA-256');
    expect(text).toContain('pHash');
  });

  test('screenshot: PNG info', async () => {
    await docScreenshot(page, 'info-png', browserName);
  });

  // ══════════════════════════════════════════
  //  RESET
  // ══════════════════════════════════════════
  test('reset restores dropzone', async () => {
    await page.click('#btn-info-reset');
    await page.waitForTimeout(300);
    await expect(page.locator('#info-drop')).toBeVisible();
    await expect(page.locator('#info-preview')).toBeHidden();
    await expect(page.locator('#info-details-grid')).toBeHidden();
    await expect(page.locator('#btn-copy-base64')).toBeDisabled();
    await expect(page.locator('#btn-info-copy-json')).toBeDisabled();
    await expect(page.locator('#btn-info-strip-meta')).toBeDisabled();
  });

  // ══════════════════════════════════════════
  //  LOAD EXIF JPEG — With metadata
  // ══════════════════════════════════════════
  test('loads EXIF JPEG with camera data', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#info-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(EXIF, 'canon-40d.jpg'));
    await page.waitForTimeout(800);
    await expect(page.locator('#info-preview')).toBeVisible();
  });

  test('EXIF section has data for JPEG', async () => {
    const text = await page.locator('#info-exif').textContent();
    expect(text).not.toMatch(/No EXIF/i);
    expect(text.length).toBeGreaterThan(20);
  });

  test('Strip Metadata enabled for EXIF JPEG', async () => {
    await expect(page.locator('#btn-info-strip-meta')).toBeEnabled();
  });

  test('JPEG structure shows markers', async () => {
    const text = await page.locator('#info-structure').textContent();
    // JPEG should have structure markers
    expect(text.length).toBeGreaterThan(10);
  });

  test('screenshot: EXIF JPEG info', async () => {
    await docScreenshot(page, 'info-exif-jpeg', browserName);
  });

  // ══════════════════════════════════════════
  //  RESET & LOAD ORIENTATION JPEG
  // ══════════════════════════════════════════
  test('reset and load rotated photo', async () => {
    await page.click('#btn-info-reset');
    await page.waitForTimeout(300);
    const fc = page.waitForEvent('filechooser');
    await page.click('#info-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(EXIF, 'orientation-Portrait_6.jpg'));
    await page.waitForTimeout(800);
    await expect(page.locator('#info-preview')).toBeVisible();
    const text = await page.locator('#info-file-details').textContent();
    expect(text).toContain('orientation-Portrait_6.jpg');
  });

  // ══════════════════════════════════════════
  //  RESET & LOAD TINY IMAGE
  // ══════════════════════════════════════════
  test('reset and load tiny image', async () => {
    await page.click('#btn-info-reset');
    await page.waitForTimeout(300);
    const fc = page.waitForEvent('filechooser');
    await page.click('#info-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(FIXTURES, 'test-tiny-32x32.png'));
    await page.waitForTimeout(800);
    const text = await page.locator('#info-file-details').textContent();
    expect(text).toContain('32');
  });

  // ══════════════════════════════════════════
  //  DPI SECTION
  // ══════════════════════════════════════════
  test('DPI section exists', async () => {
    await expect(page.locator('#info-dpi')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  BACK TO HOME
  // ══════════════════════════════════════════
  test('back returns to home', async () => {
    await goHome(page);
    await expect(page.locator('#home')).toBeVisible();
  });
});
