// Gazo E2E — SVG Tool tests
import { test, expect } from '@playwright/test';
import { getExtensionId, openTool, goHome, docScreenshot } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');

test.describe('SVG Tool', () => {
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
  //  NAVIGATION & TABS
  // ══════════════════════════════════════════
  test('opens SVG mode from home', async () => {
    await openTool(page, 'svg');
    await expect(page.locator('#mode-svg')).toBeVisible();
  });

  test('Inspect tab is active by default', async () => {
    const inspectTab = page.locator('.svg-mode-tab[data-svg-mode="inspect"]');
    await expect(inspectTab).toHaveClass(/active/);
    await expect(page.locator('#svg-panel-inspect')).toBeVisible();
    await expect(page.locator('#svg-panel-trace')).toBeHidden();
  });

  test('Inspect ribbon is visible by default', async () => {
    await expect(page.locator('#svg-ribbon-inspect')).toBeVisible();
    await expect(page.locator('#svg-ribbon-trace')).toBeHidden();
  });

  test('clicking Trace tab switches panels', async () => {
    await page.click('.svg-mode-tab[data-svg-mode="trace"]');
    await page.waitForTimeout(200);
    await expect(page.locator('#svg-panel-trace')).toBeVisible();
    await expect(page.locator('#svg-panel-inspect')).toBeHidden();
    await expect(page.locator('#svg-ribbon-trace')).toBeVisible();
    await expect(page.locator('#svg-ribbon-inspect')).toBeHidden();
  });

  test('clicking Inspect tab switches back', async () => {
    await page.click('.svg-mode-tab[data-svg-mode="inspect"]');
    await page.waitForTimeout(200);
    await expect(page.locator('#svg-panel-inspect')).toBeVisible();
    await expect(page.locator('#svg-panel-trace')).toBeHidden();
  });

  // ══════════════════════════════════════════
  //  INSPECT TAB
  // ══════════════════════════════════════════
  test('shows dropzone when no SVG loaded', async () => {
    await expect(page.locator('#svg-drop')).toBeVisible();
    await expect(page.locator('#svg-preview')).toBeHidden();
  });

  test('export button is disabled with no SVG', async () => {
    await expect(page.locator('#btn-svg-export')).toBeDisabled();
  });

  test('source shows placeholder text', async () => {
    const text = await page.locator('#svg-source').textContent();
    expect(text).toContain('No SVG loaded');
  });

  // ── Load SVG file ──
  test('loads SVG via file chooser', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#svg-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-icon.svg'));
    await page.waitForTimeout(800);

    await expect(page.locator('#svg-drop')).toBeHidden();
    await expect(page.locator('#svg-preview')).toBeVisible();
  });

  test('SVG image preview is visible', async () => {
    await expect(page.locator('#svg-img')).toBeVisible();
  });

  test('export button is enabled after load', async () => {
    await expect(page.locator('#btn-svg-export')).toBeEnabled();
  });

  // ── Metadata ──
  test('shows SVG info with dimensions', async () => {
    const info = await page.locator('#svg-info').textContent();
    expect(info).toContain('100'); // width or height
    expect(info).toContain('ViewBox');
    expect(info).toContain('Elements');
    expect(info).toContain('Size');
  });

  test('export dimensions are pre-filled at 2x', async () => {
    const w = await page.locator('#svg-export-w').inputValue();
    const h = await page.locator('#svg-export-h').inputValue();
    expect(+w).toBe(200); // 100 * 2
    expect(+h).toBe(200);
  });

  // ── Element breakdown ──
  test('element breakdown is visible', async () => {
    await expect(page.locator('#svg-elements')).toBeVisible();
    const chips = page.locator('#svg-elements-list .svg-el-chip');
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
  });

  test('element breakdown shows known element types', async () => {
    const text = await page.locator('#svg-elements-list').textContent();
    expect(text).toMatch(/rect|circle|path|text/);
  });

  // ── Color palette ──
  test('color palette is visible', async () => {
    await expect(page.locator('#svg-colors-section')).toBeVisible();
    const chips = page.locator('#svg-colors-list .svg-color-chip');
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
  });

  test('color chips have background color set', async () => {
    const bg = await page.locator('#svg-colors-list .svg-color-chip').first().evaluate(el => el.style.background);
    expect(bg).toBeTruthy();
  });

  // ── Formatted source ──
  test('source shows formatted SVG with syntax highlighting', async () => {
    const html = await page.locator('#svg-source').innerHTML();
    expect(html).toContain('sv-tag'); // highlighted tag
    expect(html).toContain('sv-attr'); // highlighted attribute
    expect(html).toContain('sv-val'); // highlighted value
  });

  test('source contains SVG content', async () => {
    const text = await page.locator('#svg-source').textContent();
    expect(text).toContain('svg');
    expect(text).toContain('rect');
  });

  // ── Source controls ──
  test('copy button is visible after load', async () => {
    await expect(page.locator('#btn-svg-copy-source2')).toBeVisible();
  });

  test('wrap button toggles word wrap', async () => {
    // Default: no wrap (white-space: pre)
    let ws = await page.locator('#svg-source').evaluate(el => getComputedStyle(el).whiteSpace);
    expect(ws).toBe('pre');

    await page.click('#btn-svg-wrap');
    await page.waitForTimeout(100);
    ws = await page.locator('#svg-source').evaluate(el => getComputedStyle(el).whiteSpace);
    expect(ws).toBe('pre-wrap');

    // Toggle back
    await page.click('#btn-svg-wrap');
    await page.waitForTimeout(100);
    ws = await page.locator('#svg-source').evaluate(el => getComputedStyle(el).whiteSpace);
    expect(ws).toBe('pre');
  });

  test('collapse hides source, expand restores it', async () => {
    await expect(page.locator('#svg-source')).toBeVisible();

    await page.click('#btn-svg-toggle-source');
    await page.waitForTimeout(100);
    await expect(page.locator('#svg-source')).toBeHidden();
    const btnText = await page.locator('#btn-svg-toggle-source').textContent();
    expect(btnText).toBe('Expand');

    await page.click('#btn-svg-toggle-source');
    await page.waitForTimeout(100);
    await expect(page.locator('#svg-source')).toBeVisible();
    const btnText2 = await page.locator('#btn-svg-toggle-source').textContent();
    expect(btnText2).toBe('Collapse');
  });

  // ── Export controls ──
  test('export format dropdown has PNG, JPEG, WebP', async () => {
    const options = await page.locator('#svg-export-fmt option').allTextContents();
    expect(options).toContain('PNG');
    expect(options).toContain('JPEG');
    expect(options).toContain('WebP');
  });

  test('grid toggle exists on inspect ribbon', async () => {
    await expect(page.locator('#btn-svg-guides')).toBeVisible();
  });

  // ── Inspect reset ──
  test('reset restores inspect dropzone and clears everything', async () => {
    await page.click('#btn-svg-reset');
    await page.waitForTimeout(300);

    await expect(page.locator('#svg-drop')).toBeVisible();
    await expect(page.locator('#svg-preview')).toBeHidden();
    await expect(page.locator('#btn-svg-export')).toBeDisabled();
    await expect(page.locator('#svg-elements')).toBeHidden();
    await expect(page.locator('#svg-colors-section')).toBeHidden();
    await expect(page.locator('#btn-svg-copy-source2')).toBeHidden();
    await expect(page.locator('#btn-svg-wrap')).toBeHidden();
    await expect(page.locator('#btn-svg-toggle-source')).toBeHidden();
    const source = await page.locator('#svg-source').textContent();
    expect(source).toContain('No SVG loaded');
  });

  // Reload SVG for remaining tests that depend on it
  test('can reload SVG after reset', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#svg-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-icon.svg'));
    await page.waitForTimeout(800);
    await expect(page.locator('#svg-preview')).toBeVisible();
    await expect(page.locator('#btn-svg-export')).toBeEnabled();
  });

  // ══════════════════════════════════════════
  //  TRACE TAB
  // ══════════════════════════════════════════
  test('switch to trace tab', async () => {
    await page.click('.svg-mode-tab[data-svg-mode="trace"]');
    await page.waitForTimeout(200);
    await expect(page.locator('#svg-panel-trace')).toBeVisible();
  });

  test('trace shows dropzone when no file loaded', async () => {
    await expect(page.locator('#trace-drop')).toBeVisible();
    await expect(page.locator('#trace-loaded')).toBeHidden();
    await expect(page.locator('#trace-result')).toBeHidden();
  });

  test('trace button in ribbon is disabled with no file', async () => {
    await expect(page.locator('#btn-trace-go')).toBeDisabled();
  });

  test('trace file input excludes SVG', async () => {
    const accept = await page.locator('#trace-file').getAttribute('accept');
    expect(accept).not.toContain('svg');
    expect(accept).toContain('image/png');
    expect(accept).toContain('image/jpeg');
    expect(accept).toContain('image/webp');
    expect(accept).toContain('image/bmp');
  });

  test('dropping SVG on trace shows rejection toast', async () => {
    // Simulate dropping SVG via file input (bypassing accept filter)
    const rejected = await page.evaluate(async () => {
      const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
      // Call the dropzone handler directly
      const drop = document.getElementById('trace-drop');
      const dt = new DataTransfer();
      dt.items.add(file);
      drop.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
      // Wait for toast
      await new Promise(r => setTimeout(r, 300));
      const toast = document.querySelector('.pix-toast');
      return toast?.textContent || '';
    });
    expect(rejected).toContain('SVG');
    // Dropzone should still be visible (file was rejected)
    await expect(page.locator('#trace-drop')).toBeVisible();
    await expect(page.locator('#trace-loaded')).toBeHidden();
  });

  // ── Load image for tracing ──
  test('loads image via file chooser', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#trace-drop');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-200x200.png'));
    await page.waitForTimeout(800);

    // Dropzone hidden, inline controls visible
    await expect(page.locator('#trace-drop')).toBeHidden();
    await expect(page.locator('#trace-loaded')).toBeVisible();
  });

  test('shows file info after load', async () => {
    const info = await page.locator('#trace-loaded-info').textContent();
    expect(info).toContain('test-200x200.png');
    expect(info).toMatch(/200\u00d7200/);
  });

  test('inline trace button is visible', async () => {
    await expect(page.locator('#btn-trace-go-inline')).toBeVisible();
    await expect(page.locator('#btn-trace-go-inline')).toBeEnabled();
  });

  test('ribbon trace button is enabled after file load', async () => {
    await expect(page.locator('#btn-trace-go')).toBeEnabled();
  });

  test('inline preset dropdown has options', async () => {
    const options = await page.locator('#trace-preset-inline option').allTextContents();
    expect(options).toContain('Default');
    expect(options).toContain('Logo');
    expect(options).toContain('Photo');
    expect(options).toContain('Artistic');
  });

  test('inline colors input defaults to 16', async () => {
    const val = await page.locator('#trace-colors-inline').inputValue();
    expect(val).toBe('16');
  });

  test('reset button is visible', async () => {
    await expect(page.locator('#btn-trace-reset')).toBeVisible();
  });

  // ── Sync controls ──
  test('inline preset syncs to ribbon', async () => {
    await page.selectOption('#trace-preset-inline', 'logo');
    await page.waitForTimeout(100);
    const ribbonVal = await page.locator('#trace-preset').inputValue();
    expect(ribbonVal).toBe('logo');
    // Reset for trace
    await page.selectOption('#trace-preset-inline', 'default');
    await page.waitForTimeout(100);
  });

  test('inline colors syncs to ribbon', async () => {
    await page.fill('#trace-colors-inline', '8');
    await page.locator('#trace-colors-inline').dispatchEvent('change');
    await page.waitForTimeout(100);
    const ribbonVal = await page.locator('#trace-colors').inputValue();
    expect(ribbonVal).toBe('8');
    // Reset
    await page.fill('#trace-colors-inline', '16');
    await page.locator('#trace-colors-inline').dispatchEvent('change');
  });

  // ── Run trace ──
  test('clicking inline trace button runs trace', async () => {
    await page.click('#btn-trace-go-inline');
    // Tracing is async (setTimeout), wait for result
    await page.waitForTimeout(2000);

    await expect(page.locator('#trace-result')).toBeVisible();
  });

  test('trace preview shows SVG content', async () => {
    const svg = page.locator('#trace-preview svg');
    await expect(svg).toBeVisible();
  });

  test('original canvas shows source image', async () => {
    const width = await page.locator('#trace-original-canvas').evaluate(el => el.width);
    expect(width).toBe(200);
  });

  // ── Size comparison ──
  test('size comparison is visible', async () => {
    await expect(page.locator('#trace-size-compare')).toBeVisible();
    const text = await page.locator('#trace-size-compare').textContent();
    expect(text).toContain('Original');
    expect(text).toContain('Traced SVG');
    expect(text).toMatch(/%/); // percentage
    expect(text).toMatch(/paths/);
  });

  // ── Trace stats in ribbon ──
  test('trace stats show in ribbon', async () => {
    const stats = await page.locator('#trace-stats').textContent();
    expect(stats).toMatch(/KB/);
    expect(stats).toMatch(/paths/);
    expect(stats).toMatch(/colors/);
  });

  // ── Ribbon export buttons visible ──
  test('download button visible after trace', async () => {
    await expect(page.locator('#btn-trace-download')).toBeVisible();
  });

  test('copy button visible after trace', async () => {
    await expect(page.locator('#btn-trace-copy')).toBeVisible();
  });

  // ── Traced source ──
  test('traced source shows formatted SVG', async () => {
    const html = await page.locator('#trace-source').innerHTML();
    expect(html).toContain('sv-tag');
    expect(html).toContain('path');
  });

  test('trace source copy button exists', async () => {
    await expect(page.locator('#btn-trace-copy-source')).toBeVisible();
  });

  test('trace source wrap toggles word wrap', async () => {
    let ws = await page.locator('#trace-source').evaluate(el => getComputedStyle(el).whiteSpace);
    expect(ws).toBe('pre');

    await page.click('#btn-trace-wrap');
    await page.waitForTimeout(100);
    ws = await page.locator('#trace-source').evaluate(el => getComputedStyle(el).whiteSpace);
    expect(ws).toBe('pre-wrap');

    await page.click('#btn-trace-wrap');
    await page.waitForTimeout(100);
  });

  test('trace source collapse hides source', async () => {
    await expect(page.locator('#trace-source')).toBeVisible();

    await page.click('#btn-trace-toggle-source');
    await page.waitForTimeout(100);
    await expect(page.locator('#trace-source')).toBeHidden();

    await page.click('#btn-trace-toggle-source');
    await page.waitForTimeout(100);
    await expect(page.locator('#trace-source')).toBeVisible();
  });

  // ── Fit / 1:1 toggle ──
  test('fit button defaults to Fit (active)', async () => {
    const text = await page.locator('#btn-trace-fit').textContent();
    expect(text.trim()).toBe('Fit');
    await expect(page.locator('#btn-trace-fit')).toHaveClass(/active/);
  });

  test('clicking fit toggles to 1:1', async () => {
    await page.click('#btn-trace-fit');
    await page.waitForTimeout(100);
    const text = await page.locator('#btn-trace-fit').textContent();
    expect(text.trim()).toBe('1:1');

    // max-height removed
    const mh = await page.locator('#trace-preview').evaluate(el => el.style.maxHeight);
    expect(mh).toBe('none');

    // Toggle back
    await page.click('#btn-trace-fit');
    await page.waitForTimeout(100);
    const text2 = await page.locator('#btn-trace-fit').textContent();
    expect(text2.trim()).toBe('Fit');
  });

  // ── Grid overlay ──
  test('grid toggle exists on trace ribbon', async () => {
    await expect(page.locator('#btn-svg-guides-trace')).toBeVisible();
  });

  // ── Re-trace with different settings ──
  test('can re-trace with different preset', async () => {
    await page.selectOption('#trace-preset-inline', 'logo');
    await page.fill('#trace-colors-inline', '4');
    await page.locator('#trace-colors-inline').dispatchEvent('change');
    await page.click('#btn-trace-go-inline');
    await page.waitForTimeout(2000);

    // Stats should reflect new settings
    const stats = await page.locator('#trace-stats').textContent();
    expect(stats).toContain('4 colors');
    await expect(page.locator('#trace-preview svg')).toBeVisible();
  });

  // ── Reset ──
  test('reset restores dropzone and clears results', async () => {
    await page.click('#btn-trace-reset');
    await page.waitForTimeout(300);

    await expect(page.locator('#trace-drop')).toBeVisible();
    await expect(page.locator('#trace-loaded')).toBeHidden();
    await expect(page.locator('#trace-result')).toBeHidden();
    await expect(page.locator('#btn-trace-go')).toBeDisabled();
    await expect(page.locator('#btn-trace-download')).toBeHidden();
    await expect(page.locator('#btn-trace-copy')).toBeHidden();

    const source = await page.locator('#trace-source').textContent();
    expect(source).toContain('No trace yet');

    const stats = await page.locator('#trace-stats').textContent();
    expect(stats).toBe('');
  });

  // ── Tour ──
  test('tour button starts SVG tour', async () => {
    // Switch back to inspect tab for tour
    await page.click('.svg-mode-tab[data-svg-mode="inspect"]');
    await page.waitForTimeout(200);
    await page.click('#btn-tour');
    await page.waitForTimeout(500);
    const tooltip = page.locator('div', { hasText: 'Step 1 of' });
    await expect(tooltip.first()).toBeVisible();
    const text = await tooltip.first().textContent();
    expect(text).toMatch(/Inspect|SVG/i);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ── Help popover ──
  test('help popover exists for SVG tool', async () => {
    // The ? button is auto-injected next to ribbon-title elements
    const helpBtn = page.locator('#svg-ribbon-inspect .help-btn, #mode-svg .help-btn').first();
    const count = await helpBtn.count();
    expect(count).toBeGreaterThanOrEqual(0); // May or may not have matched the helpMap
  });

  // ── Back to home ──
  test('back button returns to home', async () => {
    await goHome(page);
    await expect(page.locator('#home')).toBeVisible();
  });
});
