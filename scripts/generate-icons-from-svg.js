// Generate PNG icons from icon.svg using Playwright (browser rendering)
// Run: node scripts/generate-icons-from-svg.js
// Requires: npx playwright install chromium

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_PATH = join(ROOT, 'browser/chrome/icons/icon.svg');

const sizes = [
  { size: 16,  dir: 'browser/chrome/icons', name: 'icon16.png' },
  { size: 32,  dir: 'browser/chrome/icons', name: 'icon32.png' },
  { size: 48,  dir: 'browser/chrome/icons', name: 'icon48.png' },
  { size: 128, dir: 'browser/chrome/icons', name: 'icon128.png' },
  { size: 16,  dir: 'browser/edge/icons', name: 'icon16.png' },
  { size: 32,  dir: 'browser/edge/icons', name: 'icon32.png' },
  { size: 48,  dir: 'browser/edge/icons', name: 'icon48.png' },
  { size: 128, dir: 'browser/edge/icons', name: 'icon128.png' },
  { size: 16,  dir: 'browser/firefox/icons', name: 'icon16.png' },
  { size: 32,  dir: 'browser/firefox/icons', name: 'icon32.png' },
  { size: 48,  dir: 'browser/firefox/icons', name: 'icon48.png' },
  { size: 128, dir: 'browser/firefox/icons', name: 'icon128.png' },
  { size: 44,  dir: 'website/pwa/icons', name: 'icon-44.png' },
  { size: 50,  dir: 'website/pwa/icons', name: 'icon-50.png' },
  { size: 150, dir: 'website/pwa/icons', name: 'icon-150.png' },
  { size: 192, dir: 'website/pwa/icons', name: 'icon-192.png' },
  { size: 300, dir: 'website/pwa/icons', name: 'icon-300.png' },
  { size: 512, dir: 'website/pwa/icons', name: 'icon-512.png' },
  { size: 620, dir: 'website/pwa/icons', name: 'icon-620.png' },
  { size: 512, dir: 'website/pwa/icons', name: 'icon-maskable-512.png' },
  { size: 32,  dir: 'website', name: 'icon32.png' },
  { size: 64,  dir: 'website', name: 'icon64.png' },
  { size: 80,  dir: 'website', name: 'icon80.png' },
  { size: 128, dir: 'website', name: 'icon128.png' },
];

async function main() {
  console.log('Generating Gazo icons from icon.svg...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load a blank page and render SVG via canvas for each size
  await page.setContent(`
    <html><body style="margin:0;background:transparent;">
      <canvas id="c"></canvas>
      <script>
        async function renderSVG(svgUrl, size) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const c = document.getElementById('c');
              c.width = size;
              c.height = size;
              const ctx = c.getContext('2d');
              ctx.clearRect(0, 0, size, size);
              ctx.drawImage(img, 0, 0, size, size);
              resolve(c.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = svgUrl;
          });
        }
      </script>
    </body></html>
  `);

  // Read SVG and convert to data URI
  const svgContent = (await import('node:fs')).readFileSync(SVG_PATH, 'utf-8');
  const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);

  // Deduplicate sizes (only render each unique size once)
  const uniqueSizes = [...new Set(sizes.map(s => s.size))];
  const rendered = {};

  for (const size of uniqueSizes) {
    const dataUrl = await page.evaluate(
      ([uri, sz]) => renderSVG(uri, sz),
      [svgDataUri, size]
    );
    if (dataUrl) {
      // Convert data URL to Buffer
      const base64 = dataUrl.split(',')[1];
      rendered[size] = Buffer.from(base64, 'base64');
      console.log(`  Rendered ${size}x${size}`);
    } else {
      console.error(`  Failed to render ${size}x${size}`);
    }
  }

  // Write to all output paths
  for (const { size, dir, name } of sizes) {
    const buf = rendered[size];
    if (!buf) continue;
    const fullDir = join(ROOT, dir);
    mkdirSync(fullDir, { recursive: true });
    const outPath = join(fullDir, name);
    writeFileSync(outPath, buf);
    console.log(`  ${dir}/${name} (${size}x${size}, ${buf.length} bytes)`);
  }

  await browser.close();
  console.log('Done!');
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });
