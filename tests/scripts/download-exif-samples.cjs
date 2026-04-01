// Download EXIF sample images from open-source repos
// Run: node tests/scripts/download-exif-samples.cjs
// Sources:
//   - https://github.com/recurser/exif-orientation-examples (MIT)
//   - https://github.com/ianare/exif-samples (MIT)

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EXIF_DIR = path.resolve(__dirname, '../fixtures/exif');
if (!fs.existsSync(EXIF_DIR)) fs.mkdirSync(EXIF_DIR, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { console.log(`  Skip (exists): ${path.basename(dest)}`); resolve(); return; }
    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close(); fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log(`  Downloaded: ${path.basename(dest)}`); resolve(); });
    }).on('error', (e) => { fs.unlinkSync(dest); reject(e); });
  });
}

const RAW_GH = 'https://raw.githubusercontent.com';

// EXIF orientation examples (all 8 orientations) — small JPEG files
// From: https://github.com/recurser/exif-orientation-examples
const ORIENTATION_BASE = `${RAW_GH}/recurser/exif-orientation-examples/master`;
const orientationFiles = [
  'Landscape_1.jpg',   // Normal
  'Landscape_2.jpg',   // Mirrored horizontal
  'Landscape_3.jpg',   // Rotated 180
  'Landscape_4.jpg',   // Mirrored vertical
  'Landscape_5.jpg',   // Mirrored horizontal + rotated 270
  'Landscape_6.jpg',   // Rotated 90
  'Landscape_7.jpg',   // Mirrored horizontal + rotated 90
  'Landscape_8.jpg',   // Rotated 270
  'Portrait_1.jpg',    // Normal portrait
  'Portrait_6.jpg',    // Portrait rotated 90 (common phone photo)
  'Portrait_8.jpg',    // Portrait rotated 270
];

// EXIF samples with various metadata (GPS, camera info, etc.)
// From: https://github.com/ianare/exif-samples
const IANARE_BASE = `${RAW_GH}/ianare/exif-samples/master/jpg`;
const ianareFiles = [
  { url: `${IANARE_BASE}/Canon_40D.jpg`, name: 'canon-40d.jpg' },
  { url: `${IANARE_BASE}/gps/DSCN0010.jpg`, name: 'gps-nikon.jpg' },
  { url: `${IANARE_BASE}/long_description.jpg`, name: 'long-description.jpg' },
];

async function main() {
  console.log('Downloading EXIF orientation samples...');
  for (const file of orientationFiles) {
    await download(`${ORIENTATION_BASE}/${file}`, path.join(EXIF_DIR, `orientation-${file}`));
  }

  console.log('\nDownloading EXIF metadata samples...');
  for (const { url, name } of ianareFiles) {
    await download(url, path.join(EXIF_DIR, name));
  }

  // Create a README
  fs.writeFileSync(path.join(EXIF_DIR, 'README.md'),
`# EXIF Test Samples

## Sources
- **Orientation examples**: [recurser/exif-orientation-examples](https://github.com/recurser/exif-orientation-examples) (MIT License)
- **Metadata samples**: [ianare/exif-samples](https://github.com/ianare/exif-samples) (MIT License)

## Files
- \`orientation-Landscape_*.jpg\` — All 8 EXIF orientation values (landscape)
- \`orientation-Portrait_*.jpg\` — Portrait orientations (1, 6, 8)
- \`canon-40d.jpg\` — Canon camera EXIF data
- \`gps-nikon.jpg\` — Nikon with GPS coordinates
- \`long-description.jpg\` — JPEG with long EXIF description field
`);

  // WebP test files from libwebp-test-data (BSD-3)
  const WEBP_DIR = path.resolve(__dirname, '../fixtures/webp');
  if (!fs.existsSync(WEBP_DIR)) fs.mkdirSync(WEBP_DIR, { recursive: true });

  // WebP samples from various open-source test suites
  const webpFiles = [
    { url: 'https://www.gstatic.com/webp/gallery/1.webp', name: 'gallery-1.webp' },
    { url: 'https://www.gstatic.com/webp/gallery/2.webp', name: 'gallery-2.webp' },
    { url: 'https://www.gstatic.com/webp/gallery/3.webp', name: 'gallery-3.webp' },
    { url: 'https://www.gstatic.com/webp/gallery/4.webp', name: 'gallery-4.webp' },
    { url: 'https://www.gstatic.com/webp/gallery/5.webp', name: 'gallery-5.webp' },
    { url: 'https://www.gstatic.com/webp/gallery3/1_webp_ll.webp', name: 'lossless-1.webp' },
    { url: 'https://www.gstatic.com/webp/gallery3/2_webp_ll.webp', name: 'lossless-2.webp' },
    { url: 'https://www.gstatic.com/webp/gallery3/3_webp_ll.webp', name: 'lossless-3.webp' },
  ];

  console.log('\nDownloading WebP test samples...');
  for (const { url, name } of webpFiles) {
    await download(url, path.join(WEBP_DIR, name));
  }

  fs.writeFileSync(path.join(WEBP_DIR, 'README.md'),
`# WebP Test Samples

## Source
[webmproject/libwebp-test-data](https://github.com/webmproject/libwebp-test-data) (BSD-3-Clause License)

## Files
- \`gallery-*.webp\` — Lossy encoded WebP (Google gallery samples)
- \`lossless-*.webp\` — Lossless encoded WebP
`);

  console.log('\nDone! Files in tests/fixtures/exif/ and tests/fixtures/webp/');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
