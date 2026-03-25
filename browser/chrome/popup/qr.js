// Minimal QR Code generator - pure JS, no dependencies
// Supports QR Code Model 2, byte mode, ECC level M, versions 1-40
// Based on the qrcodegen algorithm by Nayuki

const QR = (() => {
  'use strict';

  // Error correction codewords per block for ECC level M (index = version)
  const ECC_CODEWORDS_PER_BLOCK = [
    -1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,28,28,28,28,30,28,28,28,28,30,30,30,30,30,30,30,30,30,30,30,30
  ];
  const NUM_ERROR_CORRECTION_BLOCKS = [
    -1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49
  ];

  // Number of data codewords for ECC M
  function getNumDataCodewords(ver) {
    const total = ((16 * ver + 128) * ver + 64) / 8;
    const eccPer = ECC_CODEWORDS_PER_BLOCK[ver];
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ver];
    return total - eccPer * numBlocks;
  }

  function encode(text) {
    const dataBytes = new TextEncoder().encode(text);
    const dataLen = dataBytes.length;

    // Find smallest version that fits
    let version = 1;
    for (; version <= 40; version++) {
      const capacity = getNumDataCodewords(version) - (version <= 9 ? 3 : 4); // mode + length overhead
      if (capacity >= dataLen) break;
    }
    if (version > 40) throw new Error('Data too long');

    const numData = getNumDataCodewords(version);
    const lenBits = version <= 9 ? 8 : 16;

    // Build data bits: mode(4) + length(8|16) + data + terminator + padding
    const bits = [];
    function pushBits(val, n) { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }

    pushBits(0b0100, 4); // Byte mode
    pushBits(dataLen, lenBits);
    for (const b of dataBytes) pushBits(b, 8);

    // Terminator
    const maxBits = numData * 8;
    const termLen = Math.min(4, maxBits - bits.length);
    pushBits(0, termLen);

    // Byte-align
    while (bits.length % 8 !== 0) bits.push(0);

    // Pad bytes
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (bits.length < maxBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    // Convert to byte array
    const dataCodewords = new Uint8Array(numData);
    for (let i = 0; i < numData; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i * 8 + j] || 0);
      dataCodewords[i] = byte;
    }

    // ECC
    const eccPer = ECC_CODEWORDS_PER_BLOCK[version];
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[version];
    const totalCodewords = ((16 * version + 128) * version + 64) / 8;

    // Split into blocks
    const shortCount = numBlocks - (totalCodewords % numBlocks === 0 ? 0 : numData % numBlocks === 0 ? 0 : totalCodewords % numBlocks);
    const shortLen = Math.floor(numData / numBlocks);
    const blocks = [];
    let offset = 0;
    for (let i = 0; i < numBlocks; i++) {
      const len = shortLen + (i >= shortCount ? 1 : 0);
      blocks.push(dataCodewords.slice(offset, offset + len));
      offset += len;
    }

    // Generate ECC for each block
    const gen = rsGeneratorPoly(eccPer);
    const eccBlocks = blocks.map(block => rsEncode(block, gen, eccPer));

    // Interleave
    const result = [];
    const maxBlockLen = Math.max(...blocks.map(b => b.length));
    for (let i = 0; i < maxBlockLen; i++)
      for (const block of blocks)
        if (i < block.length) result.push(block[i]);
    for (let i = 0; i < eccPer; i++)
      for (const ecc of eccBlocks)
        result.push(ecc[i]);

    // Build QR matrix
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Uint8Array(size));
    const isFunction = Array.from({ length: size }, () => new Uint8Array(size));

    // Draw function patterns
    drawFinderPatterns(modules, isFunction, size);
    drawAlignmentPatterns(modules, isFunction, version, size);
    drawTimingPatterns(modules, isFunction, size);
    drawFormatBits(modules, isFunction, size, 0); // placeholder

    // Version info
    if (version >= 7) drawVersionBits(modules, isFunction, version, size);

    // Place data bits
    placeDataBits(modules, isFunction, size, result);

    // Masking - try all 8 patterns and pick best
    let bestMask = 0;
    let bestPenalty = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const trial = modules.map(row => row.slice());
      applyMask(trial, isFunction, size, mask);
      drawFormatBits(trial, null, size, mask);
      const penalty = computePenalty(trial, size);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestMask = mask;
      }
    }

    applyMask(modules, isFunction, size, bestMask);
    drawFormatBits(modules, null, size, bestMask);

    return { modules, size };
  }

  // --- Reed-Solomon ---
  function rsGeneratorPoly(degree) {
    const gen = new Uint8Array(degree);
    gen[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++)
        gen[j] = gfMul(gen[j], root) ^ (j + 1 < degree ? gen[j + 1] : 0);
      root = gfMul(root, 2);
    }
    return gen;
  }

  function rsEncode(data, gen, eccLen) {
    const ecc = new Uint8Array(eccLen);
    for (const b of data) {
      const factor = b ^ ecc[0];
      ecc.copyWithin(0, 1);
      ecc[eccLen - 1] = 0;
      for (let j = 0; j < eccLen; j++)
        ecc[j] ^= gfMul(gen[j], factor);
    }
    return ecc;
  }

  const GF_EXP = new Uint8Array(256);
  const GF_LOG = new Uint8Array(256);
  (() => {
    let val = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = val;
      GF_LOG[val] = i;
      val = (val << 1) ^ (val >= 128 ? 0x11D : 0);
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
  }

  // --- Pattern drawing ---
  function drawFinderPatterns(m, f, sz) {
    function drawFinder(cx, cy) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x >= sz || y < 0 || y >= sz) continue;
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          m[y][x] = (dist !== 2 && dist !== 4) ? 1 : 0;
          f[y][x] = 1;
        }
      }
    }
    drawFinder(3, 3);
    drawFinder(sz - 4, 3);
    drawFinder(3, sz - 4);
  }

  function drawAlignmentPatterns(m, f, ver, sz) {
    if (ver === 1) return;
    const positions = getAlignmentPositions(ver, sz);
    for (const cy of positions) {
      for (const cx of positions) {
        if ((cx <= 8 && cy <= 8) || (cx <= 8 && cy >= sz - 9) || (cx >= sz - 9 && cy <= 8)) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            m[cy + dy][cx + dx] = (Math.abs(dx) === 2 || Math.abs(dy) === 2 || (dx === 0 && dy === 0)) ? 1 : 0;
            f[cy + dy][cx + dx] = 1;
          }
        }
      }
    }
  }

  function getAlignmentPositions(ver, sz) {
    if (ver === 1) return [];
    const numAlign = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((sz - 13) / (2 * numAlign - 2)) * 2;
    const result = [6];
    for (let pos = sz - 7; result.length < numAlign; pos -= step)
      result.splice(1, 0, pos);
    return result;
  }

  function drawTimingPatterns(m, f, sz) {
    for (let i = 8; i < sz - 8; i++) {
      m[6][i] = m[i][6] = (i % 2 === 0) ? 1 : 0;
      f[6][i] = f[i][6] = 1;
    }
  }

  function drawFormatBits(m, f, sz, mask) {
    // ECC level M = 0, mask
    const data = (0b00 << 3) | mask; // ECC M = 0
    let bits = data;
    for (let i = 0; i < 10; i++) bits = (bits << 1) ^ ((bits >>> 9) * 0x537);
    bits = ((data << 10) | bits) ^ 0x5412;

    for (let i = 0; i <= 5; i++) { set(m, f, 8, i, (bits >>> i) & 1); }
    set(m, f, 8, 7, (bits >>> 6) & 1);
    set(m, f, 8, 8, (bits >>> 7) & 1);
    set(m, f, 7, 8, (bits >>> 8) & 1);
    for (let i = 9; i < 15; i++) { set(m, f, 14 - i, 8, (bits >>> i) & 1); }

    for (let i = 0; i < 8; i++) { set(m, f, sz - 1 - i, 8, (bits >>> i) & 1); }
    for (let i = 8; i < 15; i++) { set(m, f, 8, sz - 15 + i, (bits >>> i) & 1); }
    set(m, f, 8, sz - 8, 1);
  }

  function set(m, f, y, x, val) {
    m[y][x] = val;
    if (f) f[y][x] = 1;
  }

  function drawVersionBits(m, f, ver, sz) {
    let bits = ver;
    for (let i = 0; i < 12; i++) bits = (bits << 1) ^ ((bits >>> 11) * 0x1F25);
    bits = (ver << 12) | bits;
    for (let i = 0; i < 18; i++) {
      const bit = (bits >>> i) & 1;
      const r = Math.floor(i / 3), c = i % 3 + sz - 11;
      m[r][c] = bit; if (f) f[r][c] = 1;
      m[c][r] = bit; if (f) f[c][r] = 1;
    }
  }

  function placeDataBits(m, f, sz, data) {
    let bitIdx = 0;
    for (let right = sz - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < sz; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? sz - 1 - vert : vert;
          if (f[y][x]) continue;
          if (bitIdx < data.length * 8) {
            m[y][x] = (data[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
        }
      }
    }
  }

  function applyMask(m, f, sz, mask) {
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        if (f[y][x]) continue;
        let invert = false;
        switch (mask) {
          case 0: invert = (y + x) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (y + x) % 3 === 0; break;
          case 4: invert = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; break;
          case 5: invert = (y * x) % 2 + (y * x) % 3 === 0; break;
          case 6: invert = ((y * x) % 2 + (y * x) % 3) % 2 === 0; break;
          case 7: invert = ((y + x) % 2 + (y * x) % 3) % 2 === 0; break;
        }
        if (invert) m[y][x] ^= 1;
      }
    }
  }

  function computePenalty(m, sz) {
    let penalty = 0;
    // Rule 1: runs of same color
    for (let y = 0; y < sz; y++) {
      let run = 1;
      for (let x = 1; x < sz; x++) {
        if (m[y][x] === m[y][x - 1]) { run++; } else { if (run >= 5) penalty += run - 2; run = 1; }
      }
      if (run >= 5) penalty += run - 2;
    }
    for (let x = 0; x < sz; x++) {
      let run = 1;
      for (let y = 1; y < sz; y++) {
        if (m[y][x] === m[y - 1][x]) { run++; } else { if (run >= 5) penalty += run - 2; run = 1; }
      }
      if (run >= 5) penalty += run - 2;
    }
    // Rule 2: 2x2 blocks
    for (let y = 0; y < sz - 1; y++)
      for (let x = 0; x < sz - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) penalty += 3;
      }
    return penalty;
  }

  // --- Render to canvas ---
  function renderToCanvas(canvas, qr, pixelSize = 4, margin = 4, fg = '#000000', bg = '#ffffff') {
    const { modules, size } = qr;
    const totalSize = (size + margin * 2) * pixelSize;
    canvas.width = totalSize;
    canvas.height = totalSize;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, totalSize, totalSize);

    ctx.fillStyle = fg;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (modules[y][x]) {
          ctx.fillRect((x + margin) * pixelSize, (y + margin) * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }

  return { encode, renderToCanvas };
})();
