#!/usr/bin/env node
// Gazo Icon Generator
// Generates PNG icons at 16, 32, 48, 128, 192, 512 px
// Pure Node.js - no external dependencies

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Gazo brand colors
const SAFFRON_LIGHT = [0xFC, 0xD3, 0x4D]; // #FCD34D
const SAFFRON       = [0xF4, 0xC4, 0x30]; // #F4C430
const SAFFRON_DARK  = [0xD4, 0xA0, 0x17]; // #D4A017
const DARK_BG       = [0x0F, 0x17, 0x2A]; // #0f172a
const SLATE_200     = [0xE2, 0xE8, 0xF0]; // #e2e8f0
const TRANSPARENT   = [0, 0, 0, 0];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/**
 * Generate Gazo icon — dark bg, saffron frame border, bold "G" center
 * Design matches brand/logo/10-kanji-frame-with-text.svg simplified for pixel rendering
 */
function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const r = size * 0.1875; // outer corner radius
  const borderW = Math.max(1, Math.round(size * 0.024)); // frame border width
  const frameInset = Math.round(size * 0.11); // frame inset from edge
  const frameR = Math.max(1, Math.round(size * 0.055)); // frame corner radius

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      // Outer rounded rect mask (transparent outside)
      if (!inRoundedRect(x, y, size, size, r)) {
        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0;
        continue;
      }

      // Default: dark background
      let color = DARK_BG;
      let alpha = 255;

      // Frame border (saffron gradient)
      const inOuter = inRoundedRect(x - frameInset, y - frameInset,
        size - frameInset * 2, size - frameInset * 2, frameR);
      const inInner = inRoundedRect(x - frameInset - borderW, y - frameInset - borderW,
        size - (frameInset + borderW) * 2, size - (frameInset + borderW) * 2, Math.max(0, frameR - borderW));

      if (inOuter && !inInner) {
        const t = (nx + ny) / 2;
        color = lerpColor(SAFFRON_LIGHT, SAFFRON_DARK, t);
      }

      // Bold "G" letterform — saffron gradient
      const gColor = getGPixel(nx, ny, size);
      if (gColor) {
        const t = (nx + ny) / 2;
        color = lerpColor(SAFFRON_LIGHT, SAFFRON_DARK, t);
      }

      // Pixel accent (top-right corner, small squares)
      if (size >= 32) {
        const pxS = Math.max(2, Math.round(size * 0.028));
        const pxX = size - frameInset - pxS * 3;
        const pxY = frameInset + Math.round(borderW * 1.5);
        if (x >= pxX && x < pxX + pxS && y >= pxY && y < pxY + pxS) { color = SAFFRON; alpha = 150; }
        if (x >= pxX + pxS + 1 && x < pxX + pxS * 2 + 1 && y >= pxY && y < pxY + pxS) { color = SAFFRON; alpha = 80; }
        if (x >= pxX && x < pxX + pxS && y >= pxY + pxS + 1 && y < pxY + pxS * 2 + 1) { color = SAFFRON; alpha = 80; }
      }

      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = alpha;
    }
  }
  return pixels;
}

// Bold "G" shape check (normalized coordinates)
function getGPixel(nx, ny) {
  // G occupies roughly center of the icon, within the frame
  // Vertical range: 0.22 - 0.68, Horizontal: 0.25 - 0.75

  const cx = 0.50, cy = 0.43; // center of G
  const outerR = 0.20; // outer radius
  const innerR = 0.12; // inner radius
  const gapAngleStart = -0.6; // gap in the circle (right side)
  const gapAngleEnd = 0.6;

  // Check if point is in the ring (outer circle minus inner circle)
  const dx = nx - cx, dy = ny - cy;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d >= innerR && d <= outerR) {
    // Angle from center
    const angle = Math.atan2(dy, dx);
    // Gap on the right side
    if (angle > gapAngleStart && angle < gapAngleEnd) return false;
    return true;
  }

  // Horizontal bar of G (extends inward from right)
  if (nx >= cx && nx <= cx + outerR && ny >= cy - 0.025 && ny <= cy + 0.025) {
    return true;
  }

  return false;
}

function inRoundedRect(x, y, w, h, r) {
  // Check corners
  if (x < r && y < r && dist(x, y, r, r) > r) return false;
  if (x >= w - r && y < r && dist(x, y, w - r, r) > r) return false;
  if (x < r && y >= h - r && dist(x, y, r, h - r) > r) return false;
  if (x >= w - r && y >= h - r && dist(x, y, w - r, h - r) > r) return false;
  return true;
}


/**
 * Encode RGBA pixel data as PNG
 */
function encodePNG(pixels, width, height) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk: filter rows + deflate
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = rowOffset + 1 + x * 4;
      rawData[dstIdx]     = pixels[srcIdx];
      rawData[dstIdx + 1] = pixels[srcIdx + 1];
      rawData[dstIdx + 2] = pixels[srcIdx + 2];
      rawData[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  const compressed = deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBytes = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBytes, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData) >>> 0, 0);

  return Buffer.concat([len, typeBytes, data, crc]);
}

// CRC32 lookup table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ 0xFFFFFFFF;
}

// --- Generate all icons ---
const sizes = [
  { size: 16,  dir: 'browser/chrome/icons', name: 'icon16.png' },
  { size: 32,  dir: 'browser/chrome/icons', name: 'icon32.png' },
  { size: 48,  dir: 'browser/chrome/icons', name: 'icon48.png' },
  { size: 128, dir: 'browser/chrome/icons', name: 'icon128.png' },
  // Edge (same icons, copied later)
  { size: 16,  dir: 'browser/edge/icons', name: 'icon16.png' },
  { size: 32,  dir: 'browser/edge/icons', name: 'icon32.png' },
  { size: 48,  dir: 'browser/edge/icons', name: 'icon48.png' },
  { size: 128, dir: 'browser/edge/icons', name: 'icon128.png' },
  // Firefox
  { size: 16,  dir: 'browser/firefox/icons', name: 'icon16.png' },
  { size: 32,  dir: 'browser/firefox/icons', name: 'icon32.png' },
  { size: 48,  dir: 'browser/firefox/icons', name: 'icon48.png' },
  { size: 128, dir: 'browser/firefox/icons', name: 'icon128.png' },
  // PWA
  { size: 192, dir: 'website/pwa/icons', name: 'icon-192.png' },
  { size: 512, dir: 'website/pwa/icons', name: 'icon-512.png' },
  { size: 512, dir: 'website/pwa/icons', name: 'icon-maskable-512.png' },
];

console.log('Generating Gazo icons...');

for (const { size, dir, name } of sizes) {
  const fullDir = join(ROOT, dir);
  mkdirSync(fullDir, { recursive: true });

  const pixels = generateIcon(size);
  const png = encodePNG(pixels, size, size);
  const outPath = join(fullDir, name);
  writeFileSync(outPath, png);
  console.log(`  ${dir}/${name} (${size}x${size}, ${png.length} bytes)`);
}

console.log('Done! All icons generated.');
