// Gazo E2E — Popup tests
import { test, expect } from '@playwright/test';
import { getExtensionId } from './helpers.js';

test.describe('Popup', () => {
  let page, extId;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    extId = await getExtensionId(context);
    page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test.afterAll(async () => { await page.close(); });

  // ── Layout ─────────────────────────────────────────────
  test('header shows Gazo branding', async () => {
    const text = await page.locator('body').textContent();
    expect(text).toContain('Gazo');
  });

  test('Page Images button exists', async () => {
    await expect(page.locator('#btn-page-images')).toBeVisible();
  });

  test('Toolkit button exists', async () => {
    await expect(page.locator('#btn-toolkit')).toBeVisible();
  });

  // ── Hero buttons ────────────────────────────────────────
  test('Page Images button has title and description', async () => {
    const title = await page.locator('#btn-page-images .hero-btn-title').textContent();
    const desc = await page.locator('#btn-page-images .hero-btn-desc').textContent();
    expect(title).toBe('Page Images');
    expect(desc.length).toBeGreaterThan(0);
  });

  test('Toolkit button has title and description', async () => {
    const title = await page.locator('#btn-toolkit .hero-btn-title').textContent();
    const desc = await page.locator('#btn-toolkit .hero-btn-desc').textContent();
    expect(title).toBe('Toolkit');
    expect(desc.length).toBeGreaterThan(0);
  });

  // ── Quick Actions ──────────────────────────────────────
  test('Quick Actions label is visible', async () => {
    const label = await page.locator('.pqa-label').textContent();
    expect(label).toContain('Quick Actions');
  });

  test('all quick action buttons exist', async () => {
    const ids = ['pqa-screenshot', 'pqa-region', 'pqa-color', 'pqa-paste', 'pqa-library', 'pqa-draw'];
    for (const id of ids) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('quick action buttons have tooltips', async () => {
    const ids = ['pqa-screenshot', 'pqa-region', 'pqa-color', 'pqa-paste', 'pqa-library', 'pqa-draw'];
    for (const id of ids) {
      const title = await page.locator(`#${id}`).getAttribute('title');
      expect(title).toBeTruthy();
    }
  });

  test('Screenshot button has label', async () => {
    const text = await page.locator('#pqa-screenshot').textContent();
    expect(text).toContain('Screenshot');
  });

  test('Paste button has label', async () => {
    const text = await page.locator('#pqa-paste').textContent();
    expect(text).toContain('Paste');
  });

  test('Library button has label', async () => {
    const text = await page.locator('#pqa-library').textContent();
    expect(text).toContain('Library');
  });

  test('Draw button has label', async () => {
    const text = await page.locator('#pqa-draw').textContent();
    expect(text).toContain('Draw');
  });

  // ── QR Section ─────────────────────────────────────────
  test('QR section is visible', async () => {
    await expect(page.locator('#qr-output')).toBeVisible();
  });

  test('QR label says "QR for this page"', async () => {
    const label = await page.locator('.qr-label').textContent();
    expect(label).toContain('QR for this page');
  });

  test('Copy QR button exists', async () => {
    await expect(page.locator('#btn-copy-qr')).toBeVisible();
  });

  test('URL is displayed with link icon below QR', async () => {
    await expect(page.locator('#qr-url')).toBeVisible();
  });

  // ── Gear dropdown ──────────────────────────────────────
  test('gear icon button exists', async () => {
    await expect(page.locator('#btn-gear')).toBeVisible();
  });

  test('gear dropdown is hidden by default', async () => {
    await expect(page.locator('#gear-dropdown')).toBeHidden();
  });

  test('clicking gear opens dropdown', async () => {
    await page.click('#btn-gear');
    await page.waitForTimeout(200);
    await expect(page.locator('#gear-dropdown')).toBeVisible();
  });

  test('gear dropdown has theme select', async () => {
    const options = await page.locator('#qs-theme option').allTextContents();
    expect(options).toContain('Dark');
    expect(options).toContain('Light');
  });

  test('gear dropdown has export format select', async () => {
    const options = await page.locator('#qs-format option').allTextContents();
    expect(options).toContain('PNG');
    expect(options).toContain('JPEG');
    expect(options).toContain('WebP');
  });

  test('gear dropdown has QR correction select', async () => {
    const options = await page.locator('#qs-qr-ecc option').allTextContents();
    expect(options).toContain('Low');
    expect(options).toContain('High');
  });

  test('gear dropdown has panel view select', async () => {
    const options = await page.locator('#qs-view option').allTextContents();
    expect(options).toContain('Tiles');
    expect(options).toContain('Details');
  });

  test('gear dropdown has Advanced Settings link', async () => {
    await expect(page.locator('#btn-advanced')).toBeVisible();
    const text = await page.locator('#btn-advanced').textContent();
    expect(text).toContain('Advanced');
  });

  test('clicking outside closes gear dropdown', async () => {
    // Click on body away from dropdown
    await page.click('body', { position: { x: 10, y: 300 } });
    await page.waitForTimeout(200);
    await expect(page.locator('#gear-dropdown')).toBeHidden();
  });

  test('gear dropdown toggles on repeated clicks', async () => {
    await page.click('#btn-gear');
    await page.waitForTimeout(100);
    await expect(page.locator('#gear-dropdown')).toBeVisible();
    await page.click('#btn-gear');
    await page.waitForTimeout(100);
    await expect(page.locator('#gear-dropdown')).toBeHidden();
  });

  // ── FAQ & Help buttons ──────────────────────────────────
  test('FAQ button exists with tooltip', async () => {
    await expect(page.locator('#btn-faq')).toBeVisible();
    const title = await page.locator('#btn-faq').getAttribute('title');
    expect(title).toContain('Which tool');
  });

  test('help button exists', async () => {
    await expect(page.locator('#btn-help')).toBeVisible();
  });

  // ── Footer ─────────────────────────────────────────────
  test('footer shows version and offline badge', async () => {
    const text = await page.locator('body').textContent();
    expect(text).toContain('v0.1.0');
    expect(text).toContain('Offline');
  });
});
