// Pixeroo Editor - Extended Tools Part 2
// Canvas ops, color ops, generators, social presets, analysis, quality

// ============================================================
// CATEGORY: Canvas Operations
// ============================================================

// #4 Image Overlay/Composite
function compositeImages(baseCanvas, overlayImg, x, y, opacity, blendMode) {
  const ctx = baseCanvas.getContext('2d');
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blendMode || 'source-over';
  ctx.drawImage(overlayImg, x, y);
  ctx.restore();
}

// #8 Canvas Extend / Padding
function addPadding(canvas, top, right, bottom, left, color) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const origW = canvas.width, origH = canvas.height;

  canvas.width = origW + left + right;
  canvas.height = origH + top + bottom;
  ctx.fillStyle = color || 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(imgData, left, top);
}

// #9 Image Split
function splitImage(canvas, direction, parts) {
  const results = [];
  const w = canvas.width, h = canvas.height;

  for (let i = 0; i < parts; i++) {
    const tile = document.createElement('canvas');
    const tCtx = tile.getContext('2d');

    if (direction === 'horizontal') {
      const tileH = Math.floor(h / parts);
      tile.width = w; tile.height = tileH;
      tCtx.drawImage(canvas, 0, i * tileH, w, tileH, 0, 0, w, tileH);
    } else {
      const tileW = Math.floor(w / parts);
      tile.width = tileW; tile.height = h;
      tCtx.drawImage(canvas, i * tileW, 0, tileW, h, 0, 0, tileW, h);
    }
    results.push(tile);
  }
  return results;
}

// ============================================================
// CATEGORY: Color Operations
// ============================================================

// #5 Background Remover (flood-fill from edges)
function removeBackground(canvas, tolerance = 30) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width, h = canvas.height;
  const visited = new Uint8Array(w * h);

  // Get reference color from top-left corner
  const refR = data[0], refG = data[1], refB = data[2];

  function colorMatch(i) {
    return Math.abs(data[i] - refR) + Math.abs(data[i+1] - refG) + Math.abs(data[i+2] - refB) < tolerance * 3;
  }

  // Flood fill from all edges
  const queue = [];
  for (let x = 0; x < w; x++) { queue.push(x); queue.push(x + (h-1) * w); }
  for (let y = 0; y < h; y++) { queue.push(y * w); queue.push((y+1) * w - 1); }

  while (queue.length > 0) {
    const pos = queue.pop();
    if (pos < 0 || pos >= w * h || visited[pos]) continue;
    const i = pos * 4;
    if (!colorMatch(i)) continue;

    visited[pos] = 1;
    data[i+3] = 0; // Make transparent

    const x = pos % w, y = Math.floor(pos / w);
    if (x > 0) queue.push(pos - 1);
    if (x < w - 1) queue.push(pos + 1);
    if (y > 0) queue.push(pos - w);
    if (y < h - 1) queue.push(pos + w);
  }

  ctx.putImageData(imgData, 0, 0);
}

