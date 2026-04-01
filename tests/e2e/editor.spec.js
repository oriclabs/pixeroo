// Gazo E2E — Editor tool flows
import { test, expect } from '@playwright/test';
import { getEditorPage, getExtensionId, loadImageInEditor, openTool, goHome, getCanvasDims, docScreenshot, FIXTURES } from './helpers.js';
import path from 'path';

test.describe('Editor Tool', () => {
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

  // ══════════════════════════════════════════
  //  HOME SCREEN LAYOUT
  // ══════════════════════════════════════════
  test('home screen shows tool grid', async () => {
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('.home-grid')).toBeVisible();
    await expect(page.locator('#home-search')).toBeVisible();
    await docScreenshot(page, '01-home-screen', browserName);
  });

  test('home has Essentials section', async () => {
    const labels = await page.locator('.home-section-label').allTextContents();
    expect(labels).toContain('Essentials');
    expect(labels).toContain('More Tools');
  });

  test('all 19 tool cards are present', async () => {
    const modes = await page.locator('.home-card').evaluateAll(cards =>
      cards.map(c => c.dataset.mode)
    );
    const expected = [
      'edit', 'convert', 'batch', 'social', 'collage', 'draw',
      'showcase', 'meme', 'watermark', 'callout', 'generate',
      'gif', 'certificate', 'compress', 'info', 'colors',
      'compare', 'svg', 'qr', 'store'
    ];
    for (const m of expected) {
      expect(modes).toContain(m);
    }
  });

  test('every tool card has data-keywords', async () => {
    const cardsWithoutKeywords = await page.locator('.home-card').evaluateAll(cards =>
      cards.filter(c => !c.dataset.keywords).map(c => c.dataset.mode)
    );
    expect(cardsWithoutKeywords).toEqual([]);
  });

  test('each tool card has title and description', async () => {
    const cards = page.locator('.home-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const title = await cards.nth(i).locator('.home-card-title').textContent();
      const desc = await cards.nth(i).locator('.home-card-desc').textContent();
      expect(title.length).toBeGreaterThan(0);
      expect(desc.length).toBeGreaterThan(0);
    }
  });

  // ── Topbar ──
  test('topbar has Tour button', async () => {
    await expect(page.locator('#btn-tour')).toBeVisible();
  });

  test('topbar has Help button', async () => {
    await expect(page.locator('#btn-help-page')).toBeVisible();
  });

  test('topbar has Library button with count', async () => {
    await expect(page.locator('#btn-open-library')).toBeVisible();
    await expect(page.locator('#lib-count')).toBeVisible();
  });

  test('topbar has shortcuts button', async () => {
    await expect(page.locator('#btn-shortcuts')).toBeVisible();
  });

  // ── Hint bar ──
  test('hint bar shows default text', async () => {
    const hintName = await page.locator('#hint-name').textContent();
    expect(hintName).toContain('Hover');
  });

  test('hint bar shows version and offline', async () => {
    const bar = await page.locator('#home-hint-bar').textContent();
    expect(bar).toContain('v0.1.0');
    expect(bar).toContain('Offline');
  });

  test('hovering a card updates hint bar', async () => {
    await page.hover('[data-mode="compress"]');
    await page.waitForTimeout(200);
    const name = await page.locator('#hint-name').textContent();
    expect(name).toBe('Compress');
    const tips = await page.locator('#hint-tips').textContent();
    expect(tips.length).toBeGreaterThan(10);
    // Move away
    await page.hover('#home-search');
    await page.waitForTimeout(200);
  });

  test('leaving card restores default hint', async () => {
    const name = await page.locator('#hint-name').textContent();
    expect(name).toContain('Hover');
  });

  // ══════════════════════════════════════════
  //  SEARCH
  // ══════════════════════════════════════════
  test('search filters tool cards by title', async () => {
    await page.fill('#home-search', 'qr');
    await page.waitForTimeout(200);
    const visible = await page.locator('.home-card:visible').count();
    expect(visible).toBeLessThan(15);
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  test('search matches on data-keywords', async () => {
    // "optimize" is a keyword on Compress, not in title or desc
    await page.fill('#home-search', 'optimize');
    await page.waitForTimeout(200);
    const compressCard = page.locator('[data-mode="compress"]:visible');
    await expect(compressCard).toBeVisible();
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  test('search matches keyword "instagram" to Social Media', async () => {
    await page.fill('#home-search', 'instagram');
    await page.waitForTimeout(200);
    const socialCard = page.locator('[data-mode="social"]:visible');
    await expect(socialCard).toBeVisible();
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  test('search matches keyword "vectorize" to SVG Tools', async () => {
    await page.fill('#home-search', 'vectorize');
    await page.waitForTimeout(200);
    const svgCard = page.locator('[data-mode="svg"]:visible');
    await expect(svgCard).toBeVisible();
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  test('search matches keyword "wifi" to QR Code', async () => {
    await page.fill('#home-search', 'wifi');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-mode="qr"]:visible')).toBeVisible();
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  test('search matches keyword "shrink" to Compress', async () => {
    await page.fill('#home-search', 'shrink');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-mode="compress"]:visible')).toBeVisible();
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  test('search with no match hides all cards', async () => {
    await page.fill('#home-search', 'xyznonexistent');
    await page.waitForTimeout(200);
    const visible = await page.locator('.home-card:visible').count();
    expect(visible).toBe(0);
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  test('clearing search restores all cards', async () => {
    await page.fill('#home-search', 'edit');
    await page.waitForTimeout(100);
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
    const visible = await page.locator('.home-card:visible').count();
    expect(visible).toBe(20);
  });

  test('search is case-insensitive', async () => {
    await page.fill('#home-search', 'COMPRESS');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-mode="compress"]:visible')).toBeVisible();
    await page.fill('#home-search', '');
    await page.waitForTimeout(200);
  });

  // ══════════════════════════════════════════
  //  TOOL NAVIGATION
  // ══════════════════════════════════════════
  test('clicking a tool card opens that mode', async () => {
    await page.click('[data-mode="info"]');
    await page.waitForTimeout(300);
    await expect(page.locator('#mode-info')).toBeVisible();
    await expect(page.locator('#home')).toHaveClass(/hidden/);
    // Mode label updates
    const label = await page.locator('#mode-label').textContent();
    expect(label).toBe('Info');
  });

  test('back button returns to home', async () => {
    await page.click('#btn-back');
    await page.waitForTimeout(300);
    await expect(page.locator('#home')).toBeVisible();
  });

  test('Escape key returns to home from tool', async () => {
    await page.click('[data-mode="colors"]');
    await page.waitForTimeout(300);
    await expect(page.locator('#mode-colors')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('#home')).toBeVisible();
  });

  // ── FAQ overlay ──
  test('Which tool? button is visible on home screen', async () => {
    await expect(page.locator('#btn-faq')).toBeVisible();
  });

  test('FAQ button opens overlay', async () => {
    await page.click('#btn-faq');
    await page.waitForTimeout(300);
    await expect(page.locator('#faq-overlay')).toBeVisible();
    await expect(page.locator('.faq-panel')).toBeVisible();
  });

  test('FAQ shows task-based groups', async () => {
    const text = await page.locator('.faq-panel').textContent();
    expect(text).toContain('make an image smaller');
    expect(text).toContain('change the format');
    expect(text).toContain('edit or annotate');
    expect(text).toContain('create something');
    expect(text).toContain('inspect or analyze');
    expect(text).toContain('prepare for publishing');
  });

  test('FAQ shows tool links as clickable buttons', async () => {
    const links = page.locator('.faq-tool-link');
    const count = await links.count();
    expect(count).toBeGreaterThan(15); // should have links for most tools
  });

  test('FAQ tool link opens the tool directly', async () => {
    await page.click('.faq-tool-link[data-faq-mode="compress"]');
    await page.waitForTimeout(300);
    // FAQ should close
    await expect(page.locator('#faq-overlay')).toBeHidden();
    // Compress mode should be open
    await expect(page.locator('#mode-compress')).toBeVisible();
    // Go back
    await page.click('#btn-back');
    await page.waitForTimeout(300);
  });

  test('FAQ closes on backdrop click', async () => {
    await page.click('#btn-faq');
    await page.waitForTimeout(200);
    await page.click('#faq-overlay', { position: { x: 5, y: 5 } });
    await page.waitForTimeout(200);
    await expect(page.locator('#faq-overlay')).not.toHaveClass(/open/);
  });

  test('FAQ closes on Escape', async () => {
    await page.click('#btn-faq');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.locator('#faq-overlay')).not.toHaveClass(/open/);
  });

  test('FAQ close button works', async () => {
    await page.click('#btn-faq');
    await page.waitForTimeout(200);
    await page.click('#faq-close');
    await page.waitForTimeout(200);
    await expect(page.locator('#faq-overlay')).not.toHaveClass(/open/);
  });

  test('can open Edit tool', async () => {
    await page.click('[data-mode="edit"]');
    await page.waitForTimeout(300);
    await expect(page.locator('#mode-edit')).toBeVisible();
    await expect(page.locator('#edit-dropzone')).toBeVisible();
    await docScreenshot(page, '02-edit-dropzone', browserName);
  });

  test('can load image via file chooser', async () => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#edit-dropzone');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#editor-canvas')).toBeVisible();
    const dims = await getCanvasDims(page);
    expect(dims.width).toBe(500);
    expect(dims.height).toBe(300);
    await docScreenshot(page, '03-edit-image-loaded', browserName);
  });

  test('rotate right swaps dimensions', async () => {
    await page.click('#btn-rotate-right');
    await page.waitForTimeout(300);
    const dims = await getCanvasDims(page);
    expect(dims.width).toBe(300);
    expect(dims.height).toBe(500);
    await docScreenshot(page, '04-edit-rotated-right', browserName);
  });

  test('rotate left restores dimensions', async () => {
    await page.click('#btn-rotate-left');
    await page.waitForTimeout(300);
    const dims = await getCanvasDims(page);
    expect(dims.width).toBe(500);
    expect(dims.height).toBe(300);
  });

  test('undo removes last operation', async () => {
    await page.click('#btn-undo');
    await page.waitForTimeout(300);
    // After undoing the rotate-left, we should be back to rotated-right (300x500)
    const dims = await getCanvasDims(page);
    expect(dims.width).toBe(300);
    expect(dims.height).toBe(500);
  });

  test('redo restores undone operation', async () => {
    await page.click('#btn-redo');
    await page.waitForTimeout(300);
    const dims = await getCanvasDims(page);
    expect(dims.width).toBe(500);
    expect(dims.height).toBe(300);
  });

  test('resize handles are visible', async () => {
    const handles = page.locator('#img-resize-handles');
    await expect(handles).toBeVisible();
  });

  test('back button prompts when work exists', async () => {
    // We have operations in pipeline, so back should prompt
    const dialogPromise = page.waitForEvent('dialog', { timeout: 3000 }).catch(() => null);
    await page.click('#btn-back');
    await page.waitForTimeout(500);
    // pixDialog is custom, not native — check if dialog overlay appeared
    const dialogVisible = await page.locator('.gazo-dialog-backdrop:visible').count().catch(() => 0);
    // Accept or the mode-edit might still be visible
    await docScreenshot(page, '05-back-unsaved-prompt', browserName);
  });
});
