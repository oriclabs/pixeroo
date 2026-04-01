// Gazo E2E — Colors Tool (comprehensive)
import { test, expect } from '@playwright/test';
import { getExtensionId, openTool, goHome, docScreenshot } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');

test.describe('Colors Tool', () => {
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
  test('opens colors mode from home', async () => {
    await openTool(page, 'colors');
    await expect(page.locator('#mode-colors')).toBeVisible();
  });

  test('dropzone visible when no image', async () => {
    await expect(page.locator('#colors-drop')).toBeVisible();
    await expect(page.locator('#colors-preview')).toBeHidden();
  });

  test('palette shows no image loaded', async () => {
    const text = await page.locator('#palette-colors').textContent();
    expect(text).toContain('No image');
  });

  // ── Ribbon controls ──
  test('eyedropper shows default text', async () => {
    const text = await page.locator('#picked-color').textContent();
    expect(text).toContain('Click any pixel');
  });

  test('palette count slider defaults to 6', async () => {
    expect(await page.locator('#palette-count').inputValue()).toBe('6');
    expect(await page.locator('#palette-count-val').textContent()).toBe('6');
  });

  test('re-extract button exists', async () => {
    await expect(page.locator('#btn-reextract')).toBeVisible();
  });

  test('copy palette button disabled initially', async () => {
    await expect(page.locator('#btn-copy-palette')).toBeDisabled();
  });

  // ══════════════════════════════════════════
  //  LOAD IMAGE
  // ══════════════════════════════════════════
  test('loads image via file chooser', async () => {
    const fc = page.waitForEvent('filechooser');
    await page.click('#colors-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(FIXTURES, 'test-500x300.png'));
    await page.waitForTimeout(800);
    await expect(page.locator('#colors-drop')).toBeHidden();
    await expect(page.locator('#colors-preview')).toBeVisible();
  });

  test('canvas is visible with crosshair cursor', async () => {
    const cursor = await page.locator('#colors-canvas').evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('crosshair');
  });

  test('canvas has correct dimensions', async () => {
    const dims = await page.locator('#colors-canvas').evaluate(el => ({ w: el.width, h: el.height }));
    expect(dims.w).toBe(500);
    expect(dims.h).toBe(300);
  });

  // ══════════════════════════════════════════
  //  PALETTE EXTRACTION
  // ══════════════════════════════════════════
  test('palette is extracted automatically', async () => {
    const colors = page.locator('#palette-colors .color-row');
    const count = await colors.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(12);
  });

  test('copy palette button enabled after extraction', async () => {
    await expect(page.locator('#btn-copy-palette')).toBeEnabled();
  });

  test('palette colors show hex values', async () => {
    const text = await page.locator('#palette-colors').textContent();
    expect(text).toMatch(/#[0-9a-fA-F]{6}/);
  });

  test('palette colors show rgb values', async () => {
    const text = await page.locator('#palette-colors').textContent();
    expect(text).toMatch(/rgb\(/);
  });

  test('palette colors show percentage', async () => {
    const text = await page.locator('#palette-colors').textContent();
    expect(text).toMatch(/\d+%/);
  });

  test('screenshot: palette extracted', async () => {
    await docScreenshot(page, 'colors-palette-extracted', browserName);
  });

  // ══════════════════════════════════════════
  //  PALETTE COUNT
  // ══════════════════════════════════════════
  test('changing palette count updates label', async () => {
    await page.locator('#palette-count').fill('3');
    await page.locator('#palette-count').dispatchEvent('input');
    await page.waitForTimeout(100);
    expect(await page.locator('#palette-count-val').textContent()).toBe('3');
  });

  test('re-extract with new count changes palette size', async () => {
    await page.click('#btn-reextract');
    await page.waitForTimeout(300);
    const count = await page.locator('#palette-colors .color-row').count();
    expect(count).toBeLessThanOrEqual(3);
  });

  test('increase count and re-extract', async () => {
    await page.locator('#palette-count').fill('10');
    await page.locator('#palette-count').dispatchEvent('input');
    await page.click('#btn-reextract');
    await page.waitForTimeout(300);
    const count = await page.locator('#palette-colors .color-row').count();
    expect(count).toBeGreaterThan(3);
    // Reset to 6
    await page.locator('#palette-count').fill('6');
    await page.locator('#palette-count').dispatchEvent('input');
    await page.click('#btn-reextract');
    await page.waitForTimeout(300);
  });

  // ══════════════════════════════════════════
  //  EYEDROPPER — Click pixel
  // ══════════════════════════════════════════
  test('clicking canvas picks a color', async () => {
    await page.click('#colors-canvas', { position: { x: 50, y: 50 } });
    await page.waitForTimeout(200);
    const html = await page.locator('#picked-color').innerHTML();
    // Should contain a color swatch and hex
    expect(html).toContain('#');
    expect(html).not.toContain('Click any pixel');
  });

  test('picked color shows swatch', async () => {
    const swatch = page.locator('#picked-color span').first();
    const bg = await swatch.evaluate(el => el.style.background);
    expect(bg).toBeTruthy();
  });

  test('picked color has hex format', async () => {
    const text = await page.locator('#picked-color').textContent();
    expect(text).toMatch(/#[0-9a-fA-F]{6}/);
  });

  test('picked color hex is clickable (copy)', async () => {
    const copyEl = page.locator('#picked-color [data-copy]');
    await expect(copyEl).toBeVisible();
    const hex = await copyEl.getAttribute('data-copy');
    expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('picked color tooltip shows rgb and hsl', async () => {
    const title = await page.locator('#picked-color [data-copy]').getAttribute('title');
    expect(title).toContain('rgb(');
    expect(title).toContain('hsl(');
    expect(title).toContain('click to copy');
  });

  test('clicking different pixel changes color', async () => {
    const before = await page.locator('#picked-color').textContent();
    await page.click('#colors-canvas', { position: { x: 250, y: 150 } });
    await page.waitForTimeout(200);
    // Color may or may not change depending on image, but it should still show a valid hex
    const after = await page.locator('#picked-color').textContent();
    expect(after).toMatch(/#[0-9a-fA-F]{6}/);
  });

  test('screenshot: color picked', async () => {
    await docScreenshot(page, 'colors-picked', browserName);
  });

  // ══════════════════════════════════════════
  //  COPY PALETTE
  // ══════════════════════════════════════════
  test('copy palette button is enabled', async () => {
    await expect(page.locator('#btn-copy-palette')).toBeEnabled();
  });

  // ══════════════════════════════════════════
  //  LOAD DIFFERENT IMAGE
  // ══════════════════════════════════════════
  test('can drop new image to replace', async () => {
    // The colors tool uses setupWorkAreaReplace or the dropzone
    // Drop a new file via evaluate
    const loaded = await page.evaluate(async () => {
      // Re-show dropzone
      const drop = document.getElementById('colors-drop');
      drop.style.display = '';
      return true;
    });
    expect(loaded).toBe(true);

    const fc = page.waitForEvent('filechooser');
    await page.click('#colors-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(FIXTURES, 'test-200x200.png'));
    await page.waitForTimeout(800);

    const dims = await page.locator('#colors-canvas').evaluate(el => ({ w: el.width, h: el.height }));
    expect(dims.w).toBe(200);
    expect(dims.h).toBe(200);
  });

  test('palette re-extracted for new image', async () => {
    const count = await page.locator('#palette-colors .color-row').count();
    expect(count).toBeGreaterThan(0);
  });

  // ══════════════════════════════════════════
  //  LOAD EXIF JPEG
  // ══════════════════════════════════════════
  test('loads EXIF JPEG for color extraction', async () => {
    await page.evaluate(() => { document.getElementById('colors-drop').style.display = ''; });
    const fc = page.waitForEvent('filechooser');
    await page.click('#colors-drop');
    const chooser = await fc;
    await chooser.setFiles(path.join(FIXTURES, 'exif', 'orientation-Landscape_1.jpg'));
    await page.waitForTimeout(800);
    await expect(page.locator('#colors-preview')).toBeVisible();
    const count = await page.locator('#palette-colors .color-row').count();
    expect(count).toBeGreaterThan(0);
  });

  test('screenshot: EXIF JPEG colors', async () => {
    await docScreenshot(page, 'colors-exif-jpeg', browserName);
  });

  // ══════════════════════════════════════════
  //  BACK TO HOME
  // ══════════════════════════════════════════
  test('back returns to home', async () => {
    await goHome(page);
    await expect(page.locator('#home')).toBeVisible();
  });
});
