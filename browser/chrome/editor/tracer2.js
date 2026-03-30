// Snaproo — Clean SVG Tracer v2
// Multi-color raster-to-SVG: quantize → connected regions → outline → smooth bezier

const SvgTracer = (function () {
  'use strict';

  function trace(canvas, options = {}) {
    try {
    const numColors = options.colors || 8;
    const blur = options.blur ?? 1;
    const simplifyTol = options.simplify || 1.5;
    const doSmooth = options.smooth !== false;
    const minArea = options.minArea || 20;

    const w = canvas.width, h = canvas.height;
    if (w < 1 || h < 1) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>';
    const ctx = canvas.getContext('2d');
    let imgData = ctx.getImageData(0, 0, w, h);

    // 1. Blur to reduce noise
    if (blur > 0) imgData = _blur(imgData, w, h, blur);

    // 2. Quantize to N colors
    const palette = _quantize(imgData.data, w * h, numColors);
    const indexed = _index(imgData.data, w * h, palette);

    // 3. For each color, find connected regions, extract outlines
    const layers = [];
    for (let ci = 0; ci < palette.length; ci++) {
      // Create binary grid with 1px border (avoids boundary checks)
      const grid = new Uint8Array((w + 2) * (h + 2));
      const gw = w + 2;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (indexed[y * w + x] === ci) grid[(y + 1) * gw + (x + 1)] = 1;

      // Find connected regions using flood fill
      const visited = new Uint8Array(grid.length);
      const regions = [];
      for (let y = 1; y <= h; y++) {
        for (let x = 1; x <= w; x++) {
          if (grid[y * gw + x] === 1 && !visited[y * gw + x]) {
            const region = _floodFill(grid, visited, gw, h + 2, x, y);
            if (region.length >= minArea) regions.push(region);
          }
        }
      }

      // Extract outline for each region, simplify, smooth
      for (const region of regions) {
        const outline = _marchOutline(grid, gw, h + 2, region);
        if (outline.length < 4) continue;
        // Offset back from padded grid (-1 on x and y)
        let pts = outline.map(p => ({ x: p.x - 1, y: p.y - 1 }));
        pts = _simplify(pts, simplifyTol);
        if (pts.length < 3) continue;
        if (doSmooth) pts = _smooth(pts);
        layers.push({ color: palette[ci], path: pts });
      }
    }

    return _toSVG(w, h, layers);
    } catch (e) {
      console.error('SvgTracer error:', e);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><text x="0" y="1" font-size="0.5" fill="red">Trace failed</text></svg>`;
    }
  }

  // ── Quantize (k-means, sampled) ────────────────────────

  function _quantize(data, n, k) {
    const step = Math.max(1, Math.floor(n / 5000));
    const samples = [];
    for (let i = 0; i < n; i += step)
      samples.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);

    // Init centroids spread across samples
    const c = [];
    for (let i = 0; i < k; i++)
      c.push([...(samples[Math.floor(i * samples.length / k)] || [128, 128, 128])]);

    for (let iter = 0; iter < 10; iter++) {
      const sums = c.map(() => [0, 0, 0, 0]);
      for (const s of samples) {
        let best = 0, bestD = Infinity;
        for (let j = 0; j < k; j++) {
          const d = (s[0] - c[j][0]) ** 2 + (s[1] - c[j][1]) ** 2 + (s[2] - c[j][2]) ** 2;
          if (d < bestD) { bestD = d; best = j; }
        }
        sums[best][0] += s[0]; sums[best][1] += s[1]; sums[best][2] += s[2]; sums[best][3]++;
      }
      for (let j = 0; j < k; j++) {
        if (sums[j][3] > 0) {
          c[j][0] = Math.round(sums[j][0] / sums[j][3]);
          c[j][1] = Math.round(sums[j][1] / sums[j][3]);
          c[j][2] = Math.round(sums[j][2] / sums[j][3]);
        }
      }
    }
    return c;
  }

  function _index(data, n, palette) {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      let best = 0, bestD = Infinity;
      for (let j = 0; j < palette.length; j++) {
        const d = (r - palette[j][0]) ** 2 + (g - palette[j][1]) ** 2 + (b - palette[j][2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      }
      out[i] = best;
    }
    return out;
  }

  // ── Flood Fill (connected region) ──────────────────────

  function _floodFill(grid, visited, gw, gh, startX, startY) {
    const region = [];
    const stack = [startY * gw + startX];
    visited[startY * gw + startX] = 1;
    while (stack.length > 0) {
      const idx = stack.pop();
      region.push(idx);
      const x = idx % gw, y = Math.floor(idx / gw);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) {
          const ni = ny * gw + nx;
          if (grid[ni] === 1 && !visited[ni]) {
            visited[ni] = 1;
            stack.push(ni);
          }
        }
      }
    }
    return region;
  }

  // ── Marching Squares Outline ───────────────────────────
  // Walk the boundary of a filled region, producing a clean polygon

  function _marchOutline(grid, gw, gh, region) {
    // Mark region cells in a temp set for fast lookup
    const inRegion = new Uint8Array(grid.length);
    for (const idx of region) inRegion[idx] = 1;

    // Find a starting border pixel (topmost-leftmost)
    let startIdx = region[0];
    for (const idx of region) {
      const y = Math.floor(idx / gw), x = idx % gw;
      const sy = Math.floor(startIdx / gw), sx = startIdx % gw;
      if (y < sy || (y === sy && x < sx)) startIdx = idx;
    }

    const startX = startIdx % gw, startY = Math.floor(startIdx / gw);
    const outline = [];

    // Walk the border using simple direction tracking
    // Directions: 0=right, 1=down, 2=left, 3=up
    const dx = [1, 0, -1, 0], dy = [0, 1, 0, -1];
    let cx = startX, cy = startY, dir = 0;
    let steps = 0;
    const maxSteps = region.length * 4;

    do {
      outline.push({ x: cx, y: cy });
      // Try turning left first (tighter outline), then straight, then right, then back
      let found = false;
      for (const turn of [-1, 0, 1, 2]) {
        const nd = (dir + turn + 4) % 4;
        const nx = cx + dx[nd], ny = cy + dy[nd];
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && inRegion[ny * gw + nx]) {
          cx = nx; cy = ny; dir = nd;
          found = true;
          break;
        }
      }
      if (!found) break;
      steps++;
    } while ((cx !== startX || cy !== startY) && steps < maxSteps);

    return outline;
  }

  // ── Douglas-Peucker Simplification ─────────────────────

  function _simplify(pts, tol) {
    if (pts.length <= 3) return pts;
    function dist(p, a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    }
    function dp(pts, s, e, t) {
      let mx = 0, mi = s;
      for (let i = s + 1; i < e; i++) {
        const d = dist(pts[i], pts[s], pts[e]);
        if (d > mx) { mx = d; mi = i; }
      }
      if (mx > t) return dp(pts, s, mi, t).concat(dp(pts, mi, e, t).slice(1));
      return [pts[s], pts[e]];
    }
    return dp(pts, 0, pts.length - 1, tol);
  }

  // ── Catmull-Rom → Cubic Bezier Smoothing ───────────────

  function _smooth(pts) {
    const n = pts.length;
    if (n < 3) return pts;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      out.push({
        x: p1.x, y: p1.y,
        c1x: p1.x + (p2.x - p0.x) / 6,
        c1y: p1.y + (p2.y - p0.y) / 6,
        c2x: p2.x - (p3.x - p1.x) / 6,
        c2y: p2.y - (p3.y - p1.y) / 6,
      });
    }
    return out;
  }

  // ── Gaussian Blur ──────────────────────────────────────

  function _blur(imgData, w, h, r) {
    const d = new Uint8ClampedArray(imgData.data);
    const t = new Uint8ClampedArray(d.length);
    const ks = r * 2 + 1;
    const k = [];
    let sum = 0;
    for (let i = 0; i < ks; i++) { const x = i - r; k.push(Math.exp(-(x * x) / (2 * r * r))); sum += k[i]; }
    for (let i = 0; i < ks; i++) k[i] /= sum;
    // H pass
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let rv = 0, gv = 0, bv = 0;
      for (let ki = 0; ki < ks; ki++) {
        const sx = Math.min(w - 1, Math.max(0, x + ki - r)) * 4 + y * w * 4;
        rv += d[sx] * k[ki]; gv += d[sx + 1] * k[ki]; bv += d[sx + 2] * k[ki];
      }
      const idx = (y * w + x) * 4;
      t[idx] = rv; t[idx + 1] = gv; t[idx + 2] = bv; t[idx + 3] = d[idx + 3];
    }
    // V pass
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let rv = 0, gv = 0, bv = 0;
      for (let ki = 0; ki < ks; ki++) {
        const sy = Math.min(h - 1, Math.max(0, y + ki - r));
        const idx = (sy * w + x) * 4;
        rv += t[idx] * k[ki]; gv += t[idx + 1] * k[ki]; bv += t[idx + 2] * k[ki];
      }
      const idx = (y * w + x) * 4;
      d[idx] = rv; d[idx + 1] = gv; d[idx + 2] = bv;
    }
    return new ImageData(d, w, h);
  }

  // ── SVG Output ─────────────────────────────────────────

  function _toSVG(w, h, layers) {
    const r = n => Math.round(n * 10) / 10;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;

    for (const { color, path } of layers) {
      const fill = `rgb(${color[0]},${color[1]},${color[2]})`;
      if (path.length < 3) continue;

      let d;
      if (path[0].c1x !== undefined) {
        // Bezier
        d = `M${r(path[0].x)},${r(path[0].y)}`;
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          const next = path[(i + 1) % path.length];
          d += `C${r(p.c1x)},${r(p.c1y)},${r(p.c2x)},${r(p.c2y)},${r(next.x)},${r(next.y)}`;
        }
      } else {
        d = `M${r(path[0].x)},${r(path[0].y)}`;
        for (let i = 1; i < path.length; i++) d += `L${r(path[i].x)},${r(path[i].y)}`;
      }
      svg += `<path fill="${fill}" d="${d}Z"/>`;
    }

    svg += '</svg>';
    return svg;
  }

  return { trace };
})();