// #6 Color Replace
function replaceColor(canvas, fromR, fromG, fromB, toR, toG, toB, tolerance = 30) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.abs(data[i] - fromR) + Math.abs(data[i+1] - fromG) + Math.abs(data[i+2] - fromB);
    if (dist < tolerance * 3) {
      const blend = 1 - dist / (tolerance * 3);
      data[i]   = Math.round(data[i]   + (toR - data[i])   * blend);
      data[i+1] = Math.round(data[i+1] + (toG - data[i+1]) * blend);
      data[i+2] = Math.round(data[i+2] + (toB - data[i+2]) * blend);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// #21 Channel Separation
function extractChannel(canvas, channel) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const chIndex = { r: 0, g: 1, b: 2, a: 3 }[channel];

  for (let i = 0; i < data.length; i += 4) {
    if (channel === 'a') {
      const a = data[i + 3];
      data[i] = a; data[i+1] = a; data[i+2] = a; data[i+3] = 255;
    } else {
      const val = data[i + chIndex];
      data[i] = channel === 'r' ? val : 0;
      data[i+1] = channel === 'g' ? val : 0;
      data[i+2] = channel === 'b' ? val : 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// ============================================================
// CATEGORY: Adjustments Extended
// ============================================================

// #7 Levels Adjustment (simplified: black point, white point, gamma)
function adjustLevels(canvas, blackPoint, whitePoint, gamma) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const range = whitePoint - blackPoint;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c];
      // Remap to 0-1 based on black/white points
      val = Math.max(0, Math.min(1, (val - blackPoint) / range));
      // Apply gamma
      val = Math.pow(val, 1 / gamma);
      data[i + c] = Math.round(val * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// ============================================================
// CATEGORY: Effects Extended
// ============================================================

// #14 Pixelate Art (downscale + upscale for pixel art look)
function pixelateImage(canvas, blockSize) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const smallW = Math.ceil(w / blockSize);
  const smallH = Math.ceil(h / blockSize);

  // Downscale
  const tmp = document.createElement('canvas');
  tmp.width = smallW; tmp.height = smallH;
  const tc = tmp.getContext('2d');
  tc.imageSmoothingEnabled = false;
  tc.drawImage(canvas, 0, 0, smallW, smallH);

  // Upscale without smoothing
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmp, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

// #10 Perspective Transform (basic 4-point mapping via triangulation)
function perspectiveTransform(canvas, srcPoints, dstPoints) {
  // Basic approach: divide into triangles and use affine transforms
  // srcPoints/dstPoints = [{x,y}, {x,y}, {x,y}, {x,y}] (TL, TR, BR, BL)
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width; tmp.height = canvas.height;
  const tc = tmp.getContext('2d');

  // Simple approach: draw two triangles with texture mapping
  // Triangle 1: TL, TR, BL
  drawTexturedTriangle(tc, canvas, imgData,
    srcPoints[0], srcPoints[1], srcPoints[3],
    dstPoints[0], dstPoints[1], dstPoints[3]);
  // Triangle 2: TR, BR, BL
  drawTexturedTriangle(tc, canvas, imgData,
    srcPoints[1], srcPoints[2], srcPoints[3],
    dstPoints[1], dstPoints[2], dstPoints[3]);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0);
}

function drawTexturedTriangle(ctx, srcCanvas, imgData, s0, s1, s2, d0, d1, d2) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  // Compute affine transform matrix
  const denom = (s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y));
  if (Math.abs(denom) < 0.001) { ctx.restore(); return; }

  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const b = (d0.x * (s1.x - s2.x) + d1.x * (s2.x - s0.x) + d2.x * (s0.x - s1.x)) / -denom;
  const c = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const d = (d0.y * (s1.x - s2.x) + d1.y * (s2.x - s0.x) + d2.y * (s0.x - s1.x)) / -denom;
  const e = d0.x - a * s0.x - b * s0.y;
  const f = d0.y - c * s0.x - d * s0.y;

  ctx.setTransform(a, c, b, d, e, f);
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.restore();
}

// ============================================================
// CATEGORY: Generators (create images from scratch)
// ============================================================

