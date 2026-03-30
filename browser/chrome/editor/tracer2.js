// Snaproo — Clean SVG Tracer v2
// Multi-color raster-to-SVG using contour tracing + bezier fitting
// Produces clean, smooth vector paths — not pixel-grid aligned

const SvgTracer = (function () {
  'use strict';

  // ── Public API ─────────────────────────────────────────

  function trace(canvas, options = {}) {
    const colors = options.colors || 8;
    const blur = options.blur || 1;
    const simplify = options.simplify || 1.5;
    const smooth = options.smooth !== false;

    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    // Optional blur to reduce noise
    let imgData;
    if (blur > 0) {
      const blurred = _gaussianBlur(ctx.getImageData(0, 0, w, h), w, h, blur);
      imgData = blurred;
    } else {
      imgData = ctx.getImageData(0, 0, w, h);
    }

    // 1. Quantize colors
    const palette = _kMeansQuantize(imgData.data, w, h, colors);
    const indexed = _mapToNearestColor(imgData.data, w, h, palette);

    // 2. Trace contours for each color
    const layers = [];
    for (let ci = 0; ci < palette.length; ci++) {
      const mask = _createMask(indexed, w, h, ci);
      const contours = _findContours(mask, w, h);
      const paths = contours
        .filter(c => c.length >= 4) // skip tiny contours
        .map(c => {
          let pts = _simplifyPath(c, simplify);
          if (smooth && pts.length >= 3) pts = _smoothPath(pts);
          return pts;
        })
        .filter(p => p.length >= 3);
      if (paths.length > 0) {
        layers.push({ color: palette[ci], paths });
      }
    }

    // 3. Generate SVG
    return _toSVG(w, h, layers, options);
  }

  // ── K-Means Color Quantization ─────────────────────────

  function _kMeansQuantize(data, w, h, k) {
    const n = w * h;
    // Sample pixels for initial centroids
    const step = Math.max(1, Math.floor(n / (k * 20)));
    const samples = [];
    for (let i = 0; i < n; i += step) {
      samples.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
    }
    // Pick k initial centroids spread across samples
    const centroids = [];
    for (let i = 0; i < k; i++) {
      centroids.push(samples[Math.floor(i * samples.length / k)] || [128, 128, 128]);
    }

    // Iterate
    for (let iter = 0; iter < 8; iter++) {
      const sums = centroids.map(() => [0, 0, 0, 0]); // r, g, b, count
      for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 50000))) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        let bestD = Infinity, bestC = 0;
        for (let c = 0; c < k; c++) {
          const dr = r - centroids[c][0], dg = g - centroids[c][1], db = b - centroids[c][2];
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; bestC = c; }
        }
        sums[bestC][0] += r; sums[bestC][1] += g; sums[bestC][2] += b; sums[bestC][3]++;
      }
      for (let c = 0; c < k; c++) {
        if (sums[c][3] > 0) {
          centroids[c] = [
            Math.round(sums[c][0] / sums[c][3]),
            Math.round(sums[c][1] / sums[c][3]),
            Math.round(sums[c][2] / sums[c][3])
          ];
        }
      }
    }
    return centroids;
  }

  function _mapToNearestColor(data, w, h, palette) {
    const n = w * h;
    const indexed = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      let bestD = Infinity, bestC = 0;
      for (let c = 0; c < palette.length; c++) {
        const dr = r - palette[c][0], dg = g - palette[c][1], db = b - palette[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; bestC = c; }
      }
      indexed[i] = bestC;
    }
    return indexed;
  }

  // ── Binary Mask ────────────────────────────────────────

  function _createMask(indexed, w, h, colorIdx) {
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      mask[i] = indexed[i] === colorIdx ? 1 : 0;
    }
    return mask;
  }

  // ── Contour Tracing (Moore Neighborhood) ───────────────

  function _findContours(mask, w, h) {
    const visited = new Uint8Array(w * h);
    const contours = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x] === 1 && !visited[y * w + x] && _isBorder(mask, w, h, x, y)) {
          const contour = _traceContour(mask, visited, w, h, x, y);
          if (contour.length >= 4) contours.push(contour);
        }
      }
    }
    return contours;
  }

  function _isBorder(mask, w, h, x, y) {
    if (mask[y * w + x] === 0) return false;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
    return mask[y * w + x - 1] === 0 || mask[y * w + x + 1] === 0 ||
           mask[(y - 1) * w + x] === 0 || mask[(y + 1) * w + x] === 0;
  }

  function _traceContour(mask, visited, w, h, startX, startY) {
    // Moore neighborhood: 8 directions clockwise from right
    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];
    const contour = [{ x: startX, y: startY }];
    visited[startY * w + startX] = 1;

    let cx = startX, cy = startY;
    let dir = 0; // start looking right
    let steps = 0;
    const maxSteps = w * h * 2;

    while (steps++ < maxSteps) {
      let found = false;
      // Search 8 neighbors starting from (dir + 5) % 8 (backtrack)
      const startDir = (dir + 5) % 8;
      for (let i = 0; i < 8; i++) {
        const d = (startDir + i) % 8;
        const nx = cx + dx[d], ny = cy + dy[d];
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx] === 1) {
          if (nx === startX && ny === startY && contour.length > 2) {
            return contour; // closed loop
          }
          cx = nx; cy = ny;
          dir = d;
          if (!visited[cy * w + cx]) {
            contour.push({ x: cx, y: cy });
            visited[cy * w + cx] = 1;
          }
          found = true;
          break;
        }
      }
      if (!found) break;
    }
    return contour;
  }

  // ── Path Simplification (Douglas-Peucker) ──────────────

  function _simplifyPath(points, tolerance) {
    if (points.length <= 3) return points;

    function _perpDist(p, a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      const px = a.x + t * dx, py = a.y + t * dy;
      return Math.sqrt((p.x - px) ** 2 + (p.y - py) ** 2);
    }

    function _dp(pts, start, end, tol) {
      let maxDist = 0, maxIdx = start;
      for (let i = start + 1; i < end; i++) {
        const d = _perpDist(pts[i], pts[start], pts[end]);
        if (d > maxDist) { maxDist = d; maxIdx = i; }
      }
      if (maxDist > tol) {
        const left = _dp(pts, start, maxIdx, tol);
        const right = _dp(pts, maxIdx, end, tol);
        return left.concat(right.slice(1));
      }
      return [pts[start], pts[end]];
    }

    return _dp(points, 0, points.length - 1, tolerance);
  }

  // ── Smooth Path (Catmull-Rom to Bezier) ────────────────

  function _smoothPath(points) {
    if (points.length < 3) return points;
    const smoothed = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];
      // Catmull-Rom to cubic bezier control points
      smoothed.push({
        x: p1.x, y: p1.y,
        cp1x: p1.x + (p2.x - p0.x) / 6,
        cp1y: p1.y + (p2.y - p0.y) / 6,
        cp2x: p2.x - (p3.x - p1.x) / 6,
        cp2y: p2.y - (p3.y - p1.y) / 6,
      });
    }
    return smoothed;
  }

  // ── Gaussian Blur ──────────────────────────────────────

  function _gaussianBlur(imgData, w, h, radius) {
    const data = new Uint8ClampedArray(imgData.data);
    const temp = new Uint8ClampedArray(data.length);
    const size = radius * 2 + 1;
    const kernel = [];
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const x = i - radius;
      const v = Math.exp(-(x * x) / (2 * radius * radius));
      kernel.push(v); sum += v;
    }
    for (let i = 0; i < size; i++) kernel[i] /= sum;

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = 0; k < size; k++) {
          const sx = Math.min(w - 1, Math.max(0, x + k - radius));
          const idx = (y * w + sx) * 4;
          r += data[idx] * kernel[k]; g += data[idx + 1] * kernel[k]; b += data[idx + 2] * kernel[k];
        }
        const idx = (y * w + x) * 4;
        temp[idx] = r; temp[idx + 1] = g; temp[idx + 2] = b; temp[idx + 3] = data[idx + 3];
      }
    }
    // Vertical pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = 0; k < size; k++) {
          const sy = Math.min(h - 1, Math.max(0, y + k - radius));
          const idx = (sy * w + x) * 4;
          r += temp[idx] * kernel[k]; g += temp[idx + 1] * kernel[k]; b += temp[idx + 2] * kernel[k];
        }
        const idx = (y * w + x) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
      }
    }
    return new ImageData(data, w, h);
  }

  // ── SVG Output ─────────────────────────────────────────

  function _toSVG(w, h, layers, options) {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;

    // Background from largest layer (or first)
    if (layers.length > 0) {
      const bgColor = layers[0].color;
      svg += `<rect width="${w}" height="${h}" fill="rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})"/>`;
    }

    for (const layer of layers) {
      const [r, g, b] = layer.color;
      const fill = `rgb(${r},${g},${b})`;
      for (const path of layer.paths) {
        if (path.length < 3) continue;
        let d;
        if (path[0].cp1x !== undefined) {
          // Smooth bezier path
          d = `M${_r(path[0].x)},${_r(path[0].y)}`;
          for (let i = 0; i < path.length; i++) {
            const cur = path[i];
            const next = path[(i + 1) % path.length];
            d += ` C${_r(cur.cp1x)},${_r(cur.cp1y)} ${_r(cur.cp2x)},${_r(cur.cp2y)} ${_r(next.x)},${_r(next.y)}`;
          }
        } else {
          // Polyline path
          d = `M${_r(path[0].x)},${_r(path[0].y)}`;
          for (let i = 1; i < path.length; i++) {
            d += ` L${_r(path[i].x)},${_r(path[i].y)}`;
          }
        }
        d += 'Z';
        svg += `<path fill="${fill}" stroke="${fill}" stroke-width="0.5" d="${d}"/>`;
      }
    }

    svg += '</svg>';
    return svg;
  }

  function _r(n) { return Math.round(n * 10) / 10; }

  // ── Expose API ─────────────────────────────────────────
  return { trace };
})();
