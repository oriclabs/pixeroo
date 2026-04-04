// Gazo — SVG Tool
function initSVG() {
  // --- Tab switching (Inspect / Trace) ---
  $$('.svg-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.svg-mode-tab').forEach(t => {
        t.classList.remove('active');
        t.style.color = 'var(--slate-500)';
        t.style.borderBottomColor = 'transparent';
      });
      tab.classList.add('active');
      tab.style.color = 'var(--saffron-400)';
      tab.style.borderBottomColor = 'var(--saffron-400)';

      const mode = tab.dataset.svgMode;
      $('svg-panel-inspect').style.display = mode === 'inspect' ? 'flex' : 'none';
      $('svg-panel-trace').style.display = mode === 'trace' ? 'flex' : 'none';
      $('svg-ribbon-inspect').style.display = mode === 'inspect' ? '' : 'none';
      $('svg-ribbon-trace').style.display = mode === 'trace' ? '' : 'none';
    });
  });

  // ── SVG Beautifier ──
  function prettySvg(raw) {
    // Simple XML pretty-printer: indent nested tags
    let result = '';
    let indent = 0;
    // Normalize: collapse whitespace between tags
    const xml = raw.replace(/>\s+</g, '><').replace(/\r\n?/g, '\n').trim();
    // Split into tokens: tags and text
    const tokens = xml.match(/<[^>]+>|[^<]+/g) || [];
    for (const token of tokens) {
      if (token.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        result += '  '.repeat(indent) + token + '\n';
      } else if (token.startsWith('<') && !token.startsWith('<!') && !token.startsWith('<?')) {
        result += '  '.repeat(indent) + token + '\n';
        // Self-closing or void tags don't increase indent
        if (!token.endsWith('/>') && !token.startsWith('</')) indent++;
      } else if (token.startsWith('<!') || token.startsWith('<?')) {
        result += '  '.repeat(indent) + token + '\n';
      } else {
        const text = token.trim();
        if (text) result += '  '.repeat(indent) + text + '\n';
      }
    }
    return result.trimEnd();
  }

  // ── Syntax highlighter ──
  function highlightSvg(formatted) {
    return esc(formatted)
      // Comments
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="sv-cmt">$1</span>')
      // Tags: <tagname and </tagname> and />
      .replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="sv-tag">$2</span>')
      // Attributes: name="value"
      .replace(/([\w:-]+)(=)(&quot;[^&]*?&quot;)/g, '<span class="sv-attr">$1</span>$2<span class="sv-val">$3</span>');
  }

  // ── Extract colors from SVG ──
  function extractSvgColors(svgStr) {
    const colors = new Set();
    // Match fill="...", stroke="...", stop-color="...", color="..."
    const re = /(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|[a-zA-Z]+)/gi;
    let m;
    while ((m = re.exec(svgStr))) {
      const c = m[1].trim().toLowerCase();
      if (c && c !== 'none' && c !== 'inherit' && c !== 'currentcolor' && c !== 'transparent') colors.add(c);
    }
    // Also check style attributes
    const styleRe = /style\s*=\s*["']([^"']+)["']/gi;
    while ((m = styleRe.exec(svgStr))) {
      const inner = m[1];
      let cm;
      const innerRe = /(?:fill|stroke|stop-color|color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|[a-zA-Z]+)/gi;
      while ((cm = innerRe.exec(inner))) {
        const c = cm[1].trim().toLowerCase();
        if (c && c !== 'none' && c !== 'inherit' && c !== 'currentcolor' && c !== 'transparent') colors.add(c);
      }
    }
    return [...colors];
  }

  // ── Element breakdown ──
  function getElementBreakdown(svgEl) {
    const counts = {};
    svgEl.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      counts[tag] = (counts[tag] || 0) + 1;
    });
    // Sort by count descending
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  // ══════════════════════════════════════════
  //  INSPECT TAB
  // ══════════════════════════════════════════
  let svgSrc = '';
  let sourceCollapsed = false;

  setupDropzone($('svg-drop'), $('svg-file'), (file) => {
    const r = new FileReader();
    r.onload = (e) => {
      svgSrc = e.target.result;
      $('svg-drop').style.display = 'none';
      $('svg-preview').style.display = 'block';
      $('svg-img').src = URL.createObjectURL(file);
      $('btn-svg-export').disabled = false;

      const doc = new DOMParser().parseFromString(svgSrc, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      // Basic info
      const info = svg ? [
        ['Width', svg.getAttribute('width') || 'auto'],
        ['Height', svg.getAttribute('height') || 'auto'],
        ['ViewBox', svg.getAttribute('viewBox') || 'none'],
        ['Elements', svg.querySelectorAll('*').length],
        ['Size', formatBytes(new Blob([svgSrc]).size)],
      ] : [];
      $('svg-info').innerHTML = info.map(([l, v]) =>
        `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${esc(String(v))}</span></div>`
      ).join('');

      // Export dimensions
      const w = parseInt(svg?.getAttribute('width')) || parseInt(svg?.getAttribute('viewBox')?.split(' ')[2]) || 100;
      const h = parseInt(svg?.getAttribute('height')) || parseInt(svg?.getAttribute('viewBox')?.split(' ')[3]) || 100;
      $('svg-export-w').value = w * 2;
      $('svg-export-h').value = h * 2;

      // Element breakdown
      if (svg) {
        const breakdown = getElementBreakdown(svg);
        if (breakdown.length) {
          $('svg-elements').style.display = '';
          $('svg-elements-list').innerHTML = breakdown.map(([tag, count]) =>
            `<span class="svg-el-chip">${tag}<b>${count}</b></span>`
          ).join('');
        }
      }

      // Color palette
      const colors = extractSvgColors(svgSrc);
      if (colors.length) {
        $('svg-colors-section').style.display = '';
        $('svg-colors-list').innerHTML = colors.map(c =>
          `<div class="svg-color-chip" style="background:${c};" title="${c}" data-color="${c}"></div>`
        ).join('');
        // Click to copy
        $('svg-colors-list').addEventListener('click', (e) => {
          const chip = e.target.closest('.svg-color-chip');
          if (!chip) return;
          navigator.clipboard.writeText(chip.dataset.color);
          showToast('Copied ' + chip.dataset.color, 'success');
        });
      }

      // Formatted + highlighted source
      const formatted = prettySvg(svgSrc);
      $('svg-source').innerHTML = highlightSvg(formatted);
      $('btn-svg-toggle-source').style.display = '';
      $('btn-svg-wrap').style.display = '';
      $('btn-svg-copy-source2').style.display = '';
      sourceCollapsed = false;
      $('btn-svg-toggle-source').textContent = 'Collapse';
      $('svg-source').style.display = '';
    };
    r.readAsText(file);
  });

  // Toggle source collapse/expand
  $('btn-svg-toggle-source')?.addEventListener('click', () => {
    sourceCollapsed = !sourceCollapsed;
    $('svg-source').style.display = sourceCollapsed ? 'none' : '';
    $('btn-svg-toggle-source').textContent = sourceCollapsed ? 'Expand' : 'Collapse';
  });

  // Toggle word wrap
  let sourceWrapped = false;
  $('btn-svg-wrap')?.addEventListener('click', () => {
    sourceWrapped = !sourceWrapped;
    $('svg-source').style.whiteSpace = sourceWrapped ? 'pre-wrap' : 'pre';
    $('svg-source').style.wordBreak = sourceWrapped ? 'break-all' : 'normal';
    $('btn-svg-wrap').classList.toggle('active', sourceWrapped);
  });

  $('btn-svg-export')?.addEventListener('click', () => {
    if (!svgSrc) return;
    const w = +$('svg-export-w').value || 400, h = +$('svg-export-h').value || 400, fmt = $('svg-export-fmt').value;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      if (fmt === 'jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
      x.drawImage(img, 0, 0, w, h);
      c.toBlob(b => {
        Platform.download(URL.createObjectURL(b), `gazo/svg-export.${fmt === 'jpeg' ? 'jpg' : fmt}`, true);
      }, { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt], 0.9);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgSrc);
  });

  // Inspect reset
  $('btn-svg-reset')?.addEventListener('click', () => {
    svgSrc = '';
    $('svg-drop').style.display = '';
    $('svg-preview').style.display = 'none';
    $('svg-info').innerHTML = '<span style="color:var(--slate-500);">No SVG loaded</span>';
    $('svg-elements').style.display = 'none';
    $('svg-elements-list').innerHTML = '';
    $('svg-colors-section').style.display = 'none';
    $('svg-colors-list').innerHTML = '';
    $('svg-source').innerHTML = 'No SVG loaded';
    $('svg-source').style.display = '';
    $('btn-svg-export').disabled = true;
    $('btn-svg-toggle-source').style.display = 'none';
    $('btn-svg-wrap').style.display = 'none';
    $('btn-svg-copy-source2').style.display = 'none';
    $('svg-file').value = '';
    sourceCollapsed = false;
    $('btn-svg-toggle-source').textContent = 'Collapse';
  });

  // Copy source — inline button next to SOURCE label
  $('btn-svg-copy-source2')?.addEventListener('click', () => {
    if (svgSrc) {
      navigator.clipboard.writeText(svgSrc);
      showToast('SVG source copied', 'success');
    }
  });

  // ══════════════════════════════════════════
  //  TRACE TAB
  // ══════════════════════════════════════════
  let traceSvg = '';
  let traceOrigFile = null;
  let _traceImg = null;

  // Sync inline controls with ribbon controls
  function _syncTraceControls(fromInline) {
    if (fromInline) {
      $('trace-preset').value = $('trace-preset-inline').value;
      $('trace-colors').value = $('trace-colors-inline').value;
    } else {
      $('trace-preset-inline').value = $('trace-preset').value;
      $('trace-colors-inline').value = $('trace-colors').value;
    }
  }
  $('trace-preset-inline')?.addEventListener('change', () => _syncTraceControls(true));
  $('trace-colors-inline')?.addEventListener('change', () => _syncTraceControls(true));
  $('trace-preset')?.addEventListener('change', () => _syncTraceControls(false));
  $('trace-colors')?.addEventListener('change', () => _syncTraceControls(false));

  setupDropzone($('trace-drop'), $('trace-file'), async (file) => {
    // Reject SVG — tracing SVG to SVG is pointless
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      showToast('SVG files can\u2019t be traced \u2014 use the Inspect tab instead', 'info');
      return;
    }
    const img = await loadImg(file);
    if (!img) return;
    traceOrigFile = file;
    _traceImg = img;
    $('btn-trace-go').disabled = false;

    // Hide dropzone, show inline controls
    $('trace-drop').style.display = 'none';
    $('trace-loaded').style.display = '';
    $('trace-loaded-info').textContent = `${esc(file.name)} \u00b7 ${img.naturalWidth}\u00d7${img.naturalHeight} \u00b7 ${formatBytes(file.size)}`;

    // Draw original to comparison canvas
    const oc = $('trace-original-canvas');
    oc.width = img.naturalWidth; oc.height = img.naturalHeight;
    oc.getContext('2d').drawImage(img, 0, 0);
  });

  function _runTrace() {
    if (!_traceImg) return;
    const btns = [$('btn-trace-go'), $('btn-trace-go-inline')];
    btns.forEach(b => { if (b) { b.disabled = true; b.textContent = 'Tracing\u2026'; } });

    setTimeout(() => {
      try {
        const c = document.createElement('canvas');
        c.width = _traceImg.naturalWidth; c.height = _traceImg.naturalHeight;
        c.getContext('2d').drawImage(_traceImg, 0, 0);

        const preset = $('trace-preset').value;
        const opts = PixTrace.resolveOptions(preset);
        const colors = +$('trace-colors').value;
        if (colors >= 2) opts.numberofcolors = colors;

        traceSvg = PixTrace.traceCanvas(c, opts);

        // Show result
        $('trace-result').style.display = 'block';
        $('trace-preview').innerHTML = traceSvg;
        const svgEl = $('trace-preview').querySelector('svg');
        if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto'; }

        const svgSize = new Blob([traceSvg]).size;
        const paths = (traceSvg.match(/<path /g) || []).length;
        $('trace-stats').textContent = `${(svgSize / 1024).toFixed(1)} KB | ${paths} paths | ${opts.numberofcolors} colors`;

        // Size comparison
        const origSize = traceOrigFile?.size || 0;
        const pct = origSize ? ((1 - svgSize / origSize) * 100) : 0;
        const sizeColor = pct > 0 ? '#22c55e' : '#ef4444';
        $('trace-size-compare').innerHTML =
          `<div style="text-align:center;"><div style="color:var(--slate-500);font-size:0.65rem;">Original</div><div style="font-weight:600;">${formatBytes(origSize)}</div></div>` +
          `<div style="font-size:1.2rem;color:var(--slate-500);">\u2192</div>` +
          `<div style="text-align:center;"><div style="color:var(--slate-500);font-size:0.65rem;">Traced SVG</div><div style="font-weight:600;color:${sizeColor};">${formatBytes(svgSize)}</div></div>` +
          `<div style="color:${sizeColor};font-weight:600;font-size:0.85rem;">${pct > 0 ? '\u2193' : '\u2191'} ${Math.abs(pct).toFixed(0)}%</div>` +
          `<div style="color:var(--slate-500);font-size:0.65rem;">${paths} paths \u00b7 ${opts.numberofcolors} colors</div>`;

        // Show traced source (formatted + highlighted)
        const tracedFormatted = prettySvg(traceSvg);
        $('trace-source').innerHTML = highlightSvg(tracedFormatted);

        // Show ribbon export buttons
        $('btn-trace-download').style.display = '';
        $('btn-trace-copy').style.display = '';
        $('btn-trace-save-lib').style.display = '';
      } catch (e) {
        console.warn('Trace failed:', e);
      }
      btns.forEach(b => { if (b) { b.disabled = false; b.textContent = 'Trace'; } });
    }, 50);
  }

  // Both ribbon and inline buttons trigger the same trace
  $('btn-trace-go')?.addEventListener('click', () => { _syncTraceControls(false); _runTrace(); });
  $('btn-trace-go-inline')?.addEventListener('click', () => { _syncTraceControls(true); _runTrace(); });

  $('btn-trace-download')?.addEventListener('click', () => {
    if (!traceSvg) return;
    const blob = new Blob([traceSvg], { type: 'image/svg+xml' });
    Platform.download(URL.createObjectURL(blob), 'gazo/traced.svg', true);
  });

  $('btn-trace-copy')?.addEventListener('click', () => {
    if (traceSvg) {
      navigator.clipboard.writeText(traceSvg);
      showToast('Traced SVG copied', 'success');
    }
  });

  // Fit / Actual toggle for traced SVG preview
  let traceFitted = true;
  $('btn-trace-fit')?.addEventListener('click', () => {
    traceFitted = !traceFitted;
    const svgEl = $('trace-preview')?.querySelector('svg');
    if (svgEl) {
      svgEl.style.maxWidth = traceFitted ? '100%' : 'none';
      svgEl.style.height = traceFitted ? 'auto' : '';
      svgEl.style.width = traceFitted ? '' : '';
    }
    $('trace-preview').style.maxHeight = traceFitted ? '35vh' : 'none';
    $('btn-trace-fit').textContent = traceFitted ? 'Fit' : '1:1';
    $('btn-trace-fit').classList.toggle('active', traceFitted);
  });

  // Trace source controls
  $('btn-trace-copy-source')?.addEventListener('click', () => {
    if (traceSvg) {
      navigator.clipboard.writeText(traceSvg);
      showToast('Traced SVG copied', 'success');
    }
  });

  let traceSourceCollapsed = false;
  $('btn-trace-toggle-source')?.addEventListener('click', () => {
    traceSourceCollapsed = !traceSourceCollapsed;
    $('trace-source').style.display = traceSourceCollapsed ? 'none' : '';
    $('btn-trace-toggle-source').textContent = traceSourceCollapsed ? 'Expand' : 'Collapse';
  });

  let traceSourceWrapped = false;
  $('btn-trace-wrap')?.addEventListener('click', () => {
    traceSourceWrapped = !traceSourceWrapped;
    $('trace-source').style.whiteSpace = traceSourceWrapped ? 'pre-wrap' : 'pre';
    $('trace-source').style.wordBreak = traceSourceWrapped ? 'break-all' : 'normal';
    $('btn-trace-wrap').classList.toggle('active', traceSourceWrapped);
  });

  // Trace reset
  $('btn-trace-reset')?.addEventListener('click', () => {
    traceSvg = '';
    traceOrigFile = null;
    _traceImg = null;
    $('btn-trace-go').disabled = true;
    $('trace-result').style.display = 'none';
    $('trace-loaded').style.display = 'none';
    $('trace-preview').innerHTML = '';
    $('trace-stats').textContent = '';
    $('btn-trace-download').style.display = 'none';
    $('btn-trace-copy').style.display = 'none';
    $('btn-trace-save-lib').style.display = 'none';
    $('trace-drop').style.display = '';
    $('trace-file').value = '';
    $('trace-source').innerHTML = 'No trace yet';
    traceSourceCollapsed = false;
    $('btn-trace-toggle-source').textContent = 'Collapse';
    $('trace-source').style.display = '';
  });

  // Grid overlay toggle
  function toggleGrid(previewEl, btn) {
    if (!previewEl) return;
    const on = !previewEl.dataset.grid;
    if (on) {
      previewEl.dataset.grid = '1';
      previewEl.style.backgroundImage = 'repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(244,196,48,0.12) 49px,rgba(244,196,48,0.12) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(244,196,48,0.12) 49px,rgba(244,196,48,0.12) 50px)';
      previewEl.style.backgroundSize = '50px 50px';
    } else {
      delete previewEl.dataset.grid;
      previewEl.style.backgroundImage = '';
      previewEl.style.backgroundSize = '';
    }
    btn.classList.toggle('active', on);
  }
  $('btn-svg-guides')?.addEventListener('click', (e) => toggleGrid($('svg-preview'), e.currentTarget));
  $('btn-svg-guides-trace')?.addEventListener('click', (e) => toggleGrid($('trace-preview'), e.currentTarget));
}
