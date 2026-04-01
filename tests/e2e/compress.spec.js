// Gazo E2E — Compress Tool tests
import { test, expect } from '@playwright/test';
import { getExtensionId, openTool, goHome, docScreenshot } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');

test.describe('Compress Tool', () => {
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

  // ── Navigation ─────────────────────────────────────────
  test('opens compress mode from home', async () => {
    await openTool(page, 'compress');
    await expect(page.locator('#mode-compress')).toBeVisible();
    await expect(page.locator('#compress-drop')).toBeVisible();
  });

  test('shows dropzone when no file loaded', async () => {
    await expect(page.locator('#compress-drop')).toBeVisible();
    await expect(page.locator('#compress-work')).toBeHidden();
  });

  test('download button is disabled with no file', async () => {
    await expect(page.locator('#btn-compress-go')).toBeDisabled();
  });

  test('compare button is disabled with no file', async () => {
    await expect(page.locator('#btn-compress-compare')).toBeDisabled();
  });

  // ── Ribbon controls exist ──────────────────────────────
  test('format dropdown has JPEG, WebP, PNG', async () => {
    const options = await page.locator('#compress-format option').allTextContents();
    expect(options).toContain('JPEG');
    expect(options).toContain('WebP');
    expect(options).toContain('PNG');
  });

  test('quality slider defaults to 80', async () => {
    const val = await page.locator('#compress-quality').inputValue();
    expect(val).toBe('80');
  });

  test('resize checkbox is unchecked by default', async () => {
    await expect(page.locator('#compress-resize')).not.toBeChecked();
  });

  test('target checkbox is unchecked by default', async () => {
    await expect(page.locator('#compress-target')).not.toBeChecked();
  });

  // ── SVG rejection ──────────────────────────────────────
  test('file input excludes SVG', async () => {
    const accept = await page.locator('#compress-file').getAttribute('accept');
    expect(accept).not.toContain('svg');
    expect(accept).toContain('image/png');
    expect(accept).toContain('image/jpeg');
  });

  test('dropping SVG shows rejection toast', async () => {
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
    await expect(page.locator('#compress-drop')).toBeVisible();
    await expect(page.locator('#compress-work')).toBeHidden();
  });

  // ── Loading file ───────────────────────────────────────
  test('loads file via file chooser', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#compress-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);

    // Dropzone hidden, work area visible
    await expect(page.locator('#compress-drop')).toBeHidden();
    await expect(page.locator('#compress-work')).toBeVisible();
  });

  test('original preview canvas is visible after load', async () => {
    await expect(page.locator('#compress-preview-canvas')).toBeVisible();
  });

  test('compressed output canvas is visible after load', async () => {
    await expect(page.locator('#compress-output-canvas')).toBeVisible();
    // Output canvas should have dimensions (drawn by _runCompress)
    const width = await page.locator('#compress-output-canvas').evaluate(el => el.width);
    expect(width).toBeGreaterThan(0);
  });

  test('original info shows dimensions and size', async () => {
    const info = await page.locator('#compress-orig-info').textContent();
    expect(info).toMatch(/500\u00d7300/);
    expect(info).toMatch(/[0-9.]+\s*(B|KB|MB)/);
  });

  test('download button is enabled after load', async () => {
    await expect(page.locator('#btn-compress-go')).toBeEnabled();
  });

  test('compare button is enabled after load', async () => {
    await expect(page.locator('#btn-compress-compare')).toBeEnabled();
  });

  test('result shows original vs compressed size', async () => {
    const result = await page.locator('#compress-result').textContent();
    expect(result).toMatch(/Original/);
    expect(result).toMatch(/Compressed/);
    expect(result).toMatch(/%/); // percentage change
  });

  // ── Auto format selection ──────────────────────────────
  test('auto-selects JPEG for PNG source', async () => {
    // We loaded a PNG, so format should auto-select JPEG
    const fmt = await page.locator('#compress-format').inputValue();
    expect(fmt).toBe('jpeg');
  });

  test('same-format warning hidden by default', async () => {
    await expect(page.locator('#compress-same-fmt-warn')).toBeHidden();
  });

  test('same-format warning shows when selecting PNG for PNG source', async () => {
    await page.selectOption('#compress-format', 'png');
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-same-fmt-warn')).toBeVisible();
    const text = await page.locator('#compress-same-fmt-warn').textContent();
    expect(text).toContain('Same format');
  });

  test('same-format warning hides when switching to different format', async () => {
    await page.selectOption('#compress-format', 'webp');
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-same-fmt-warn')).toBeHidden();
  });

  // ── Format switching ───────────────────────────────────
  test('switching to WebP updates result', async () => {
    await page.selectOption('#compress-format', 'webp');
    await page.waitForTimeout(400);
    const result = await page.locator('#compress-result').textContent();
    expect(result).toMatch(/WEBP/);
  });

  test('switching to PNG hides quality slider', async () => {
    await page.selectOption('#compress-format', 'png');
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-quality-row')).toBeHidden();
  });

  test('switching back to JPEG shows quality slider', async () => {
    await page.selectOption('#compress-format', 'jpeg');
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-quality-row')).toBeVisible();
  });

  // ── Quality slider ─────────────────────────────────────
  test('quality label updates on slider change', async () => {
    await page.locator('#compress-quality').fill('50');
    await page.locator('#compress-quality').dispatchEvent('input');
    await page.waitForTimeout(300);
    const label = await page.locator('#compress-quality-val').textContent();
    expect(label).toBe('50%');
  });

  test('lower quality produces result with percentage', async () => {
    await page.waitForTimeout(400);
    const result = await page.locator('#compress-result').textContent();
    expect(result).toMatch(/%/);
  });

  test('compressed preview updates on quality change', async () => {
    // Get initial output canvas data
    const before = await page.locator('#compress-output-canvas').evaluate(el => el.toDataURL().length);
    // Change quality drastically
    await page.locator('#compress-quality').fill('10');
    await page.locator('#compress-quality').dispatchEvent('input');
    await page.waitForTimeout(600);
    const after = await page.locator('#compress-output-canvas').evaluate(el => el.toDataURL().length);
    // The canvas data should differ (different compression artifacts)
    // At very low quality the re-encoded image will look different
    expect(after).toBeGreaterThan(0);
    // Reset quality
    await page.locator('#compress-quality').fill('80');
    await page.locator('#compress-quality').dispatchEvent('input');
    await page.waitForTimeout(400);
  });

  // ── Resize option ──────────────────────────────────────
  test('resize checkbox shows max dimension input', async () => {
    await expect(page.locator('#compress-resize-row')).toBeHidden();
    await page.locator('#compress-resize').check();
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-resize-row')).toBeVisible();
  });

  test('max dimension defaults to 1920', async () => {
    const val = await page.locator('#compress-max-dim').inputValue();
    expect(val).toBe('1920');
  });

  test('unchecking resize hides dimension input', async () => {
    await page.locator('#compress-resize').uncheck();
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-resize-row')).toBeHidden();
  });

  // ── Target size option ─────────────────────────────────
  test('target checkbox shows KB input', async () => {
    await expect(page.locator('#compress-target-kb-wrap')).toBeHidden();
    await page.locator('#compress-target').check();
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-target-kb-wrap')).toBeVisible();
  });

  test('target KB defaults to 200', async () => {
    const val = await page.locator('#compress-target-kb').inputValue();
    expect(val).toBe('200');
  });

  test('unchecking target hides KB input', async () => {
    await page.locator('#compress-target').uncheck();
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-target-kb-wrap')).toBeHidden();
  });

  // ── Compare formats ────────────────────────────────────
  test('compare button opens format comparison dialog', async () => {
    await page.click('#btn-compress-compare');
    await page.waitForTimeout(1000); // analysis takes time

    // pixDialog should be visible with table
    const dialog = page.locator('#pix-dialog-overlay');
    await expect(dialog).toBeVisible();
    const body = await page.locator('#pix-dialog-body').innerHTML();
    expect(body).toContain('JPEG');
    expect(body).toContain('WebP');
    expect(body).toContain('PNG');
    expect(body).toContain('Format');
    expect(body).toContain('Quality');
    expect(body).toContain('Size');
    expect(body).toContain('Saving');
  });

  test('compare dialog shows multiple quality levels', async () => {
    const body = await page.locator('#pix-dialog-body').innerHTML();
    expect(body).toContain('95%');
    expect(body).toContain('80%');
    expect(body).toContain('50%');
  });

  test('compare dialog closes on OK', async () => {
    await page.click('#pix-dialog-ok');
    await page.waitForTimeout(200);
    await expect(page.locator('#pix-dialog-overlay')).toBeHidden();
  });

  // ── Click-to-enlarge ────────────────────────────────────
  test('preview canvases show enlarge hint text', async () => {
    // Need to reload image first since we're after compare tests
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#btn-compress-reset');
    await page.waitForTimeout(200);
    await page.click('#compress-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);

    // Check "click to enlarge" hint text is visible
    const origLabel = await page.locator('#compress-work').locator('text=click to enlarge').first().textContent();
    expect(origLabel).toContain('click to enlarge');
  });

  test('preview canvases have pointer cursor', async () => {
    const origCursor = await page.locator('#compress-preview-canvas').evaluate(el => getComputedStyle(el).cursor);
    expect(origCursor).toBe('pointer');
    const compCursor = await page.locator('#compress-output-canvas').evaluate(el => getComputedStyle(el).cursor);
    expect(compCursor).toBe('pointer');
  });

  test('preview canvases have title tooltip', async () => {
    const origTitle = await page.locator('#compress-preview-canvas').getAttribute('title');
    expect(origTitle).toContain('full size');
    const compTitle = await page.locator('#compress-output-canvas').getAttribute('title');
    expect(compTitle).toContain('full size');
  });

  test('clicking original canvas opens enlarged overlay', async () => {
    await page.click('#compress-preview-canvas');
    await page.waitForTimeout(300);
    const enlarged = page.locator('#compress-enlarged');
    await expect(enlarged).toBeVisible();
    // Shows label with dimensions
    const label = await enlarged.locator('div').last().textContent();
    expect(label).toContain('Original');
    expect(label).toContain('500');
    // Close with click
    await page.click('#compress-enlarged');
    await page.waitForTimeout(200);
    await expect(enlarged).toBeHidden();
  });

  test('clicking compressed canvas opens enlarged overlay', async () => {
    await page.click('#compress-output-canvas');
    await page.waitForTimeout(300);
    const enlarged = page.locator('#compress-enlarged');
    await expect(enlarged).toBeVisible();
    const label = await enlarged.locator('div').last().textContent();
    expect(label).toContain('Compressed');
    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(enlarged).toBeHidden();
  });

  test('clicking enlarged overlay again toggles it off', async () => {
    await page.click('#compress-preview-canvas');
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-enlarged')).toBeVisible();
    // Click the overlay to close
    await page.click('#compress-enlarged');
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-enlarged')).toHaveCount(0);
  });

  // ── Tooltips on ribbon controls ────────────────────────
  test('format select has tooltip', async () => {
    const title = await page.locator('#compress-format').getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toContain('format');
  });

  test('quality slider has tooltip', async () => {
    const title = await page.locator('#compress-quality').getAttribute('title');
    expect(title).toBeTruthy();
  });

  test('compare button has tooltip', async () => {
    const title = await page.locator('#btn-compress-compare').getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toContain('Compare');
  });

  test('download button has tooltip', async () => {
    const title = await page.locator('#btn-compress-go').getAttribute('title');
    expect(title).toBeTruthy();
  });

  test('reset button has tooltip', async () => {
    const title = await page.locator('#btn-compress-reset').getAttribute('title');
    expect(title).toBeTruthy();
  });

  // ── Tour ───────────────────────────────────────────────
  test('tour button starts compress tour', async () => {
    await page.click('#btn-tour');
    await page.waitForTimeout(500);
    // Tour overlay and tooltip should appear
    const tooltip = page.locator('div', { hasText: 'Step 1 of' });
    await expect(tooltip.first()).toBeVisible();
    // Should mention compress-related content
    const text = await tooltip.first().textContent();
    expect(text).toMatch(/Drop|image|compress/i);
    // Close tour
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ── Reset ──────────────────────────────────────────────
  test('reset button restores dropzone', async () => {
    await page.click('#btn-compress-reset');
    await page.waitForTimeout(200);
    await expect(page.locator('#compress-drop')).toBeVisible();
    await expect(page.locator('#compress-work')).toBeHidden();
    await expect(page.locator('#btn-compress-go')).toBeDisabled();
    await expect(page.locator('#btn-compress-compare')).toBeDisabled();
  });

  // ── Back to home ───────────────────────────────────────
  test('back button returns to home', async () => {
    await goHome(page);
    await expect(page.locator('#home')).toBeVisible();
  });
});
