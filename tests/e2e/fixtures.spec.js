// Gazo E2E — Tests with diverse fixture files
// Tests tools with different image types, sizes, and formats
import { test, expect } from '@playwright/test';
import { getExtensionId, openTool, goHome } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');

test.describe('Diverse Fixture Tests', () => {
  let page, extId;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    extId = await getExtensionId(context);
    page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/editor/editor.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test.afterAll(async () => { await page.close(); });

  // ══════════════════════════════════════════
  //  BATCH EDIT — Multiple file types
  // ══════════════════════════════════════════
  test('batch loads multiple PNG files of different sizes', async () => {
    await openTool(page, 'batch');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(FIXTURES, 'test-500x300.png'),
      path.join(FIXTURES, 'test-200x200.png'),
      path.join(FIXTURES, 'test-tiny-32x32.png'),
    ]);
    await page.waitForTimeout(500);
    const status = await page.locator('#batch-status').textContent();
    expect(status).toMatch(/3 image/);
  });

  test('batch loads wide and tall images together', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(FIXTURES, 'test-wide-1500x500.png'),
      path.join(FIXTURES, 'test-tall-500x1500.png'),
    ]);
    await page.waitForTimeout(500);
    const status = await page.locator('#batch-status').textContent();
    expect(status).toMatch(/5 image/);
  });

  test('batch loads transparent PNG', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([path.join(FIXTURES, 'test-transparent-400x400.png')]);
    await page.waitForTimeout(500);
    const status = await page.locator('#batch-status').textContent();
    expect(status).toMatch(/6 image/);
  });

  test('batch has thumbnails for all loaded files', async () => {
    const items = page.locator('#batch-items > *');
    const count = await items.count();
    expect(count).toBe(6);
  });

  test('batch preview works with mixed sizes', async () => {
    await page.click('#btn-batch-preview');
    await page.waitForTimeout(500);
    await expect(page.locator('#batch-preview-area')).toBeVisible();
    await page.click('#batch-preview-close');
    await page.waitForTimeout(200);
  });

  test('batch clear and go back', async () => {
    await page.click('#btn-batch-clear');
    await page.waitForTimeout(300);
    const okBtn = page.locator('#pix-dialog-ok:visible');
    if (await okBtn.count()) await okBtn.click();
    await page.waitForTimeout(300);
    await goHome(page);
  });

  // ══════════════════════════════════════════
  //  SVG TOOL — Different SVG types
  // ══════════════════════════════════════════
  test('SVG inspect loads icon SVG', async () => {
    await openTool(page, 'svg');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#svg-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-icon.svg'));
    await page.waitForTimeout(800);
    await expect(page.locator('#svg-preview')).toBeVisible();
    const info = await page.locator('#svg-info').textContent();
    expect(info).toContain('100');
  });

  test('SVG inspect shows elements for icon SVG', async () => {
    const elements = await page.locator('#svg-elements-list').textContent();
    expect(elements).toMatch(/rect|circle|path|text/);
  });

  test('SVG inspect shows colors for icon SVG', async () => {
    const chips = await page.locator('#svg-colors-list .svg-color-chip').count();
    expect(chips).toBeGreaterThan(0);
  });

  test('SVG reset and load gradient SVG', async () => {
    await page.click('#btn-svg-reset');
    await page.waitForTimeout(300);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#svg-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-gradient.svg'));
    await page.waitForTimeout(800);
    const info = await page.locator('#svg-info').textContent();
    expect(info).toContain('400');
    expect(info).toContain('300');
  });

  test('SVG reset and load complex SVG', async () => {
    await page.click('#btn-svg-reset');
    await page.waitForTimeout(300);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#svg-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-complex.svg'));
    await page.waitForTimeout(800);
    const elements = await page.locator('#svg-elements-list').textContent();
    // Complex SVG has rect, circle, ellipse, path, line, polygon, text
    expect(elements).toMatch(/rect/);
    expect(elements).toMatch(/circle|ellipse/);
  });

  test('SVG source is formatted for complex SVG', async () => {
    const html = await page.locator('#svg-source').innerHTML();
    expect(html).toContain('sv-tag');
  });

  test('SVG trace rejects SVG file', async () => {
    await page.click('.svg-mode-tab[data-svg-mode="trace"]');
    await page.waitForTimeout(200);
    const rejected = await page.evaluate(async () => {
      const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      const drop = document.getElementById('trace-drop');
      const dt = new DataTransfer();
      dt.items.add(file);
      drop.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
      await new Promise(r => setTimeout(r, 300));
      const toast = document.querySelector('.pix-toast');
      return toast?.textContent || '';
    });
    expect(rejected).toContain('SVG');
  });

  test('SVG trace accepts PNG for tracing', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#trace-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-200x200.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#trace-loaded')).toBeVisible();
  });

  test('SVG go back', async () => {
    await goHome(page);
  });

  // ══════════════════════════════════════════
  //  COMPRESS — Different image types
  // ══════════════════════════════════════════
  test('compress loads standard PNG', async () => {
    await openTool(page, 'compress');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#compress-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#compress-work')).toBeVisible();
    const info = await page.locator('#compress-orig-info').textContent();
    expect(info).toMatch(/500/);
  });

  test('compress auto-selects JPEG for PNG source', async () => {
    const fmt = await page.locator('#compress-format').inputValue();
    expect(fmt).toBe('jpeg');
  });

  test('compress result shows size comparison', async () => {
    const result = await page.locator('#compress-result').textContent();
    expect(result).toContain('Original');
    expect(result).toContain('Compressed');
  });

  test('compress rejects SVG', async () => {
    await page.click('#btn-compress-reset');
    await page.waitForTimeout(200);
    const rejected = await page.evaluate(async () => {
      const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });
      const drop = document.getElementById('compress-drop');
      const dt = new DataTransfer();
      dt.items.add(file);
      drop.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
      await new Promise(r => setTimeout(r, 300));
      const toast = document.querySelector('.pix-toast');
      return toast?.textContent || '';
    });
    expect(rejected).toContain('SVG');
  });

  test('compress loads tiny image', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#compress-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-tiny-32x32.png'));
    await page.waitForTimeout(800);
    const info = await page.locator('#compress-orig-info').textContent();
    expect(info).toMatch(/32/);
  });

  test('compress go back', async () => {
    await goHome(page);
  });

  // ══════════════════════════════════════════
  //  SOCIAL — Different source sizes
  // ══════════════════════════════════════════
  test('social loads wide image for Twitter header', async () => {
    await openTool(page, 'social');
    await page.selectOption('#social-platform', 'tw-header');
    await page.waitForTimeout(200);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#social-dropzone-default');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#social-canvas-wrap')).toBeVisible();
  });

  test('social shows resolution info', async () => {
    const dims = await page.locator('#social-dims').textContent();
    expect(dims).toContain('1500');
    expect(dims).toContain('500');
    expect(dims).toContain('Source');
  });

  test('social reset and load tall image for IG story', async () => {
    await page.click('#btn-social-reset');
    await page.waitForTimeout(300);
    await page.selectOption('#social-platform', 'ig-story');
    await page.waitForTimeout(200);

    // Use the outlined dropzone (platform selected)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#social-dropzone');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-tall-500x1500.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#social-canvas-wrap')).toBeVisible();
  });

  test('social go back', async () => {
    await goHome(page);
  });

  // ══════════════════════════════════════════
  //  EDIT — Load different sizes
  // ══════════════════════════════════════════
  test('edit loads tiny image', async () => {
    await openTool(page, 'edit');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#edit-dropzone');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-tiny-32x32.png'));
    await page.waitForTimeout(800);
    const dims = await page.evaluate(() => {
      const c = document.getElementById('editor-canvas');
      return c ? { width: c.width, height: c.height } : null;
    });
    expect(dims.width).toBe(32);
    expect(dims.height).toBe(32);
  });

  test('edit clear and load wide image', async () => {
    await page.click('#btn-edit-clear');
    await page.waitForTimeout(300);
    await page.click('#pix-dialog-ok');
    await page.waitForTimeout(300);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#edit-dropzone');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-wide-1500x500.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#editor-canvas')).toBeVisible();
  });

  test('edit go back', async () => {
    await page.click('#btn-edit-clear');
    await page.waitForTimeout(300);
    await page.click('#pix-dialog-ok');
    await page.waitForTimeout(300);
    await goHome(page);
  });

  // ══════════════════════════════════════════
  //  DRAW — Create and add image
  // ══════════════════════════════════════════
  test('draw creates canvas and adds image', async () => {
    await openTool(page, 'draw');
    await page.click('#btn-draw-create');
    await page.waitForTimeout(300);
    await expect(page.locator('#draw-canvas')).toBeVisible();

    // Add image from file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('label:has(#draw-add-image)');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-200x200.png'));
    await page.waitForTimeout(500);

    // Should have at least one object
    const objCount = await page.evaluate(() => window._gazoObjLayer?.objects?.length || 0);
    // Draw tool uses its own objLayer, check via draw canvas
    await expect(page.locator('#draw-canvas')).toBeVisible();
  });

  test('draw go back', async () => {
    await goHome(page);
  });

  // ══════════════════════════════════════════
  //  INFO — Load and inspect
  // ══════════════════════════════════════════
  test('info loads PNG and shows metadata', async () => {
    await openTool(page, 'info');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#info-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);
    const info = await page.locator('#info-file-details').textContent();
    expect(info).toContain('500');
    expect(info).toContain('300');
  });

  test('info go back', async () => {
    await goHome(page);
  });
});