// #15 Gradient Generator
function generateGradient(width, height, type, stops) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  let gradient;
  if (type === 'radial') {
    gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
  } else {
    gradient = ctx.createLinearGradient(0, 0, width, height);
  }

  stops.forEach(s => gradient.addColorStop(s.pos, s.color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

// #16 Pattern Generator
function generatePattern(width, height, type, color1, color2, cellSize) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, width, height);

  if (type === 'checkerboard') {
    ctx.fillStyle = color2;
    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        if (((x / cellSize) + (y / cellSize)) % 2 === 0) {
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }
  } else if (type === 'stripes-h') {
    ctx.fillStyle = color2;
    for (let y = 0; y < height; y += cellSize * 2) {
      ctx.fillRect(0, y, width, cellSize);
    }
  } else if (type === 'stripes-v') {
    ctx.fillStyle = color2;
    for (let x = 0; x < width; x += cellSize * 2) {
      ctx.fillRect(x, 0, cellSize, height);
    }
  } else if (type === 'dots') {
    ctx.fillStyle = color2;
    const r = cellSize / 3;
    for (let y = cellSize/2; y < height; y += cellSize) {
      for (let x = cellSize/2; x < width; x += cellSize) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (type === 'noise') {
    const imgData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 255;
      imgData.data[i] = v; imgData.data[i+1] = v; imgData.data[i+2] = v; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return canvas;
}

// #18 Placeholder Image Generator
function generatePlaceholder(width, height, bgColor, textColor, text) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor || '#94a3b8';
  ctx.fillRect(0, 0, width, height);

  const label = text || `${width} x ${height}`;
  const fontSize = Math.max(12, Math.min(width / label.length * 1.5, height / 4));
  ctx.fillStyle = textColor || '#ffffff';
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);

  return canvas;
}

// ============================================================
// CATEGORY: Social Media Presets
// ============================================================

const SOCIAL_PRESETS = {
  'ig-post':     { name: 'Instagram Post', w: 1080, h: 1080 },
  'ig-story':    { name: 'Instagram Story', w: 1080, h: 1920 },
  'ig-landscape':{ name: 'Instagram Landscape', w: 1080, h: 566 },
  'tw-post':     { name: 'Twitter Post', w: 1200, h: 675 },
  'tw-header':   { name: 'Twitter Header', w: 1500, h: 500 },
  'fb-post':     { name: 'Facebook Post', w: 1200, h: 630 },
  'fb-cover':    { name: 'Facebook Cover', w: 820, h: 312 },
  'yt-thumb':    { name: 'YouTube Thumbnail', w: 1280, h: 720 },
  'li-post':     { name: 'LinkedIn Post', w: 1200, h: 627 },
  'li-banner':   { name: 'LinkedIn Banner', w: 1584, h: 396 },
  'pin-standard':{ name: 'Pinterest Pin', w: 1000, h: 1500 },
  'og-image':    { name: 'OG Image', w: 1200, h: 630 },
};

async function resizeForSocial(canvas, presetKey) {
  const preset = SOCIAL_PRESETS[presetKey];
  if (!preset) return null;

  const result = document.createElement('canvas');
  result.width = preset.w; result.height = preset.h;
  const ctx = result.getContext('2d');

  // Try smart crop (content-aware) if available
  if (typeof smartcrop !== 'undefined') {
    try {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise(r => { img.onload = r; });

      const sc = await smartcrop.crop(img, { width: preset.w, height: preset.h });
      const c = sc.topCrop;
      URL.revokeObjectURL(img.src);

      ctx.drawImage(canvas, c.x, c.y, c.width, c.height, 0, 0, preset.w, preset.h);
      return { canvas: result, name: preset.name, w: preset.w, h: preset.h };
    } catch {}
  }

  // Fallback: center crop
  const scale = Math.max(preset.w / canvas.width, preset.h / canvas.height);
  const sw = preset.w / scale, sh = preset.h / scale;
  const sx = (canvas.width - sw) / 2, sy = (canvas.height - sh) / 2;

  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, preset.w, preset.h);
  return { canvas: result, name: preset.name, w: preset.w, h: preset.h };
}

// #12 Favicon Preview
function generateFaviconPreviews(canvas) {
  const sizes = [16, 32, 48, 64, 180]; // browser tab, bookmark, taskbar, high-res, apple-touch
  return sizes.map(s => {
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, s, s);
    return { size: s, canvas: c };
  });
}

// ============================================================
// CATEGORY: Analysis
// ============================================================

// #11 Aspect Ratio Calculator
function calculateAspectRatio(width, height) {
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  const g = gcd(width, height);
  return { ratio: `${width/g}:${height/g}`, decimal: (width/height).toFixed(4) };
}

// Common sizes for reference
const COMMON_RATIOS = [
  { name: '1:1 (Square)', w: 1, h: 1 },
  { name: '4:3 (Classic)', w: 4, h: 3 },
  { name: '3:2 (Photo)', w: 3, h: 2 },
  { name: '16:9 (Widescreen)', w: 16, h: 9 },
  { name: '16:10 (Laptop)', w: 16, h: 10 },
  { name: '21:9 (Ultrawide)', w: 21, h: 9 },
  { name: '9:16 (Mobile)', w: 9, h: 16 },
  { name: 'A4 Paper', w: 210, h: 297 },
];

