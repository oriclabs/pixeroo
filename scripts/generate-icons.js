#!/usr/bin/env node
// Pixeroo Icon Generator
// Generates PNG icons at 16, 32, 48, 128, 192, 512 px
// Pure Node.js - no external dependencies

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Saffron palette
const SAFFRON_LIGHT = [0xF4, 0xC4, 0x30]; // #F4C430
const SAFFRON_DARK  = [0xB8, 0x86, 0x0B]; // #B8860B
const ICON_STROKE   = [0x2A, 0x1E, 0x05]; // #2A1E05
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
 * Generate icon pixel data at given size
 * Design: saffron gradient rounded rect with image icon (frame + sun + mountain)
 */
function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const r = size * 0.1875; // corner radius (~6/32)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size; // normalized 0-1
      const ny = y / size;

      // Rounded rect mask
      if (!inRoundedRect(x, y, size, size, r)) {
        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0;
        continue;
      }

      // Background gradient (top-left to bottom-right)
      const t = (nx + ny) / 2;
      const bg = lerpColor(SAFFRON_LIGHT, SAFFRON_DARK, t);

      // Draw the image icon motif
      const color = getIconPixel(nx, ny, size, bg);
      pixels[idx]     = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = color[3] !== undefined ? color[3] : 255;
    }
  }
  return pixels;
}

function inRoundedRect(x, y, w, h, r) {
  // Check corners
  if (x < r && y < r && dist(x, y, r, r) > r) return false;
  if (x >= w - r && y < r && dist(x, y, w - r, r) > r) return false;
  if (x < r && y >= h - r && dist(x, y, r, h - r) > r) return false;
  if (x >= w - r && y >= h - r && dist(x, y, w - r, h - r) > r) return false;
  return true;
}

function getIconPixel(nx, ny, size, bg) {
  // Bold "P" letterform with pixel-grid accent
  // The "P" is white/light on the saffron gradient

  const WHITE = [255, 255, 255];
  const DARK = ICON_STROKE;

  // --- Bold "P" letter ---
  // Vertical stem: x 0.25-0.40, y 0.20-0.80
  if (nx >= 0.25 && nx <= 0.40 && ny >= 0.20 && ny <= 0.80) {
    return WHITE;
  }

  // Top bar of P: x 0.40-0.65, y 0.20-0.33
  if (nx >= 0.40 && nx <= 0.65 && ny >= 0.20 && ny <= 0.33) {
    return WHITE;
  }

  // Right curve of P (approximated as rectangle + rounded): x 0.65-0.75, y 0.20-0.52
  if (nx >= 0.65 && nx <= 0.75 && ny >= 0.20 && ny <= 0.52) {
    return WHITE;
  }

  // Bottom bar of P bowl: x 0.40-0.65, y 0.40-0.52
  if (nx >= 0.40 && nx <= 0.65 && ny >= 0.40 && ny <= 0.52) {
    return WHITE;
  }

  // --- Pixel grid accent (3 small squares bottom-right) ---
  // These give it an "image processing" feel
  const pxSize = 0.08;

  // Pixel 1: bottom-right
  if (nx >= 0.72 && nx <= 0.72 + pxSize && ny >= 0.70 && ny <= 0.70 + pxSize) {
    return DARK;
  }
  // Pixel 2
  if (nx >= 0.60 && nx <= 0.60 + pxSize && ny >= 0.70 && ny <= 0.70 + pxSize) {
    return WHITE;
  }
  // Pixel 3
  if (nx >= 0.72 && nx <= 0.72 + pxSize && ny >= 0.58 && ny <= 0.58 + pxSize) {
    return WHITE;
  }
  // Pixel 4 (darker)
  if (nx >= 0.60 && nx <= 0.60 + pxSize && ny >= 0.58 && ny <= 0.58 + pxSize) {
    return DARK;
  }

  return bg;
}

function isOnRoundedRectBorder(nx, ny, x1, y1, x2, y2, r, sw) {
  // Check if point is on the border of a rounded rect
  const inside = inNormRoundedRect(nx, ny, x1, y1, x2, y2, r);
  const insideInner = inNormRoundedRect(nx, ny, x1 + sw, y1 + sw, x2 - sw, y2 - sw, Math.max(0, r - sw));
  return inside && !insideInner;
}

function inNormRoundedRect(nx, ny, x1, y1, x2, y2, r) {
  if (nx < x1 || nx > x2 || ny < y1 || ny > y2) return false;
  // corners
  if (nx < x1 + r && ny < y1 + r && dist(nx, ny, x1 + r, y1 + r) > r) return false;
  if (nx > x2 - r && ny < y1 + r && dist(nx, ny, x2 - r, y1 + r) > r) return false;
  if (nx < x1 + r && ny > y2 - r && dist(nx, ny, x1 + r, y2 - r) > r) return false;
  if (nx > x2 - r && ny > y2 - r && dist(nx, ny, x2 - r, y2 - r) > r) return false;
  return true;
}

function isOnMountainPath(nx, ny, sw) {
  // Mountain stroke: polyline from (0.8125, 0.625) -> (0.5, 0.3125) -> (0.25, 0.8125)
  const points = [
    [0.8125, 0.625],
    [0.5, 0.3125],
    [0.25, 0.8125]
  ];

  for (let i = 0; i < points.length - 1; i++) {
    if (distToSegment(nx, ny, points[i][0], points[i][1], points[i+1][0], points[i+1][1]) < sw) {
      return true;
    }
  }
  return false;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * dx, y1 + t * dy);
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

console.log('Generating Pixeroo icons...');

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
