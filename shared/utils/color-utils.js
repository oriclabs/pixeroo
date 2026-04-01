// Gazo - Color Extraction Utilities

/**
 * Extract dominant colors from image data using k-means clustering
 * @param {ImageData} imageData - Canvas image data
 * @param {number} k - Number of colors to extract (default 6)
 * @returns {Array<{r,g,b,hex,percent}>}
 */
export function extractPalette(imageData, k = 6) {
  const pixels = [];
  const data = imageData.data;

  // Sample pixels (every 4th pixel for performance)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue; // skip transparent
    pixels.push([r, g, b]);
  }

  if (pixels.length === 0) return [];

  // Simple k-means
  let centroids = pixels.slice(0, k).map(p => [...p]);
  const assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < 20; iter++) {
    // Assign pixels to nearest centroid
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity;
      for (let j = 0; j < centroids.length; j++) {
        const dist = colorDistance(pixels[i], centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          assignments[i] = j;
        }
      }
    }

    // Update centroids
    const sums = centroids.map(() => [0, 0, 0]);
    const counts = new Array(centroids.length).fill(0);

    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      counts[c]++;
    }

    for (let j = 0; j < centroids.length; j++) {
      if (counts[j] > 0) {
        centroids[j] = [
          Math.round(sums[j][0] / counts[j]),
          Math.round(sums[j][1] / counts[j]),
          Math.round(sums[j][2] / counts[j]),
        ];
      }
    }
  }

  // Count assignments for percentages
  const counts = new Array(centroids.length).fill(0);
  for (const c of assignments) counts[c]++;
  const total = assignments.length;

  return centroids
    .map((c, i) => ({
      r: c[0], g: c[1], b: c[2],
      hex: rgbToHex(c[0], c[1], c[2]),
      hsl: rgbToHsl(c[0], c[1], c[2]),
      percent: Math.round((counts[i] / total) * 100),
    }))
    .sort((a, b) => b.percent - a.percent);
}

function colorDistance(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/**
 * Convert RGB to HEX
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert RGB to HSL string
 */
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
