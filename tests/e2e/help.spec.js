// Gazo E2E — Help page tests
import { test, expect } from '@playwright/test';
import { getExtensionId } from './helpers.js';

test.describe('Help Page', () => {
  let page, extId;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    extId = await getExtensionId(context);
    page = await context.newPage();
    await page.goto(`chrome-extension://${extId}/help/help.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test.afterAll(async () => { await page.close(); });

  // ── Layout ─────────────────────────────────────────────
  test('help page loads with nav and content', async () => {
    await expect(page.locator('#nav')).toBeVisible();
    await expect(page.locator('#content')).toBeVisible();
  });

  test('nav shows Gazo Help title', async () => {
    const title = await page.locator('.help-nav-title').textContent();
    expect(title).toContain('Gazo Help');
  });

  // ── All tools present in navigation ────────────────────
  const expectedTools = [
    'Overview', 'Edit', 'Convert', 'Compress', 'Batch Edit', 'Social Media',
    'Collage', 'Showcase', 'Meme', 'Watermark', 'Callout', 'Generate',
    'GIF Creator', 'Certificate', 'Info', 'Colors', 'Compare', 'SVG Tools',
    'QR Code', 'Store Assets', 'Side Panel', 'Draw', 'Which Tool?', 'Shortcuts'
  ];

  test('nav has all tool entries', async () => {
    const navItems = await page.locator('.help-nav-item').allTextContents();
    for (const tool of expectedTools) {
      expect(navItems).toContain(tool);
    }
  });

  // ── Default page ───────────────────────────────────────
  test('overview page loads by default', async () => {
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Gazo');
    expect(content).toContain('100% Offline');
  });

  test('overview lists all tools', async () => {
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Edit');
    expect(content).toContain('Compress');
    expect(content).toContain('SVG Tools');
    expect(content).toContain('QR Code');
  });

  // ── Navigation between pages ───────────────────────────
  test('clicking Edit nav loads Edit help', async () => {
    await page.click('.help-nav-item:text("Edit")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Image Editor');
    expect(content).toContain('Non-destructive');
  });

  test('Edit help has shortcuts table', async () => {
    const content = await page.locator('#content').innerHTML();
    expect(content).toContain('Ctrl+Z');
    expect(content).toContain('Ctrl+S');
  });

  test('clicking Compress nav loads Compress help', async () => {
    await page.click('.help-nav-item:text("Compress")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Image Compressor');
    expect(content).toContain('quality');
    expect(content).toContain('Target size');
  });

  test('Compress help explains difference from Convert and Batch', async () => {
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Compress vs Convert vs Batch');
  });

  test('clicking SVG Tools nav loads SVG help', async () => {
    await page.click('.help-nav-item:text("SVG Tools")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Inspect Tab');
    expect(content).toContain('Trace Tab');
    expect(content).toContain('syntax highlighting');
  });

  test('clicking Batch Edit nav loads Batch help', async () => {
    await page.click('.help-nav-item:text("Batch Edit")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Batch Processing');
    expect(content).toContain('Rename Patterns');
  });

  test('clicking Convert nav loads Convert help', async () => {
    await page.click('.help-nav-item:text("Convert")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Format Conversion');
    expect(content).toContain('Supported Formats');
  });

  test('clicking QR Code nav loads QR help', async () => {
    await page.click('.help-nav-item:text("QR Code")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Generate');
    expect(content).toContain('Read');
    expect(content).toContain('Bulk');
  });

  // ── Hash bookmark navigation ───────────────────────────
  test('URL hash updates on navigation', async () => {
    await page.click('.help-nav-item:text("Colors")');
    await page.waitForTimeout(200);
    const url = page.url();
    expect(url).toContain('#colors');
  });

  test('direct hash URL loads correct page', async () => {
    await page.goto(`chrome-extension://${extId}/help/help.html#compress`);
    await page.waitForTimeout(500);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Image Compressor');
    // Nav item should be active
    const activeNav = await page.locator('.help-nav-item.active').textContent();
    expect(activeNav).toBe('Compress');
  });

  // ── Side Panel section ─────────────────────────────────
  test('Side Panel help loads via nav', async () => {
    await page.click('.help-nav-item:text("Side Panel")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Side Panel');
    expect(content).toContain('Page');
    expect(content).toContain('Library');
    expect(content).toContain('Page Colors');
  });

  test('Side Panel help covers quick actions', async () => {
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Screenshot');
    expect(content).toContain('Region');
  });

  // ── FAQ section ────────────────────────────────────────
  test('FAQ section loads via nav', async () => {
    await page.click('.help-nav-item:text("Which Tool?")');
    await page.waitForTimeout(200);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Which Tool Should I Use');
  });

  test('FAQ has all task groups', async () => {
    const content = await page.locator('#content').textContent();
    expect(content).toContain('make an image smaller');
    expect(content).toContain('change the format');
    expect(content).toContain('edit or annotate');
    expect(content).toContain('create something');
    expect(content).toContain('inspect or analyze');
    expect(content).toContain('prepare for publishing');
    expect(content).toContain('images on a web page');
    expect(content).toContain('save images for later');
  });

  test('FAQ mentions all key tools and features', async () => {
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Compress');
    expect(content).toContain('Convert');
    expect(content).toContain('Batch Edit');
    expect(content).toContain('Edit');
    expect(content).toContain('Watermark');
    expect(content).toContain('Social Media');
    expect(content).toContain('SVG Tools');
    expect(content).toContain('QR Code');
    expect(content).toContain('Side Panel');
    expect(content).toContain('Library');
    expect(content).toContain('Right-click');
  });

  test('FAQ loads via direct hash URL', async () => {
    await page.goto(`chrome-extension://${extId}/help/help.html#faq`);
    await page.waitForTimeout(500);
    const content = await page.locator('#content').textContent();
    expect(content).toContain('Which Tool Should I Use');
    const activeNav = await page.locator('.help-nav-item.active').textContent();
    expect(activeNav).toBe('Which Tool?');
  });

  // ── Active nav state ───────────────────────────────────
  test('clicking a nav item marks it active', async () => {
    await page.click('.help-nav-item:text("Info")');
    await page.waitForTimeout(200);
    const activeNav = await page.locator('.help-nav-item.active').textContent();
    expect(activeNav).toBe('Info');
  });

  test('only one nav item is active at a time', async () => {
    const activeCount = await page.locator('.help-nav-item.active').count();
    expect(activeCount).toBe(1);
  });
});
