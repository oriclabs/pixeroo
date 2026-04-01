// Gazo E2E — Draw Tool tests
import { test, expect } from '@playwright/test';
import { getExtensionId, openTool, goHome, docScreenshot } from './helpers.js';

test.describe('Draw Tool', () => {
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
  //  NAVIGATION & SETUP
  // ══════════════════════════════════════════
  test('opens draw mode from home', async () => {
    await openTool(page, 'draw');
    await expect(page.locator('#mode-draw')).toBeVisible();
  });

  test('draw is in Essentials section', async () => {
    await page.click('#btn-back');
    await page.waitForTimeout(300);
    const essentials = page.locator('.home-grid-hero [data-mode="draw"]');
    await expect(essentials).toBeVisible();
    await openTool(page, 'draw');
  });

  test('setup panel is visible by default', async () => {
    await expect(page.locator('#draw-setup')).toBeVisible();
    await expect(page.locator('#draw-work')).toBeHidden();
  });

  // ── Presets ──
  test('preset dropdown has size options', async () => {
    const options = await page.locator('#draw-preset option').allTextContents();
    expect(options.length).toBeGreaterThan(5);
  });

  test('custom dimensions default to 800x600', async () => {
    const w = await page.locator('#draw-w').inputValue();
    const h = await page.locator('#draw-h').inputValue();
    expect(w).toBe('800');
    expect(h).toBe('600');
  });

  test('background color picker exists', async () => {
    await expect(page.locator('#draw-bg')).toBeVisible();
  });

  test('transparent background checkbox exists', async () => {
    await expect(page.locator('#draw-bg-transparent')).toBeVisible();
  });

  // ── Create canvas ──
  test('create canvas shows workspace', async () => {
    await page.click('#btn-draw-create');
    await page.waitForTimeout(300);
    await expect(page.locator('#draw-setup')).toBeHidden();
    await expect(page.locator('#draw-work')).toBeVisible();
    await expect(page.locator('#draw-canvas')).toBeVisible();
  });

  test('canvas has correct dimensions', async () => {
    const dims = await page.locator('#draw-canvas').evaluate(el => ({ w: el.width, h: el.height }));
    expect(dims.w).toBe(800);
    expect(dims.h).toBe(600);
  });

  test('dimensions label shows size', async () => {
    const text = await page.locator('#draw-dims').textContent();
    expect(text).toContain('800');
    expect(text).toContain('600');
  });

  // ══════════════════════════════════════════
  //  DRAWING TOOLS
  // ══════════════════════════════════════════
  test('select tool is active by default', async () => {
    await expect(page.locator('[data-draw-tool="select"]')).toHaveClass(/active/);
  });

  test('all drawing tool buttons exist', async () => {
    const tools = ['select', 'rect', 'arrow', 'text', 'pen', 'highlighter', 'curvedArrow'];
    for (const tool of tools) {
      await expect(page.locator(`[data-draw-tool="${tool}"]`)).toBeVisible();
    }
  });

  test('clicking a tool activates it', async () => {
    await page.click('[data-draw-tool="rect"]');
    await page.waitForTimeout(100);
    await expect(page.locator('[data-draw-tool="rect"]')).toHaveClass(/active/);
    await expect(page.locator('[data-draw-tool="select"]')).not.toHaveClass(/active/);
    // Switch back to select
    await page.click('[data-draw-tool="select"]');
    await page.waitForTimeout(100);
  });

  // ── Color & line width ──
  test('color picker exists', async () => {
    await expect(page.locator('#draw-color')).toBeVisible();
  });

  test('line width slider exists with default value', async () => {
    const val = await page.locator('#draw-line-width').inputValue();
    expect(val).toBe('3');
  });

  test('line width label updates on change', async () => {
    await page.locator('#draw-line-width').fill('10');
    await page.locator('#draw-line-width').dispatchEvent('input');
    await page.waitForTimeout(100);
    const label = await page.locator('#draw-line-width-val').textContent();
    expect(label).toBe('10');
    // Reset
    await page.locator('#draw-line-width').fill('3');
    await page.locator('#draw-line-width').dispatchEvent('input');
  });

  // ── Font controls ──
  test('font dropdown exists', async () => {
    await expect(page.locator('#draw-font')).toBeVisible();
    // Should have optgroups from Font Manager
    const groups = await page.locator('#draw-font optgroup').count();
    expect(groups).toBeGreaterThan(0);
  });

  test('font size input exists', async () => {
    const val = await page.locator('#draw-fontsize').inputValue();
    expect(val).toBe('24');
  });

  // ── B / I / U ──
  test('bold button exists and toggles', async () => {
    await expect(page.locator('#draw-bold')).toBeVisible();
    await page.click('#draw-bold');
    await page.waitForTimeout(100);
    await expect(page.locator('#draw-bold')).toHaveClass(/active/);
    await page.click('#draw-bold');
    await page.waitForTimeout(100);
    await expect(page.locator('#draw-bold')).not.toHaveClass(/active/);
  });

  test('italic button exists and toggles', async () => {
    await expect(page.locator('#draw-italic')).toBeVisible();
    await page.click('#draw-italic');
    await page.waitForTimeout(100);
    await expect(page.locator('#draw-italic')).toHaveClass(/active/);
    await page.click('#draw-italic');
    await page.waitForTimeout(100);
  });

  test('underline button exists and toggles', async () => {
    await expect(page.locator('#draw-underline')).toBeVisible();
  });

  // ── Fill toggle ──
  test('fill checkbox exists', async () => {
    await expect(page.locator('#draw-fill')).toBeVisible();
  });

  // ── Image buttons ──
  test('add image from file button exists', async () => {
    await expect(page.locator('#draw-add-image')).toBeAttached();
  });

  test('add image from library button exists', async () => {
    await expect(page.locator('#btn-draw-from-lib')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  ACTIONS
  // ══════════════════════════════════════════
  test('delete button exists', async () => {
    await expect(page.locator('#btn-draw-delete')).toBeVisible();
  });

  test('clear button exists', async () => {
    await expect(page.locator('#btn-draw-clear-objects')).toBeVisible();
  });

  // ── Export ──
  test('export format dropdown has PNG, JPEG, WebP', async () => {
    const options = await page.locator('#draw-export-fmt option').allTextContents();
    expect(options).toContain('PNG');
    expect(options).toContain('JPEG');
    expect(options).toContain('WebP');
  });

  test('export button exists', async () => {
    await expect(page.locator('#btn-draw-export')).toBeVisible();
  });

  test('copy button exists', async () => {
    await expect(page.locator('#btn-draw-copy')).toBeVisible();
  });

  // ── Reset ──
  test('reset restores setup panel', async () => {
    await page.click('#btn-draw-reset');
    await page.waitForTimeout(300);
    // No objects to warn about, should reset immediately
    await expect(page.locator('#draw-setup')).toBeVisible();
    await expect(page.locator('#draw-work')).toBeHidden();
  });

  test('can create canvas again after reset', async () => {
    await page.click('#btn-draw-create');
    await page.waitForTimeout(300);
    await expect(page.locator('#draw-canvas')).toBeVisible();
  });

  // ══════════════════════════════════════════
  //  TOUR & HELP
  // ══════════════════════════════════════════
  test('tour button starts draw tour', async () => {
    await page.click('#btn-tour');
    await page.waitForTimeout(500);
    const tooltip = page.locator('div', { hasText: 'Step 1 of' });
    await expect(tooltip.first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ── Back to home ──
  test('back button returns to home', async () => {
    await goHome(page);
    await expect(page.locator('#home')).toBeVisible();
  });
});
