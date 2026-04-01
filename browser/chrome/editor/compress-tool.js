// Gazo — Compress Tool
// Reduce file size with live quality preview, format comparison, and target-size mode

function initCompress() {
  let cmpImg = null;
  let cmpFile = null;
  let cmpCanvas = document.createElement('canvas');
  let cmpCtx = cmpCanvas.getContext('2d');

  const previewCanvas = $('compress-preview-canvas');
  const previewCtx = previewCanvas?.getContext('2d');
  const outputCanvas = $('compress-output-canvas');
  const outputCtx = outputCanvas?.getContext('2d');
  let lastCompressedBlobUrl = null;

  // ── Dropzone ──
  setupDropzone($('compress-drop'), $('compress-file'), async (file) => {
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      showToast('SVG files can\u2019t be compressed \u2014 use the SVG tool instead', 'info');
      return;
    }
    cmpFile = file;
    cmpImg = await loadImg(file);
    if (!cmpImg) { showToast('Failed to load image', 'info'); return; }

    cmpCanvas.width = cmpImg.naturalWidth;
    cmpCanvas.height = cmpImg.naturalHeight;
    cmpCtx.drawImage(cmpImg, 0, 0);

    $('compress-drop').style.display = 'none';
    $('compress-work').style.display = '';

    // Show original preview
    _drawPreview(previewCanvas, previewCtx, cmpImg);

    // Original info
    $('compress-orig-info').textContent = `${cmpImg.naturalWidth}\u00d7${cmpImg.naturalHeight} \u00b7 ${formatBytes(file.size)} \u00b7 ${file.type || 'unknown'}`;

    // Auto-select best lossy format based on source type
    const srcType = file.type || '';
    if (srcType === 'image/jpeg') $('compress-format').value = 'jpeg';
    else if (srcType === 'image/webp') $('compress-format').value = 'webp';
    else $('compress-format').value = 'jpeg'; // PNG/BMP/etc → JPEG by default
    // Trigger format change to update UI
    $('compress-format').dispatchEvent(new Event('change'));

    // Enable controls
    $('btn-compress-go').disabled = false;
    $('btn-compress-compare').disabled = false;

    // Auto-run initial compression preview
    _runCompress();
  });

  function _drawPreview(canvas, ctx, source) {
    const maxDim = 350;
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const scale = Math.min(maxDim / sw, maxDim / sh, 1);
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  // ── Click-to-enlarge preview canvases ──
  function _showEnlarged(src, label, w, h) {
    let enlarged = document.getElementById('compress-enlarged');
    if (enlarged) { enlarged.remove(); return; }
    enlarged = document.createElement('div');
    enlarged.id = 'compress-enlarged';
    enlarged.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(2,6,23,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;';
    const img = new Image();
    img.src = src;
    img.style.cssText = 'max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.6);';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'color:var(--slate-400);font-size:0.75rem;';
    lbl.textContent = `${label} \u00b7 ${w}\u00d7${h} \u00b7 Click or Escape to close`;
    enlarged.appendChild(img);
    enlarged.appendChild(lbl);
    enlarged.addEventListener('click', () => enlarged.remove());
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { enlarged.remove(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(enlarged);
  }

  previewCanvas?.addEventListener('click', () => {
    if (!cmpCanvas.width) return;
    _showEnlarged(cmpCanvas.toDataURL(), 'Original', cmpCanvas.width, cmpCanvas.height);
  });
  outputCanvas?.addEventListener('click', () => {
    if (!lastCompressedBlobUrl) return;
    const src = _getSourceCanvas();
    _showEnlarged(lastCompressedBlobUrl, 'Compressed', src.width, src.height);
  });

  // ── Format change ──
  on($('compress-format'), 'change', () => {
    const fmt = $('compress-format').value;
    const isLossy = fmt !== 'png';
    $('compress-quality-row').style.display = isLossy ? '' : 'none';
    $('compress-target-row').style.display = isLossy ? '' : 'none';
    // Warn if output format matches source
    const srcMime = cmpFile?.type || '';
    const fmtMime = { jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png' }[fmt];
    const sameFormat = srcMime === fmtMime;
    const warn = $('compress-same-fmt-warn');
    if (warn) warn.style.display = sameFormat ? '' : 'none';
    if (cmpImg) _runCompress();
  });

  // ── Quality slider ──
  on($('compress-quality'), 'input', (e) => {
    $('compress-quality-val').textContent = e.target.value + '%';
    if (cmpImg) _debounceCompress();
  });

  // ── Resize inputs ──
  on($('compress-resize'), 'change', () => {
    $('compress-resize-row').style.display = $('compress-resize').checked ? '' : 'none';
    if (cmpImg) _runCompress();
  });

  on($('compress-max-dim'), 'input', () => { if (cmpImg) _debounceCompress(); });

  // ── Target size toggle ──
  on($('compress-target'), 'change', () => {
    $('compress-target-kb-wrap').style.display = $('compress-target').checked ? '' : 'none';
  });

  // ── Download button ──
  on($('btn-compress-go'), 'click', async () => {
    if (!cmpImg) return;
    const result = await _runCompress();
    if (!result) return;

    const ext = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }[result.mime] || 'png';
    const baseName = (cmpFile?.name || 'image').replace(/\.[^.]+$/, '');
    const fmt = $('compress-format').value;
    const q = fmt !== 'png' ? $('compress-quality').value : '';
    const suffix = q ? `-${q}q` : '';
    directDownload(result.blob, `${baseName}-compressed${suffix}.${ext}`);
    showToast(`Saved \u00b7 ${formatBytes(result.blob.size)}`, 'success');
  });

  // ── Compare button — show format comparison table ──
  on($('btn-compress-compare'), 'click', async () => {
    if (!cmpImg) return;
    $('btn-compress-compare').disabled = true;
    $('btn-compress-compare').textContent = 'Analyzing\u2026';

    const src = _getSourceCanvas();
    const results = [];
    const formats = [
      { label: 'JPEG', mime: 'image/jpeg', qs: [95, 90, 85, 80, 70, 60, 50] },
      { label: 'WebP', mime: 'image/webp', qs: [95, 90, 85, 80, 70, 60, 50] },
      { label: 'PNG',  mime: 'image/png',  qs: [null] },
    ];

    for (const fmt of formats) {
      for (const q of fmt.qs) {
        const blob = await new Promise(r => src.toBlob(r, fmt.mime, q ? q / 100 : undefined));
        const pct = cmpFile ? ((1 - blob.size / cmpFile.size) * 100) : 0;
        results.push({ label: fmt.label, quality: q ? q + '%' : '\u2014', size: formatBytes(blob.size), raw: blob.size, saving: pct > 0 ? `-${pct.toFixed(0)}%` : pct < 0 ? `+${Math.abs(pct).toFixed(0)}%` : '0%' });
      }
    }

    // Build table HTML
    let html = `<div style="max-height:50vh;overflow:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.75rem;">`;
    html += `<thead><tr style="border-bottom:1px solid var(--slate-700);color:var(--slate-400);text-align:left;">`;
    html += `<th style="padding:6px 8px;">Format</th><th style="padding:6px 8px;">Quality</th><th style="padding:6px 8px;">Size</th><th style="padding:6px 8px;">Saving</th></tr></thead><tbody>`;

    const origSize = cmpFile?.size || 0;
    for (const r of results) {
      const isBest = r.raw <= origSize * 0.5;
      const color = isBest ? 'color:#22c55e;' : '';
      html += `<tr style="border-bottom:1px solid var(--slate-800);">`;
      html += `<td style="padding:5px 8px;font-weight:600;">${r.label}</td>`;
      html += `<td style="padding:5px 8px;">${r.quality}</td>`;
      html += `<td style="padding:5px 8px;${color}">${r.size}</td>`;
      html += `<td style="padding:5px 8px;${color}">${r.saving}</td>`;
      html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    html += `<div style="margin-top:8px;color:var(--slate-500);font-size:0.65rem;">Original: ${formatBytes(origSize)} \u00b7 ${cmpImg.naturalWidth}\u00d7${cmpImg.naturalHeight}</div>`;

    pixDialog.alert('Format Comparison', html);

    $('btn-compress-compare').disabled = false;
    $('btn-compress-compare').textContent = 'Compare Formats';
  });

  // ── Reset ──
  on($('btn-compress-reset'), 'click', () => {
    cmpImg = null;
    cmpFile = null;
    if (lastCompressedBlobUrl) { URL.revokeObjectURL(lastCompressedBlobUrl); lastCompressedBlobUrl = null; }
    $('compress-drop').style.display = '';
    $('compress-work').style.display = 'none';
    $('compress-result').innerHTML = '';
    $('btn-compress-go').disabled = true;
    $('btn-compress-compare').disabled = true;
    $('compress-file').value = '';
  });

  // ── Debounce helper ──
  let _compressTimer = null;
  function _debounceCompress() {
    clearTimeout(_compressTimer);
    _compressTimer = setTimeout(_runCompress, 200);
  }

  // ── Get resized source canvas ──
  function _getSourceCanvas() {
    if (!$('compress-resize').checked) return cmpCanvas;

    const maxDim = +($('compress-max-dim').value) || 1920;
    const w = cmpImg.naturalWidth, h = cmpImg.naturalHeight;
    if (w <= maxDim && h <= maxDim) return cmpCanvas;

    const scale = Math.min(maxDim / w, maxDim / h);
    const nw = Math.round(w * scale), nh = Math.round(h * scale);
    const c = document.createElement('canvas');
    c.width = nw; c.height = nh;
    c.getContext('2d').drawImage(cmpImg, 0, 0, nw, nh);
    return c;
  }

  // ── Core compress ──
  async function _runCompress() {
    if (!cmpImg) return null;

    const fmt = $('compress-format').value;
    const mime = { jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png' }[fmt];
    const quality = +($('compress-quality').value) / 100;
    const useTarget = $('compress-target').checked && fmt !== 'png';
    const targetKB = +($('compress-target-kb').value) || 200;

    const src = _getSourceCanvas();
    let blob;

    if (fmt === 'png') {
      blob = await new Promise(r => src.toBlob(r, 'image/png'));
    } else if (useTarget && src.toBlob) {
      // Binary search for target file size
      let lo = 0.05, hi = quality, attempts = 0;
      blob = await new Promise(r => src.toBlob(r, mime, quality));
      while (attempts < 10 && blob.size > targetKB * 1024 && hi - lo > 0.02) {
        const mid = (lo + hi) / 2;
        blob = await new Promise(r => src.toBlob(r, mime, mid));
        if (blob.size > targetKB * 1024) hi = mid; else lo = mid;
        attempts++;
      }
    } else {
      blob = await new Promise(r => src.toBlob(r, mime, quality));
    }

    // Update live compressed preview
    if (lastCompressedBlobUrl) URL.revokeObjectURL(lastCompressedBlobUrl);
    lastCompressedBlobUrl = URL.createObjectURL(blob);
    const compImg = new Image();
    compImg.onload = () => {
      _drawPreview(outputCanvas, outputCtx, compImg);
    };
    compImg.src = lastCompressedBlobUrl;

    // Update result display
    const origSize = cmpFile?.size || 0;
    const pct = origSize ? ((1 - blob.size / origSize) * 100) : 0;
    const bigger = blob.size > origSize;
    const sizeColor = bigger ? '#ef4444' : '#22c55e';
    const arrow = bigger ? '\u2191' : '\u2193';
    const dims = `${src.width}\u00d7${src.height}`;
    const resized = (src.width !== cmpImg.naturalWidth || src.height !== cmpImg.naturalHeight);

    let resultHtml = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">`;
    resultHtml += `<div style="text-align:center;"><div style="color:var(--slate-500);font-size:0.65rem;">Original</div><div style="font-weight:600;">${formatBytes(origSize)}</div></div>`;
    resultHtml += `<div style="font-size:1.2rem;color:var(--slate-500);">\u2192</div>`;
    resultHtml += `<div style="text-align:center;"><div style="color:var(--slate-500);font-size:0.65rem;">Compressed (${fmt.toUpperCase()})</div><div style="font-weight:600;color:${sizeColor};">${formatBytes(blob.size)}</div></div>`;
    resultHtml += `<div style="color:${sizeColor};font-weight:600;font-size:0.85rem;">${arrow} ${Math.abs(pct).toFixed(1)}%</div>`;
    if (resized) resultHtml += `<div style="color:var(--slate-500);font-size:0.65rem;">Resized to ${dims}</div>`;
    resultHtml += `</div>`;

    $('compress-result').innerHTML = resultHtml;

    return { blob, mime };
  }
}
