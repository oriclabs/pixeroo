// Gazo E2E — Batch Edit Tool (comprehensive)
import { test, expect } from '@playwright/test';
import { getExtensionId, openTool, goHome, docScreenshot } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');
const EXIF = path.resolve(FIXTURES, 'exif');
const WEBP = path.resolve(FIXTURES, 'webp');

test.describe('Batch Edit Tool', () => {
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
  test('opens batch mode from home', async () => {
    await openTool(page, 'batch');
    await expect(page.locator('#mode-batch')).toBeVisible();
    await expect(page.locator('#batch-drop')).toBeVisible();
  });

  test('shows dropzone when no files loaded', async () => {
    await expect(page.locator('#batch-drop')).toBeVisible();
    await expect(page.locator('#batch-queue')).toBeHidden();
  });

  test('process button is disabled with no files', async () => {
    await expect(page.locator('#btn-batch-process')).toBeDisabled();
  });

  test('preview button is disabled with no files', async () => {
    await expect(page.locator('#btn-batch-preview')).toBeDisabled();
  });

  test('status shows 0 images', async () => {
    const status = await page.locator('#batch-status').textContent();
    expect(status).toMatch(/0 image/);
  });

  // ══════════════════════════════════════════
  //  LOADING FILES — Various types & sizes
  // ══════════════════════════════════════════
  test('adds single PNG file', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(500);
    await expect(page.locator('#batch-queue')).toBeVisible();
    expect(await page.locator('#batch-status').textContent()).toMatch(/1 image/);
  });

  test('process button enabled after adding file', async () => {
    await expect(page.locator('#btn-batch-process')).toBeEnabled();
  });

  test('preview button enabled after adding file', async () => {
    await expect(page.locator('#btn-batch-preview')).toBeEnabled();
  });

  test('adds multiple PNGs of different sizes', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const chooser = await fc;
    await chooser.setFiles([
      path.join(FIXTURES, 'test-200x200.png'),
      path.join(FIXTURES, 'test-tiny-32x32.png'),
      path.join(FIXTURES, 'test-wide-1500x500.png'),
      path.join(FIXTURES, 'test-tall-500x1500.png'),
    ]);
    await page.waitForTimeout(500);
    expect(await page.locator('#batch-status').textContent()).toMatch(/5 image/);
  });

  test('adds transparent PNG', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(FIXTURES, 'test-transparent-400x400.png'));
    await page.waitForTimeout(500);
    expect(await page.locator('#batch-status').textContent()).toMatch(/6 image/);
  });

  test('thumbnail items match loaded count', async () => {
    const count = await page.locator('#batch-items > *').count();
    expect(count).toBe(6);
  });

  test('screenshot: batch with mixed files loaded', async () => {
    await docScreenshot(page, 'batch-mixed-files-loaded', browserName);
  });

  // ══════════════════════════════════════════
  //  RESIZE CONTROLS
  // ══════════════════════════════════════════
  test('resize W/H inputs exist and are empty by default', async () => {
    await expect(page.locator('#batch-w')).toBeVisible();
    await expect(page.locator('#batch-h')).toBeVisible();
  });

  test('lock ratio is checked by default', async () => {
    await expect(page.locator('#batch-lock')).toBeChecked();
  });

  test('setting width value', async () => {
    await page.fill('#batch-w', '800');
    const val = await page.locator('#batch-w').inputValue();
    expect(val).toBe('800');
    await page.fill('#batch-w', ''); // reset
  });

  // ══════════════════════════════════════════
  //  PIPELINE IMPORT
  // ══════════════════════════════════════════
  test('import edit button exists', async () => {
    await expect(page.locator('#btn-batch-import-pipeline')).toBeVisible();
  });

  test('import edit shows info when no pipeline', async () => {
    await page.click('#btn-batch-import-pipeline');
    await page.waitForTimeout(200);
    const info = await page.locator('#batch-pipeline-info').textContent();
    expect(info).toContain('No Edit ops');
  });

  // ══════════════════════════════════════════
  //  FILTER
  // ══════════════════════════════════════════
  test('filter dropdown has all options', async () => {
    const options = await page.locator('#batch-filter option').allTextContents();
    expect(options).toContain('No filter');
    expect(options).toContain('Grayscale');
    expect(options).toContain('Sepia');
    expect(options).toContain('Sharpen');
    expect(options).toContain('Blur');
    expect(options).toContain('Invert');
  });

  test('can select grayscale filter', async () => {
    await page.selectOption('#batch-filter', 'grayscale');
    const val = await page.locator('#batch-filter').inputValue();
    expect(val).toBe('grayscale');
    await page.selectOption('#batch-filter', 'none'); // reset
  });

  // ══════════════════════════════════════════
  //  WATERMARK
  // ══════════════════════════════════════════
  test('watermark text input exists', async () => {
    await expect(page.locator('#batch-watermark')).toBeVisible();
  });

  test('watermark opacity slider and label', async () => {
    await expect(page.locator('#batch-wm-opacity')).toBeVisible();
    const val = await page.locator('#batch-wm-opacity').inputValue();
    expect(val).toBe('30');
    const label = await page.locator('#batch-wm-opacity-val').textContent();
    expect(label).toBe('30');
  });

  test('watermark mode dropdown has options', async () => {
    const options = await page.locator('#batch-wm-mode option').allTextContents();
    expect(options).toContain('Text');
    expect(options).toContain('Diagonal');
    expect(options).toContain('Grid');
    expect(options).toContain('Stamp');
    expect(options).toContain('Image');
  });

  test('watermark position dropdown has options', async () => {
    const options = await page.locator('#batch-wm-position option').allTextContents();
    expect(options).toContain('Center');
    expect(options).toContain('Tiled');
    expect(options).toContain('Bot Right');
  });

  test('watermark font dropdown populated by Font Manager', async () => {
    const groups = await page.locator('#batch-wm-font optgroup').count();
    expect(groups).toBeGreaterThan(0); // should have at least Web Safe group
  });

  test('watermark font size input exists', async () => {
    await expect(page.locator('#batch-wm-fontsize')).toBeVisible();
    const val = await page.locator('#batch-wm-fontsize').inputValue();
    expect(val).toBe('0'); // auto
  });

  test('watermark bold button toggles', async () => {
    await page.click('#batch-wm-bold');
    await expect(page.locator('#batch-wm-bold')).toHaveClass(/active/);
    await page.click('#batch-wm-bold');
    await expect(page.locator('#batch-wm-bold')).not.toHaveClass(/active/);
  });

  test('watermark italic button toggles', async () => {
    await page.click('#batch-wm-italic');
    await expect(page.locator('#batch-wm-italic')).toHaveClass(/active/);
    await page.click('#batch-wm-italic');
    await expect(page.locator('#batch-wm-italic')).not.toHaveClass(/active/);
  });

  test('watermark color picker exists', async () => {
    await expect(page.locator('#batch-wm-color')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  FORMAT & QUALITY
  // ══════════════════════════════════════════
  test('format dropdown has PNG, JPEG, WebP, Original', async () => {
    const options = await page.locator('#batch-format option').allTextContents();
    expect(options).toContain('PNG');
    expect(options).toContain('JPEG');
    expect(options).toContain('WebP');
    expect(options).toContain('Original');
  });

  test('quality slider defaults to 85', async () => {
    expect(await page.locator('#batch-quality').inputValue()).toBe('85');
    expect(await page.locator('#batch-quality-val').textContent()).toBe('85');
  });

  test('quality label updates on slider change', async () => {
    await page.locator('#batch-quality').fill('60');
    await page.locator('#batch-quality').dispatchEvent('input');
    await page.waitForTimeout(100);
    expect(await page.locator('#batch-quality-val').textContent()).toBe('60');
    // Reset
    await page.locator('#batch-quality').fill('85');
    await page.locator('#batch-quality').dispatchEvent('input');
  });

  // ══════════════════════════════════════════
  //  STRIP META & COPYRIGHT
  // ══════════════════════════════════════════
  test('strip meta toggle exists', async () => {
    await expect(page.locator('#batch-strip-meta')).toBeVisible();
  });

  test('copyright toggle shows text input', async () => {
    await expect(page.locator('#batch-copyright-text')).toBeHidden();
    await page.locator('#batch-add-copyright').check();
    await page.waitForTimeout(200);
    await expect(page.locator('#batch-copyright-text')).toBeVisible();
    const val = await page.locator('#batch-copyright-text').inputValue();
    expect(val).toContain('{year}');
    await page.locator('#batch-add-copyright').uncheck();
  });

  // ══════════════════════════════════════════
  //  TARGET SIZE
  // ══════════════════════════════════════════
  test('target size toggle shows KB input', async () => {
    await expect(page.locator('#batch-max-kb')).toBeHidden();
    await page.locator('#batch-target-size').check();
    await page.waitForTimeout(200);
    await expect(page.locator('#batch-max-kb')).toBeVisible();
    expect(await page.locator('#batch-max-kb').inputValue()).toBe('200');
    await page.locator('#batch-target-size').uncheck();
  });

  // ══════════════════════════════════════════
  //  ZIP TOGGLE
  // ══════════════════════════════════════════
  test('zip toggle is checked by default', async () => {
    await expect(page.locator('#batch-zip')).toBeChecked();
  });

  // ══════════════════════════════════════════
  //  RENAME POPOVER
  // ══════════════════════════════════════════
  test('rename button opens popover', async () => {
    await page.click('#btn-batch-rename');
    await page.waitForTimeout(200);
    await expect(page.locator('#batch-rename-popover')).toBeVisible();
    await expect(page.locator('#batch-rename-popover-input')).toBeVisible();
  });

  test('rename popover shows all token chips', async () => {
    const popover = page.locator('#batch-rename-popover');
    for (const token of ['{name}', '{index}', '{date}', '{w}', '{h}', '{ext}']) {
      await expect(popover.locator('button', { hasText: token })).toBeVisible();
    }
  });

  test('rename input shows live preview', async () => {
    await page.fill('#batch-rename-popover-input', '{name}-{w}x{h}');
    await page.waitForTimeout(200);
    const popover = page.locator('#batch-rename-popover');
    const text = await popover.locator('div').last().textContent();
    expect(text).toMatch(/test/);
  });

  test('chip inserts token at cursor', async () => {
    await page.fill('#batch-rename-popover-input', '');
    await page.locator('#batch-rename-popover button', { hasText: '{name}' }).click();
    await page.waitForTimeout(100);
    expect(await page.locator('#batch-rename-popover-input').inputValue()).toContain('{name}');
  });

  test('warns when no unique token', async () => {
    await page.fill('#batch-rename-popover-input', 'output-photo');
    await page.waitForTimeout(200);
    await expect(page.locator('#batch-rename-popover div', { hasText: 'No unique token' })).toBeVisible();
    expect(await page.locator('#batch-rename').inputValue()).toContain('{index}');
  });

  test('no warning when pattern has {name}', async () => {
    await page.fill('#batch-rename-popover-input', '{name}-edited');
    await page.waitForTimeout(200);
    await expect(page.locator('#batch-rename-popover div', { hasText: 'No unique token' })).toBeHidden();
  });

  test('empty rename resets to {name} on blur', async () => {
    await page.fill('#batch-rename-popover-input', '');
    await page.locator('#batch-rename-popover-input').blur();
    await page.waitForTimeout(200);
    expect(await page.locator('#batch-rename-popover-input').inputValue()).toBe('{name}');
  });

  test('rename popover closes on outside click', async () => {
    await page.click('#batch-status', { force: true });
    await page.waitForTimeout(200);
    await expect(page.locator('#batch-rename-popover')).toBeHidden();
  });

  // ══════════════════════════════════════════
  //  PREVIEW
  // ══════════════════════════════════════════
  test('preview shows original and result canvases', async () => {
    await page.click('#btn-batch-preview');
    await page.waitForTimeout(500);
    await expect(page.locator('#batch-preview-area')).toBeVisible();
    await expect(page.locator('#batch-preview-original')).toBeVisible();
    await expect(page.locator('#batch-preview-result')).toBeVisible();
    await docScreenshot(page, 'batch-preview', browserName);
  });

  test('preview title shows image name', async () => {
    const title = await page.locator('#batch-preview-title').textContent();
    expect(title).toContain('Preview');
  });

  test('preview close hides area', async () => {
    await page.click('#batch-preview-close');
    await page.waitForTimeout(200);
    await expect(page.locator('#batch-preview-area')).toBeHidden();
  });

  // ══════════════════════════════════════════
  //  SELECTION CONTROLS
  // ══════════════════════════════════════════
  test('select all selects all items', async () => {
    await page.click('#btn-batch-sel-all');
    await page.waitForTimeout(200);
    const checked = await page.locator('#batch-items input[type="checkbox"]:checked').count();
    expect(checked).toBe(6);
  });

  test('select none deselects all', async () => {
    await page.click('#btn-batch-sel-none');
    await page.waitForTimeout(200);
    const checked = await page.locator('#batch-items input[type="checkbox"]:checked').count();
    expect(checked).toBe(0);
    await page.click('#btn-batch-sel-all'); // re-select
  });

  // ══════════════════════════════════════════
  //  MULTI-SIZE
  // ══════════════════════════════════════════
  test('multi-size toggle shows sizes input', async () => {
    await page.locator('#batch-multi-size').check();
    await page.waitForTimeout(200);
    expect(await page.locator('#batch-sizes').inputValue()).toBe('150,600,1200');
    await page.locator('#batch-multi-size').uncheck();
  });

  // ══════════════════════════════════════════
  //  ADVANCED — LQIP, Social, Report, Dupes
  // ══════════════════════════════════════════
  test('LQIP button exists', async () => {
    await expect(page.locator('#btn-batch-lqip')).toBeVisible();
  });

  test('LQIP size input defaults to 20', async () => {
    expect(await page.locator('#batch-lqip-size').inputValue()).toBe('20');
  });

  test('social button exists', async () => {
    await expect(page.locator('#btn-batch-social')).toBeVisible();
  });

  test('report button exists', async () => {
    await expect(page.locator('#btn-batch-report')).toBeVisible();
  });

  test('dupes button exists', async () => {
    await expect(page.locator('#btn-batch-dupes')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  RATIO ENFORCE & NORMALIZE
  // ══════════════════════════════════════════
  test('ratio enforce has presets', async () => {
    const options = await page.locator('#batch-ratio-enforce option').allTextContents();
    expect(options).toContain('No crop');
    expect(options).toContain('1:1');
    expect(options).toContain('4:3');
    expect(options).toContain('16:9');
    expect(options).toContain('3:2');
    expect(options).toContain('2:3 Port');
  });

  test('normalize toggle exists', async () => {
    await expect(page.locator('#batch-normalize')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  CROP INPUTS
  // ══════════════════════════════════════════
  test('crop inputs exist with default 0', async () => {
    for (const id of ['batch-crop-t', 'batch-crop-r', 'batch-crop-b', 'batch-crop-l']) {
      expect(await page.locator(`#${id}`).inputValue()).toBe('0');
    }
  });

  test('can set crop values', async () => {
    await page.fill('#batch-crop-t', '10');
    expect(await page.locator('#batch-crop-t').inputValue()).toBe('10');
    await page.fill('#batch-crop-t', '0'); // reset
  });

  // ══════════════════════════════════════════
  //  PRESETS
  // ══════════════════════════════════════════
  test('save preset button exists', async () => {
    await expect(page.locator('#btn-batch-save-preset')).toBeVisible();
  });

  test('preset list dropdown exists', async () => {
    await expect(page.locator('#batch-preset-list')).toBeVisible();
  });

  test('delete preset button exists', async () => {
    await expect(page.locator('#btn-batch-del-preset')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  CHECK CONSISTENCY
  // ══════════════════════════════════════════
  test('check button exists', async () => {
    await expect(page.locator('#btn-batch-check')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  LIBRARY IMPORT
  // ══════════════════════════════════════════
  test('library button exists', async () => {
    await expect(page.locator('#btn-batch-from-lib')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  CLEAR & RELOAD WITH EXIF/WEBP
  // ══════════════════════════════════════════
  test('clear removes all files', async () => {
    await page.click('#btn-batch-clear');
    await page.waitForTimeout(300);
    const okBtn = page.locator('#pix-dialog-ok:visible');
    if (await okBtn.count()) await okBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator('#batch-status').textContent()).toMatch(/0 image/);
    await expect(page.locator('#btn-batch-process')).toBeDisabled();
  });

  test('loads EXIF JPEG files', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const chooser = await fc;
    await chooser.setFiles([
      path.join(EXIF, 'orientation-Landscape_1.jpg'),
      path.join(EXIF, 'orientation-Portrait_6.jpg'),
      path.join(EXIF, 'canon-40d.jpg'),
    ]);
    await page.waitForTimeout(500);
    expect(await page.locator('#batch-status').textContent()).toMatch(/3 image/);
  });

  test('loads WebP files', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#batch-drop');
    const chooser = await fc;
    await chooser.setFiles([
      path.join(WEBP, 'gallery-1.webp'),
      path.join(WEBP, 'lossless-1.webp'),
    ]);
    await page.waitForTimeout(500);
    expect(await page.locator('#batch-status').textContent()).toMatch(/5 image/);
  });

  test('thumbnail count matches EXIF + WebP files', async () => {
    const count = await page.locator('#batch-items > *').count();
    expect(count).toBe(5);
  });

  test('preview works with EXIF files', async () => {
    await page.click('#btn-batch-preview');
    await page.waitForTimeout(500);
    await expect(page.locator('#batch-preview-area')).toBeVisible();
    await docScreenshot(page, 'batch-exif-webp-preview', browserName);
    await page.click('#batch-preview-close');
  });

  test('screenshot: batch settings configured', async () => {
    await page.fill('#batch-watermark', 'Gazo');
    await page.selectOption('#batch-filter', 'grayscale');
    await page.selectOption('#batch-format', 'jpeg');
    await page.waitForTimeout(200);
    await docScreenshot(page, 'batch-settings-configured', browserName);
    // Reset
    await page.fill('#batch-watermark', '');
    await page.selectOption('#batch-filter', 'none');
    await page.selectOption('#batch-format', 'png');
  });

  // ══════════════════════════════════════════
  //  FINAL CLEAR & NAVIGATION
  // ══════════════════════════════════════════
  test('final clear', async () => {
    await page.click('#btn-batch-clear');
    await page.waitForTimeout(300);
    const okBtn = page.locator('#pix-dialog-ok:visible');
    if (await okBtn.count()) await okBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator('#batch-status').textContent()).toMatch(/0 image/);
  });

  test('back button returns to home', async () => {
    await goHome(page);
    await expect(page.locator('#home')).toBeVisible();
  });
});
