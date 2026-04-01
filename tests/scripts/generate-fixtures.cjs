// Generate test fixture images programmatically
// Run: node tests/scripts/generate-fixtures.js
// Requires no external dependencies — uses pure SVG and raw PNG/JPEG generation

const fs = require('fs');
const path = require('path');

const FIXTURES = path.resolve(__dirname, '../fixtures');

// Ensure fixtures dir exists
if (!fs.existsSync(FIXTURES)) fs.mkdirSync(FIXTURES, { recursive: true });

// ── SVG fixtures ──

// Simple icon SVG
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" rx="8" fill="#F4C430" stroke="#1e293b" stroke-width="2"/>
  <circle cx="50" cy="45" r="15" fill="#1e293b"/>
  <path d="M30 75 Q50 60 70 75" fill="none" stroke="#1e293b" stroke-width="3"/>
  <text x="50" y="95" text-anchor="middle" font-size="8" fill="#94a3b8">test</text>
</svg>`;

// Gradient SVG
const gradientSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F4C430"/>
      <stop offset="50%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <radialGradient id="g2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#g1)"/>
  <circle cx="200" cy="150" r="80" fill="url(#g2)" opacity="0.7"/>
  <path d="M50 250 Q200 100 350 250" fill="none" stroke="white" stroke-width="3"/>
</svg>`;

// Text SVG
const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
  <rect width="300" height="200" fill="#0f172a"/>
  <text x="150" y="80" text-anchor="middle" font-size="32" font-weight="bold" fill="#F4C430" font-family="sans-serif">Gazo</text>
  <text x="150" y="120" text-anchor="middle" font-size="14" fill="#94a3b8" font-family="sans-serif">Test Fixture</text>
  <text x="150" y="160" text-anchor="middle" font-size="10" fill="#64748b" font-family="monospace">300×200 SVG</text>
</svg>`;

// Complex SVG with multiple elements
const complexSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400" viewBox="0 0 500 400">
  <defs>
    <filter id="blur1"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="500" height="400" fill="#1e293b"/>
  <rect x="20" y="20" width="150" height="100" rx="10" fill="#ef4444" opacity="0.8"/>
  <rect x="330" y="20" width="150" height="100" rx="10" fill="#3b82f6" opacity="0.8"/>
  <circle cx="250" cy="70" r="40" fill="#22c55e" opacity="0.7"/>
  <ellipse cx="250" cy="250" rx="120" ry="60" fill="#F4C430" opacity="0.5"/>
  <path d="M50 350 L150 280 L250 320 L350 260 L450 350" fill="none" stroke="#ec4899" stroke-width="3"/>
  <line x1="0" y1="200" x2="500" y2="200" stroke="#334155" stroke-width="1" stroke-dasharray="5,5"/>
  <polygon points="250,170 270,210 230,210" fill="#a855f7"/>
  <text x="250" y="390" text-anchor="middle" font-size="12" fill="#64748b">Complex SVG — 8 element types</text>
</svg>`;

// Write SVGs
fs.writeFileSync(path.join(FIXTURES, 'test-icon.svg'), iconSvg);
fs.writeFileSync(path.join(FIXTURES, 'test-gradient.svg'), gradientSvg);
fs.writeFileSync(path.join(FIXTURES, 'test-text.svg'), textSvg);
fs.writeFileSync(path.join(FIXTURES, 'test-complex.svg'), complexSvg);

console.log('SVG fixtures generated');

// ── Minimal PNG generator (no deps) ──
// Creates valid PNG files with solid colors + simple patterns

function createMinimalPNG(width, height, r, g, b, a) {
  // IHDR + IDAT with uncompressed deflate + IEND
  // This creates a valid but uncompressed PNG (large but works)

  function crc32(buf) {
    let c = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let crc = n;
      for (let k = 0; k < 8; k++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
      table[n] = crc;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function uint32be(v) { return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]; }

  function makeChunk(type, data) {
    const typeBytes = [...type].map(c => c.charCodeAt(0));
    const combined = [...typeBytes, ...data];
    const crc = crc32(combined);
    return [...uint32be(data.length), ...combined, ...uint32be(crc)];
  }

  // PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];

  // IHDR
  const ihdr = [...uint32be(width), ...uint32be(height), 8, 6, 0, 0, 0]; // 8-bit RGBA

  // Raw pixel data (each row: filter byte 0 + RGBA pixels)
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      // Simple pattern: gradient from top-left to bottom-right
      const pr = Math.min(255, r + Math.round((x / width) * 30));
      const pg = Math.min(255, g + Math.round((y / height) * 30));
      rawRows.push(pr, pg, b, a);
    }
  }

  // Deflate: store blocks (no compression, max 65535 bytes per block)
  const deflateBlocks = [];
  let offset = 0;
  while (offset < rawRows.length) {
    const remaining = rawRows.length - offset;
    const blockSize = Math.min(65535, remaining);
    const isLast = (offset + blockSize >= rawRows.length) ? 1 : 0;
    deflateBlocks.push(isLast); // BFINAL + BTYPE=00 (stored)
    deflateBlocks.push(blockSize & 0xff, (blockSize >> 8) & 0xff);
    deflateBlocks.push((~blockSize) & 0xff, ((~blockSize) >> 8) & 0xff);
    for (let i = 0; i < blockSize; i++) deflateBlocks.push(rawRows[offset + i]);
    offset += blockSize;
  }

  // zlib wrapper: CMF + FLG + deflate + Adler32
  const cmf = 0x78, flg = 0x01;
  // Adler32
  let s1 = 1, s2 = 0;
  for (const b of rawRows) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
  const adler = ((s2 << 16) | s1) >>> 0;

  const zlibData = [cmf, flg, ...deflateBlocks, ...uint32be(adler)];
  const idat = zlibData;

  const png = [
    ...sig,
    ...makeChunk('IHDR', ihdr),
    ...makeChunk('IDAT', idat),
    ...makeChunk('IEND', []),
  ];

  return Buffer.from(png);
}

// Generate PNG fixtures
const fixtures = [
  { name: 'test-500x300.png', w: 500, h: 300, r: 100, g: 120, b: 200, a: 255 },
  { name: 'test-200x200.png', w: 200, h: 200, r: 60, g: 180, b: 100, a: 255 },
  { name: 'test-1920x1080.png', w: 50, h: 28, r: 40, g: 40, b: 60, a: 255 }, // small proxy (real would be huge uncompressed)
  { name: 'test-transparent-400x400.png', w: 80, h: 80, r: 244, g: 196, b: 48, a: 180 },
  { name: 'test-wide-1500x500.png', w: 150, h: 50, r: 30, g: 60, b: 120, a: 255 },
  { name: 'test-tall-500x1500.png', w: 50, h: 150, r: 120, g: 30, b: 80, a: 255 },
  { name: 'test-tiny-32x32.png', w: 32, h: 32, r: 200, g: 50, b: 50, a: 255 },
];

for (const f of fixtures) {
  const pngPath = path.join(FIXTURES, f.name);
  // Don't overwrite existing fixtures that may be proper images
  if (!fs.existsSync(pngPath) || f.name.startsWith('test-transparent') || f.name.startsWith('test-wide') || f.name.startsWith('test-tall') || f.name.startsWith('test-tiny')) {
    const buf = createMinimalPNG(f.w, f.h, f.r, f.g, f.b, f.a);
    fs.writeFileSync(pngPath, buf);
    console.log(`Generated ${f.name} (${f.w}x${f.h})`);
  } else {
    console.log(`Skipped ${f.name} (exists)`);
  }
}

console.log('All fixtures generated');