// #17 SSIM (Structural Similarity Index) - simplified
function computeSSIM(canvasA, canvasB) {
  const w = Math.min(canvasA.width, canvasB.width);
  const h = Math.min(canvasA.height, canvasB.height);

  const cA = document.createElement('canvas'); cA.width = w; cA.height = h;
  cA.getContext('2d').drawImage(canvasA, 0, 0, w, h);
  const cB = document.createElement('canvas'); cB.width = w; cB.height = h;
  cB.getContext('2d').drawImage(canvasB, 0, 0, w, h);

  const dA = cA.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const dB = cB.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;

  const n = w * h;
  let sumA = 0, sumB = 0, sumA2 = 0, sumB2 = 0, sumAB = 0;

  for (let i = 0; i < dA.length; i += 4) {
    const a = (dA[i] * 0.299 + dA[i+1] * 0.587 + dA[i+2] * 0.114); // luminance
    const b = (dB[i] * 0.299 + dB[i+1] * 0.587 + dB[i+2] * 0.114);
    sumA += a; sumB += b;
    sumA2 += a * a; sumB2 += b * b;
    sumAB += a * b;
  }

  const meanA = sumA / n, meanB = sumB / n;
  const varA = sumA2 / n - meanA * meanA;
  const varB = sumB2 / n - meanB * meanB;
  const covAB = sumAB / n - meanA * meanB;

  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;

  const ssim = ((2 * meanA * meanB + c1) * (2 * covAB + c2)) /
               ((meanA ** 2 + meanB ** 2 + c1) * (varA + varB + c2));

  return Math.max(0, Math.min(1, ssim));
}

// #20 Metadata Stripper (re-encode to strip all metadata)
async function stripMetadata(canvas, format, quality) {
  const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[format] || 'image/png';
  const q = ['jpeg', 'webp'].includes(format) ? quality : undefined;
  const blob = await new Promise(r => canvas.toBlob(r, mime, q));
  return blob;
}

// #22 Image to ASCII Art
function imageToAscii(canvas, cols = 80) {
  const chars = ' .:-=+*#%@';
  const aspect = 0.5; // character aspect ratio compensation

  const rows = Math.round(cols * (canvas.height / canvas.width) * aspect);
  const tmp = document.createElement('canvas');
  tmp.width = cols; tmp.height = rows;
  const ctx = tmp.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;

  let ascii = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const brightness = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
      ascii += chars[Math.floor(brightness * (chars.length - 1))];
    }
    ascii += '\n';
  }
  return ascii;
}

// ============================================================
// CATEGORY: Collage
// ============================================================

// #23 Collage Maker (grid layout)
function createCollage(canvases, cols, spacing, bgColor) {
  if (canvases.length === 0) return null;

  const rows = Math.ceil(canvases.length / cols);
  // Find max cell size
  let maxW = 0, maxH = 0;
  canvases.forEach(c => { maxW = Math.max(maxW, c.width); maxH = Math.max(maxH, c.height); });

  const cellW = maxW;
  const cellH = maxH;
  const totalW = cols * cellW + (cols + 1) * spacing;
  const totalH = rows * cellH + (rows + 1) * spacing;

  const result = document.createElement('canvas');
  result.width = totalW; result.height = totalH;
  const ctx = result.getContext('2d');

  ctx.fillStyle = bgColor || '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  canvases.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = spacing + col * (cellW + spacing);
    const y = spacing + row * (cellH + spacing);

    // Center image in cell
    const scale = Math.min(cellW / c.width, cellH / c.height);
    const dw = c.width * scale, dh = c.height * scale;
    const dx = x + (cellW - dw) / 2;
    const dy = y + (cellH - dh) / 2;

    ctx.drawImage(c, dx, dy, dw, dh);
  });

  return result;
}

// #19 Favicon Extractor - REMOVED
// Fetching external URLs from extension context risks Chrome review rejection
// (flagged as potential malware download vector)

// ============================================================
// CATEGORY: Quality of Life
// ============================================================

// #2 JPEG Quality Live Preview (returns size for given quality)
async function getJpegSizeAtQuality(canvas, quality) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality / 100));
  return blob.size;
}

// Helper: format size compactly
function fmtSize(b) {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b / 1024).toFixed(0) + 'KB';
  return (b / 1048576).toFixed(1) + 'MB';
}
