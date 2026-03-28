// Pixeroo Editor - Home screen + 9 tool modes
// Edit, Convert, Store Assets, Info, QR, Colors, SVG, Compare, OCR

// Wrap all <input type="number"> with custom spinner buttons (cross-browser)
function enhanceNumberInputs(root) {
  const inputs = (root || document).querySelectorAll('input[type="number"]:not([data-spin-done])');
  inputs.forEach(input => {
    input.setAttribute('data-spin-done', '1');

    // Create wrapper
    const wrap = document.createElement('span');
    wrap.className = 'num-spin';
    // Preserve any inline width from the input
    const inlineW = input.style.width;
    if (inlineW) { wrap.style.width = inlineW; input.style.width = '100%'; }

    // Button column
    const btns = document.createElement('span');
    btns.className = 'num-spin-btns';
    const upBtn = document.createElement('button');
    upBtn.className = 'num-spin-btn';
    upBtn.type = 'button';
    upBtn.innerHTML = '&#9650;'; // ▲
    upBtn.tabIndex = -1;
    const downBtn = document.createElement('button');
    downBtn.className = 'num-spin-btn';
    downBtn.type = 'button';
    downBtn.innerHTML = '&#9660;'; // ▼
    downBtn.tabIndex = -1;
    btns.appendChild(upBtn);
    btns.appendChild(downBtn);

    // Insert wrapper
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrap.appendChild(btns);

    // Remove input border (wrapper has it)
    input.style.border = 'none';
    input.style.background = 'transparent';
    input.style.minWidth = '0';
    input.style.minHeight = '0';

    const step = +(input.step) || 1;
    const min = input.min !== '' ? +input.min : -Infinity;
    const max = input.max !== '' ? +input.max : Infinity;

    function nudge(dir) {
      let v = +(input.value) || 0;
      v += dir * step;
      v = Math.max(min, Math.min(max, v));
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Click: instant nudge. Hold: wait 400ms then repeat every 100ms.
    let holdDelay = null, holdInterval = null;
    function stopHold() {
      clearTimeout(holdDelay); holdDelay = null;
      clearInterval(holdInterval); holdInterval = null;
    }
    function bindBtn(btn, dir) {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        nudge(dir);
        stopHold();
        holdDelay = setTimeout(() => {
          holdInterval = setInterval(() => nudge(dir), 100);
        }, 400);
      });
      btn.addEventListener('mouseup', stopHold);
      btn.addEventListener('mouseleave', stopHold);
    }
    bindBtn(upBtn, 1);
    bindBtn(downBtn, -1);
  });
}

// ── Help System: per-tool popovers + shortcuts overlay ──

const toolHelp = {
  edit: {
    Size: ['W/H: resize image (non-destructive, from original)', 'px/% toggle, lock ratio, Apply or Enter', 'Undo/Redo works on all operations'],
    Transform: ['Crop: drag to select region, Apply to confirm', 'Auto: smart content-aware crop', 'Rotate/Flip: 90° rotation, horizontal/vertical flip'],
    Adjust: ['B/C/S/H: brightness, contrast, saturation, hue', 'Sliders are live — drag to preview', 'Reset button reverts all adjustments'],
    Filters: ['One-click filters: B&W, Sepia, Invert, Blur, Sharpen', 'Filters stack — apply multiple in sequence', 'Undo removes the last filter applied'],
    Draw: ['Rect, Arrow, Text, Pen, Highlighter, Redact', 'Objects are selectable, movable, resizable', 'Click to select, drag handles to resize, Delete to remove', 'Fill checkbox: solid fill for rectangles'],
    Export: ['PNG (lossless), JPEG/WebP (quality slider), BMP, SVG (traced)', 'SVG export vectorizes the image via tracer', 'Ctrl+S to quick-export'],
    View: ['R: toggle ruler, G: toggle grid, C: toggle center crosshair', 'Rulers sit outside the image — no pixels hidden', 'Grid auto-adjusts spacing based on image size'],
  },
  convert: { Convert: ['Drop image(s) for batch conversion', 'Select format, optional resize, strip metadata', 'Quality slider for JPEG/WebP'] },
  generate: { Generate: ['Set W/H, then use any generator', 'Gradient, Pattern, Placeholder, Social Banner, Avatar, Noise, Favicon, Swatch', 'Export as PNG/JPEG/WebP'] },
  collage: {
    Canvas: ['W/H: set canvas dimensions in pixels', 'Background: solid color or 2-color gradient', 'Apply: resize canvas and redraw background'],
    Arrange: ['+ Add: drop or click to add images to canvas', 'Grid/Row/Col/Stack: auto-arrange all images', 'Images are freely draggable and resizable after arrange', 'Clear: remove all images from canvas'],
    Selected: ['Click an image to select, then adjust properties', 'Drag handles to resize. Hold Shift = lock aspect ratio', 'Border: color + thickness, Shadow: color + blur', 'R: corner radius, Filter: grayscale/sepia/etc.', 'Op: opacity, Blend: 16 blend modes', 'Edge: Feather/Vignette/Edge Blur/Fade (directional) + strength slider'],
    Layers: ['Front/Back: change stacking order', 'Up/Down: move one step forward/backward', 'Delete: remove selected (or all multi-selected)', 'Group (Ctrl+G): merge selected into one object', 'Ungroup (Ctrl+Shift+G): split group back to parts'],
    Align: ['Align L/R/T/B: align edges of 2+ selected images', 'Center H/V: align centers of selected images', 'Distribute H/V: equal spacing between 3+ images', 'Canvas H/V: center selection on the canvas'],
    Export: ['Export: full canvas as-is', 'Trim to content: crops to image bounds + 10px padding', 'PNG (lossless), JPEG, WebP'],
  },
  store: { Store: ['Drop a 1024x1024 source icon', 'Generates all app store sizes (Play, Apple, Chrome, Edge, Firefox, MS)', 'Export All downloads as individual PNGs'] },
  info: { Info: ['Drop image to inspect EXIF, DPI, JPEG structure, hash', 'Copy Data URI for embedding', 'All analysis is offline — no data sent anywhere'] },
  qr: { QR: ['Type content, select preset (URL, WiFi, vCard, etc.)', 'Customize size, margin, colors, error correction', 'Export as PNG or SVG, or copy to clipboard', 'Drop an image to read/decode QR codes'] },
  colors: { Colors: ['Drop image, click any pixel to pick color', 'Dominant palette extracted automatically', 'Adjust palette count with slider'] },
  svg: { SVG: ['Drop SVG to inspect source, export as raster', 'Drop image to trace into SVG (vectorize)', 'Trace presets: Logo, Sketch, Photo, Artistic, etc.', 'Grid overlay to check trace accuracy'] },
  compare: { Compare: ['Drop two images (A and B)', 'Diff: highlights pixel differences in red', 'Slider: drag to compare before/after', 'Center guides toggle for alignment check'] },
  batch: { Batch: ['Drop multiple images, apply same operations to all', 'Resize, filter, watermark, format conversion', 'Click thumbnails to remove, + to add more', 'Process All downloads everything to pixeroo/batch/'] },
};

function showHelpPopover(btn, mode, group) {
  // Close any existing popover
  document.querySelectorAll('.help-popover').forEach(p => p.remove());

  const tips = toolHelp[mode]?.[group];
  if (!tips) return;

  const pop = document.createElement('div');
  pop.className = 'help-popover';
  pop.innerHTML = `<div class="help-popover-title">${group}</div><ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>`;

  // Position below the button
  const rect = btn.getBoundingClientRect();
  pop.style.position = 'fixed';
  pop.style.top = (rect.bottom + 6) + 'px';
  pop.style.left = Math.max(8, rect.left - 80) + 'px';
  document.body.appendChild(pop);

  // Close on click outside or Escape
  function close(e) {
    if (e.type === 'keydown' && e.key !== 'Escape') return;
    pop.remove();
    document.removeEventListener('mousedown', close);
    document.removeEventListener('keydown', close);
  }
  setTimeout(() => {
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
  }, 50);
}

function showShortcutsOverlay() {
  // Remove existing
  document.querySelectorAll('.shortcuts-overlay').forEach(o => o.remove());

  const shortcuts = [
    ['General', [
      ['Undo', 'Ctrl+Z'], ['Redo', 'Ctrl+Y'], ['Export / Save', 'Ctrl+S'], ['Shortcuts', 'Ctrl+/'], ['Back to Home', 'Escape'],
    ]],
    ['Edit Mode', [
      ['Toggle Ruler', 'R'], ['Toggle Grid', 'G'], ['Toggle Center', 'C'],
    ]],
    ['Drawing', [
      ['Select object', 'Click'], ['Move object', 'Drag'], ['Delete object', 'Delete / Backspace'],
      ['Edit text', 'Double-click'], ['Finish text', 'Escape'],
    ]],
  ];

  const overlay = document.createElement('div');
  overlay.className = 'shortcuts-overlay';
  const panel = document.createElement('div');
  panel.className = 'shortcuts-panel';
  panel.innerHTML = '<h2>Keyboard Shortcuts</h2>' +
    shortcuts.map(([section, keys]) =>
      `<h3>${section}</h3>` + keys.map(([label, key]) =>
        `<div class="shortcut-row"><span>${label}</span><span class="shortcut-key">${key}</span></div>`
      ).join('')
    ).join('');
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function close(e) {
    if (e.type === 'keydown' && e.key !== 'Escape') return;
    if (e.type === 'mousedown' && panel.contains(e.target)) return;
    overlay.remove();
    document.removeEventListener('mousedown', close);
    document.removeEventListener('keydown', close);
  }
  setTimeout(() => {
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
  }, 50);
}

document.addEventListener('DOMContentLoaded', () => {
  // Notify side panel that editor is open/closed
  chrome.runtime.sendMessage({ action: 'editorOpened' }).catch(() => {});
  window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ action: 'editorClosed' }).catch(() => {});
  });

  // Wrap all number inputs with custom +/- spinner (cross-browser)
  enhanceNumberInputs();

  // Delegated click-to-copy
  document.addEventListener('click', (e) => {
    if (e.target.classList?.contains('copyable')) {
      navigator.clipboard.writeText(e.target.textContent);
    }
    if (e.target.dataset?.copy) {
      navigator.clipboard.writeText(e.target.dataset.copy);
    }
  });

  // Shortcuts button
  document.getElementById('btn-shortcuts')?.addEventListener('click', showShortcutsOverlay);

  // Help page — opens in new tab with current mode section
  document.getElementById('btn-help-page')?.addEventListener('click', () => {
    const hash = currentMode || 'overview';
    chrome.tabs.create({ url: chrome.runtime.getURL(`help/help.html#${hash}`) });
  });

  // Guided tour
  document.getElementById('btn-tour')?.addEventListener('click', () => {
    if (typeof startTour === 'function' && currentMode) startTour(currentMode);
    else if (typeof startTour === 'function') startTour('edit'); // default
  });

  // Inject ? help buttons into ribbon group labels
  // Add ? help indicator next to each ribbon group label
  document.querySelectorAll('.ribbon-label').forEach(label => {
    const groupName = label.textContent.trim();
    const modeEl = label.closest('.mode-view');
    const modeId = modeEl?.id?.replace('mode-', '') || 'edit';
    if (!toolHelp[modeId]?.[groupName]) return;

    const q = document.createElement('span');
    q.textContent = '?';
    q.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:11px;height:11px;border-radius:50%;font-size:0.4375rem;font-weight:700;color:var(--slate-500);border:1px solid var(--slate-700);cursor:help;margin-left:3px;transition:all 0.12s;vertical-align:middle;';
    q.addEventListener('mouseenter', () => { q.style.color = 'var(--saffron-400)'; q.style.borderColor = 'var(--saffron-400)'; });
    q.addEventListener('mouseleave', () => { q.style.color = 'var(--slate-600)'; q.style.borderColor = 'var(--slate-700)'; });
    q.addEventListener('click', (e) => { e.stopPropagation(); showHelpPopover(q, modeId, groupName); });

    label.appendChild(q);
  });

  // Also inject ? into tool-ribbon titles
  document.querySelectorAll('.tool-ribbon .ribbon-title').forEach(title => {
    const groupName = title.textContent.trim();
    const modeEl = title.closest('.mode-view');
    const modeId = modeEl?.id?.replace('mode-', '') || '';
    // Map ribbon-title text to help keys
    const helpMap = { 'Info':'Info', 'Generate':'QR', 'Export':'QR', 'Compare':'Compare',
      'SVG Inspect':'SVG', 'Trace':'SVG', 'Eyedropper':'Colors', 'Palette':'Colors',
      'Source':'Store' };
    const helpKey = helpMap[groupName];
    const modeHelp = toolHelp[modeId];
    // Find first matching help section for this mode
    const sectionKey = modeHelp ? Object.keys(modeHelp)[0] : null;
    if (!sectionKey && !helpKey) return;
    const finalMode = helpKey ? Object.keys(toolHelp).find(m => toolHelp[m][helpKey]) : modeId;
    const finalKey = helpKey || sectionKey;
    if (!finalMode || !finalKey || !toolHelp[finalMode]?.[finalKey]) return;
    const btn = document.createElement('button');
    btn.className = 'help-btn';
    btn.textContent = '?';
    btn.title = `Help: ${finalKey}`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); showHelpPopover(btn, finalMode, finalKey); });
    title.parentNode.insertBefore(btn, title.nextSibling);
  });

  // Collapsible ribbon groups — click label to toggle
  document.querySelectorAll('.ribbon-label').forEach(label => {
    label.addEventListener('click', (e) => {
      if (e.target.classList?.contains('help-btn')) return; // don't toggle when clicking ? button
      const group = label.closest('.ribbon-group');
      if (group) group.classList.toggle('collapsed');
    });
  });

  // Collapse non-essential groups by default (Edit mode)
  const collapseByDefault = ['Watermark', 'Social', 'More', 'View'];
  document.querySelectorAll('.ribbon-group .ribbon-label').forEach(label => {
    if (collapseByDefault.includes(label.textContent.trim())) {
      label.closest('.ribbon-group')?.classList.add('collapsed');
    }
  });

  initNavigation();
  initEdit();
  initConvert();
  initStore();
  initInfo();
  initQR();
  initColors();
  initSVG();
  initCompare();
  initBatch();
  initGlobalDrop();
  initGenerate();
  initCollage();
  initSocial();
  initWatermark();

  // Drop-to-replace on all single-image tool work areas
  // (Edit mode has its own in initEdit, Collage/Batch handle multi-image differently)
  const singleImageTools = [
    { selector: '#mode-convert .work-area', dropId: 'convert-drop', fileId: 'convert-file' },
    { selector: '#mode-info .work-area', dropId: 'info-drop', fileId: 'info-file' },
    { selector: '#mode-colors .work-area', dropId: 'colors-drop', fileId: 'colors-file' },
    { selector: '#mode-svg .work-area', dropId: 'svg-drop', fileId: 'svg-file' },
    { selector: '#mode-social .work-area', dropId: 'social-dropzone', fileId: 'social-file' },
    // QR read uses its own dropzone directly — no replace dialog needed
  ];
  singleImageTools.forEach(({ selector, dropId, fileId }) => {
    setupWorkAreaReplace(selector, (file) => {
      // Re-show dropzone and trigger the file input change
      const drop = document.getElementById(dropId);
      const input = document.getElementById(fileId);
      if (drop) drop.style.display = '';
      // Trigger the existing dropzone handler by dispatching a synthetic drop
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });

  // Quick settings popover toggle
  document.getElementById('btn-editor-settings').addEventListener('click', () => {
    const pop = document.getElementById('settings-popover');
    pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
  });

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    const pop = document.getElementById('settings-popover');
    if (pop.style.display !== 'none' && !pop.contains(e.target) && e.target.id !== 'btn-editor-settings' && !e.target.closest('#btn-editor-settings')) {
      pop.style.display = 'none';
    }
  });

  // Theme toggle
  document.querySelectorAll('.qs-theme').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.storage.sync.set({ theme: btn.dataset.theme });
    });
  });

  // Default format
  document.getElementById('qs-format')?.addEventListener('change', (e) => {
    chrome.storage.sync.set({ defaultFormat: e.target.value });
  });

  // Download folder
  document.getElementById('qs-folder')?.addEventListener('change', (e) => {
    chrome.storage.sync.set({ downloadPrefix: e.target.value });
  });

  // Advanced settings opens in new tab
  document.getElementById('qs-advanced')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    document.getElementById('settings-popover').style.display = 'none';
  });

  // Font family
  document.getElementById('qs-font-family')?.addEventListener('change', (e) => {
    chrome.storage.sync.set({ fontFamily: e.target.value });
  });

  // Load saved settings into popover
  chrome.storage.sync.get({ defaultFormat: 'png', downloadPrefix: 'pixeroo', fontSize: 100, fontFamily: 'jetbrains' }, (r) => {
    const fmtEl = document.getElementById('qs-format'); if (fmtEl) fmtEl.value = r.defaultFormat;
    const folderEl = document.getElementById('qs-folder'); if (folderEl) folderEl.value = r.downloadPrefix;
    const ffEl = document.getElementById('qs-font-family'); if (ffEl) ffEl.value = r.fontFamily || 'system';
    applyFontSize(r.fontSize || 100);
  });

  // Font size A- / A+
  function applyFontSize(pct) {
    document.documentElement.style.fontSize = (pct / 100 * 16) + 'px';
    const label = document.getElementById('qs-font-val');
    if (label) label.textContent = pct + '%';
  }
  document.getElementById('qs-font-down')?.addEventListener('click', () => {
    chrome.storage.sync.get({ fontSize: 100 }, (r) => {
      const v = Math.max(70, (r.fontSize || 100) - 5);
      chrome.storage.sync.set({ fontSize: v });
      applyFontSize(v);
    });
  });
  document.getElementById('qs-font-up')?.addEventListener('click', () => {
    chrome.storage.sync.get({ fontSize: 100 }, (r) => {
      const v = Math.min(150, (r.fontSize || 100) + 5);
      chrome.storage.sync.set({ fontSize: v });
      applyFontSize(v);
    });
  });

  // === Workspace Save / Load ===

  function collectWorkspace() {
    const ws = { version: 1, timestamp: Date.now(), name: 'Pixeroo Workspace' };

    function val(id) {
      const el = document.getElementById(id);
      if (!el) return undefined;
      if (el.type === 'checkbox') return el.checked;
      if (el.type === 'color') return el.value;
      if (el.type === 'range') return +el.value;
      if (el.type === 'number') return +el.value;
      return el.value;
    }

    ws.qr = {
      text: val('qr-text'), ecc: val('qr-ecc'), style: val('qr-style'),
      px: val('qr-px'), margin: val('qr-margin'), fg: val('qr-fg'), bg: val('qr-bg'),
      label: val('qr-label'), gradient: val('qr-gradient'), fg2: val('qr-fg2'),
      compact: val('qr-compact'),
    };

    ws.edit = {
      annColor: val('ann-color'), annWidth: val('ann-width'),
      annFont: val('ann-font'), annFontsize: val('ann-fontsize'),
      annFill: val('ann-fill'), watermarkText: val('watermark-text'),
    };

    ws.social = {
      platform: val('social-platform'), fit: val('social-fit'),
      bgColor: val('social-bg-color'), text: val('social-text'),
      textColor: val('social-text-color'), textPos: val('social-text-pos'),
    };

    ws.watermark = {
      text: val('wm-text'), font: val('wm-font'), textColor: val('wm-text-color'),
      shadow: val('wm-shadow'), shadowColor: val('wm-shadow-color'),
      opacity: val('wm-opacity'), size: val('wm-size'),
      rotation: val('wm-rotation'), margin: val('wm-margin'),
      mode: val('wm-mode'), tileGap: val('wm-tile-gap'),
      position: document.querySelector('.wm-pos-btn.active')?.dataset.pos || 'br',
    };

    ws.convert = {
      format: document.querySelector('#convert-formats .format-btn.active')?.dataset.fmt || 'png',
      quality: val('convert-quality'),
    };

    ws.collage = {
      bg: val('coll-bg'), gap: val('coll-gap'), radius: val('coll-radius'),
    };

    ws.colors = {
      paletteCount: val('palette-count'),
    };

    ws.global = {
      defaultFormat: val('qs-format'),
      downloadPrefix: val('qs-folder'),
    };

    return ws;
  }

  function applyWorkspace(ws) {
    if (!ws || ws.version !== 1) return false;

    function set(id, value) {
      const el = document.getElementById(id);
      if (!el || value === undefined || value === null) return;
      if (el.type === 'checkbox') { el.checked = !!value; }
      else { el.value = value; }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (ws.qr) {
      set('qr-text', ws.qr.text); set('qr-ecc', ws.qr.ecc);
      set('qr-style', ws.qr.style); set('qr-px', ws.qr.px);
      set('qr-margin', ws.qr.margin); set('qr-fg', ws.qr.fg);
      set('qr-bg', ws.qr.bg); set('qr-label', ws.qr.label);
      set('qr-gradient', ws.qr.gradient); set('qr-fg2', ws.qr.fg2);
      set('qr-compact', ws.qr.compact);
    }

    if (ws.edit) {
      set('ann-color', ws.edit.annColor); set('ann-width', ws.edit.annWidth);
      set('ann-font', ws.edit.annFont); set('ann-fontsize', ws.edit.annFontsize);
      set('ann-fill', ws.edit.annFill); set('watermark-text', ws.edit.watermarkText);
    }

    if (ws.social) {
      set('social-platform', ws.social.platform); set('social-fit', ws.social.fit);
      set('social-bg-color', ws.social.bgColor); set('social-text', ws.social.text);
      set('social-text-color', ws.social.textColor); set('social-text-pos', ws.social.textPos);
    }

    if (ws.watermark) {
      set('wm-text', ws.watermark.text); set('wm-font', ws.watermark.font);
      set('wm-text-color', ws.watermark.textColor); set('wm-shadow', ws.watermark.shadow);
      set('wm-shadow-color', ws.watermark.shadowColor); set('wm-opacity', ws.watermark.opacity);
      set('wm-size', ws.watermark.size); set('wm-rotation', ws.watermark.rotation);
      set('wm-margin', ws.watermark.margin); set('wm-mode', ws.watermark.mode);
      set('wm-tile-gap', ws.watermark.tileGap);
      if (ws.watermark.position) {
        document.querySelectorAll('.wm-pos-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.wm-pos-btn[data-pos="${ws.watermark.position}"]`)?.classList.add('active');
      }
    }

    if (ws.convert) {
      if (ws.convert.format) {
        document.querySelectorAll('#convert-formats .format-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`#convert-formats .format-btn[data-fmt="${ws.convert.format}"]`)?.classList.add('active');
      }
      set('convert-quality', ws.convert.quality);
    }

    if (ws.collage) {
      set('coll-bg', ws.collage.bg); set('coll-gap', ws.collage.gap);
      set('coll-radius', ws.collage.radius);
    }

    if (ws.colors) {
      set('palette-count', ws.colors.paletteCount);
    }

    if (ws.global) {
      set('qs-format', ws.global.defaultFormat);
      set('qs-folder', ws.global.downloadPrefix);
    }

    return true;
  }

  // Save workspace to file
  document.getElementById('btn-workspace-save')?.addEventListener('click', () => {
    const ws = collectWorkspace();
    const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `pixeroo-workspace-${timestamp}.json`; a.click();
    URL.revokeObjectURL(url);
    document.getElementById('settings-popover').style.display = 'none';
  });

  // Load workspace from file
  document.getElementById('btn-workspace-load')?.addEventListener('click', () => {
    document.getElementById('workspace-file-input').click();
  });

  document.getElementById('workspace-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ws = JSON.parse(text);
      const ok = applyWorkspace(ws);
      if (ok) {
        await pixDialog.alert('Workspace Loaded', `Settings restored from "${file.name}".`);
      } else {
        await pixDialog.alert('Invalid Workspace', 'This file is not a valid Pixeroo workspace.');
      }
    } catch {
      await pixDialog.alert('Error', 'Could not read workspace file.');
    }
    e.target.value = '';
    document.getElementById('settings-popover').style.display = 'none';
  });

  // Auto-save workspace to chrome.storage every 30 seconds (debounced)
  let wsAutoSaveTimer = null;
  function scheduleWorkspaceAutoSave() {
    clearTimeout(wsAutoSaveTimer);
    wsAutoSaveTimer = setTimeout(() => {
      const ws = collectWorkspace();
      chrome.storage.local.set({ 'pixeroo-last-workspace': ws }).catch(() => {});
    }, 30000);
  }

  // Load last workspace on startup
  chrome.storage.local.get('pixeroo-last-workspace', (r) => {
    if (r['pixeroo-last-workspace']) {
      applyWorkspace(r['pixeroo-last-workspace']);
    }
  });

  // Wire auto-save to input/change events on the editor area
  document.querySelector('.editor')?.addEventListener('change', scheduleWorkspaceAutoSave);
  document.querySelector('.editor')?.addEventListener('input', scheduleWorkspaceAutoSave);

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); editUndo(); }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); editRedo(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); if (currentMode === 'edit') editExport(); }
    if (e.ctrlKey && e.key === '/') { e.preventDefault(); showShortcutsOverlay(); }
    // Guide toggles (only when not typing in an input)
    if (currentMode === 'edit' && !e.ctrlKey && !e.metaKey && !e.altKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
      if (e.key === 'r' || e.key === 'R') { document.getElementById('btn-toggle-ruler')?.click(); }
      if (e.key === 'g' || e.key === 'G') { document.getElementById('btn-toggle-grid')?.click(); }
      if (e.key === 'c' || e.key === 'C') { document.getElementById('btn-toggle-center')?.click(); }
      if (e.key === 'h' || e.key === 'H') { document.getElementById('btn-history')?.click(); }
    }
  });

  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  if (mode) openMode(mode);

  // Check for library transfer (images sent from side panel)
  if (params.get('fromLib')) {
    chrome.storage.local.get('pixeroo-lib-transfer', async (r) => {
      const data = r['pixeroo-lib-transfer'];
      if (!data?.images?.length) return;
      // Clean up transfer data
      chrome.storage.local.remove('pixeroo-lib-transfer');

      const tool = data.tool || 'edit';
      if (tool === 'edit') {
        // Load first image into editor
        const img = new Image();
        img.onload = () => {
          editOriginal = img;
          pipeline.setDisplayCanvas(editCanvas);
          pipeline.loadImage(img);
          editCanvas.style.display = 'block';
          document.getElementById('edit-ribbon')?.classList.remove('disabled');
          document.getElementById('edit-dropzone').style.display = 'none';
          editFilename = 'library-image';
          document.getElementById('file-label').textContent = 'Library Image';
          updResize(); originalW = 0; originalH = 0; saveEdit();
          _initEditGuides();
        };
        img.src = data.images[0];
      } else if (tool === 'collage' || tool === 'batch') {
        // Load all images into the collage/batch drop zone
        for (const dataUrl of data.images) {
          const img = new Image();
          img.src = dataUrl;
          await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
          if (tool === 'collage') {
            // Add to collage items list
            if (typeof collageImages !== 'undefined') {
              collageImages.push(img);
              if (typeof renderCollage === 'function') renderCollage();
            }
          } else if (tool === 'batch') {
            if (typeof batchFiles !== 'undefined') {
              batchFiles.push({ file: null, img, name: 'library-image-' + batchFiles.length, dataUrl });
              if (typeof renderBatchList === 'function') renderBatchList();
            }
          }
        }
      }
    });
  }
});

// ============================================================
// Navigation: Home <-> Modes
// ============================================================

let currentMode = null;

function initNavigation() {
  document.querySelectorAll('.home-card').forEach(card => {
    card.addEventListener('click', () => openMode(card.dataset.mode));
  });
  document.getElementById('btn-back').addEventListener('click', goHome);
}

function openMode(mode) {
  currentMode = mode;
  document.getElementById('home').classList.add('hidden');
  document.querySelectorAll('.mode-view').forEach(v => v.classList.remove('active'));
  const panel = document.getElementById(`mode-${mode}`);
  if (panel) panel.classList.add('active');

  document.getElementById('btn-back').classList.add('visible');
  document.body.classList.add('tool-active');
  const labels = { edit:'Edit', convert:'Convert', store:'Store Assets', info:'Info', qr:'QR Code', colors:'Colors', svg:'SVG Tools', compare:'Compare', generate:'Generate', collage:'Collage', batch:'Batch Edit', social:'Social Media', watermark:'Watermark' };
  document.getElementById('mode-label').textContent = labels[mode] || '';

  // Undo/Redo/Reset now live in ribbon Size group, always visible in edit mode
}

function goHome() {
  currentMode = null;
  document.getElementById('home').classList.remove('hidden');
  document.querySelectorAll('.mode-view').forEach(v => v.classList.remove('active'));
  document.getElementById('btn-back').classList.remove('visible');
  document.body.classList.remove('tool-active');
  document.getElementById('mode-label').textContent = '';
  document.getElementById('btn-undo').style.display = 'none';
  document.getElementById('btn-redo').style.display = 'none';
  document.getElementById('file-label').textContent = '';
}

// Global drop: drop file anywhere on home -> auto-detect best mode
function initGlobalDrop() {
  const home = document.getElementById('home');
  home.addEventListener('dragover', (e) => e.preventDefault());
  home.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) { openMode('svg'); triggerDrop('svg-drop', 'svg-file', file); }
    else { openMode('edit'); triggerDrop('edit-dropzone', 'edit-file', file); }
  });
}

// ============================================================
// MODE: Generate (standalone, no input image)
// ============================================================


function initGenerate() {
  const genCanvas = document.getElementById('gen-canvas');
  if (!genCanvas) return;
  const genCtx = genCanvas.getContext('2d');
  let genGuides = null;

  function showGen(c, name) {
    genCanvas.width = c.width; genCanvas.height = c.height;
    genCtx.drawImage(c, 0, 0);
    document.getElementById('gen-dims').textContent = `${c.width} x ${c.height}`;
    // Show guides
    if (!genGuides) {
      genGuides = new CanvasGuides(genCanvas.parentElement, genCanvas, { showRuler: true, showGrid: true });
    }
    setTimeout(() => { genGuides.show(); genGuides.update(); }, 50);
  }

  document.getElementById('btn-gen-gradient')?.addEventListener('click', () => {
    const w = +(document.getElementById('gen-w')?.value) || 800;
    const h = +(document.getElementById('gen-h')?.value) || 600;
    const type = document.getElementById('gen-grad-type')?.value || 'linear';
    const c1 = document.getElementById('gen-grad-c1')?.value || '#F4C430';
    const c2 = document.getElementById('gen-grad-c2')?.value || '#B8860B';
    showGen(generateGradient(w, h, type, [{ pos: 0, color: c1 }, { pos: 1, color: c2 }]), 'gradient');
  });

  document.getElementById('btn-gen-pattern')?.addEventListener('click', () => {
    const w = +(document.getElementById('gen-w')?.value) || 800;
    const h = +(document.getElementById('gen-h')?.value) || 600;
    const type = document.getElementById('gen-pat-type')?.value || 'checkerboard';
    const c1 = document.getElementById('gen-pat-c1')?.value || '#e2e8f0';
    const c2 = document.getElementById('gen-pat-c2')?.value || '#ffffff';
    const cell = +(document.getElementById('gen-pat-cell')?.value) || 40;
    showGen(generatePattern(w, h, type, c1, c2, cell), 'pattern');
  });

  document.getElementById('btn-gen-placeholder')?.addEventListener('click', () => {
    const w = +(document.getElementById('gen-w')?.value) || 800;
    const h = +(document.getElementById('gen-h')?.value) || 600;
    const bg = document.getElementById('gen-ph-bg')?.value || '#94a3b8';
    const tc = document.getElementById('gen-ph-text-color')?.value || '#ffffff';
    const text = document.getElementById('gen-ph-text')?.value || '';
    showGen(generatePlaceholder(w, h, bg, tc, text), 'placeholder');
  });

  // Populate social banner presets dropdown
  const socialSel = document.getElementById('gen-social-preset');
  if (socialSel && typeof socialBannerPresets !== 'undefined') {
    socialBannerPresets.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = p.name;
      socialSel.appendChild(opt);
    });
  }

  // Social banner
  document.getElementById('btn-gen-social')?.addEventListener('click', () => {
    const idx = +(document.getElementById('gen-social-preset')?.value);
    const preset = socialBannerPresets[idx];
    if (!preset) return;
    const text = document.getElementById('gen-social-text')?.value || '';
    const c1 = document.getElementById('gen-grad-c1')?.value || '#F4C430';
    const c2 = document.getElementById('gen-grad-c2')?.value || '#B8860B';
    const type = document.getElementById('gen-grad-type')?.value || 'linear';
    showGen(generateSocialBanner(preset, c1, c2, type, text, '#ffffff'), 'social-banner');
  });

  // Avatar
  document.getElementById('btn-gen-avatar')?.addEventListener('click', () => {
    const size = +(document.getElementById('gen-w')?.value) || 400;
    const initials = document.getElementById('gen-avatar-initials')?.value || 'AB';
    const bg = document.getElementById('gen-avatar-bg')?.value || '#6366f1';
    showGen(generateAvatar(size, initials, bg, '#ffffff'), 'avatar');
  });

  // Noise
  document.getElementById('btn-gen-noise')?.addEventListener('click', () => {
    const w = +(document.getElementById('gen-w')?.value) || 800;
    const h = +(document.getElementById('gen-h')?.value) || 600;
    const type = document.getElementById('gen-noise-type')?.value || 'white';
    showGen(generateNoise(w, h, type, 1), 'noise');
  });

  // Letter Favicon
  document.getElementById('btn-gen-favicon')?.addEventListener('click', () => {
    const letter = document.getElementById('gen-fav-letter')?.value || 'P';
    const bg = document.getElementById('gen-fav-bg')?.value || '#F4C430';
    const rounded = document.getElementById('gen-fav-round')?.checked || false;
    showGen(generateLetterFavicon(letter, 512, bg, '#1e293b', rounded), 'favicon');
  });

  // Color Swatch
  document.getElementById('btn-gen-swatch')?.addEventListener('click', () => {
    const input = document.getElementById('gen-swatch-colors')?.value || '#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6';
    const colors = input.split(',').map(c => c.trim()).filter(c => c);
    if (colors.length < 1) return;
    showGen(generateColorSwatch(colors), 'swatch');
  });

  document.getElementById('btn-gen-export')?.addEventListener('click', () => {
    if (!genCanvas.width) return;
    const fmt = document.getElementById('gen-export-fmt')?.value || 'png';
    const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt] || 'image/png';
    genCanvas.toBlob(blob => {
      chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/generated.${fmt === 'jpeg' ? 'jpg' : fmt}`, saveAs: true });
    }, mime, 0.92);
  });
}

// ============================================================
// MODE: Collage (freeform canvas editor)
// ============================================================

function initCollage() {
  const canvas = document.getElementById('collage-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // --- Image objects (simple array, no ObjectLayer) ---
  let images = []; // { src, x, y, w, h, borderWidth, borderColor, shadowEnabled, shadowColor, shadowBlur, cornerRadius, imgFilter, opacity }
  let selection = []; // multi-select array
  let selected = null; // primary selected (last clicked, receives property edits + handles)
  let dragging = false, dragWhat = null, dragStartX = 0, dragStartY = 0, origX = 0, origY = 0, origW = 0, origH = 0;
  let dragOrigins = []; // {obj, x, y} for multi-move
  let _shiftHeld = false;

  // --- Undo/Redo state stack ---
  let undoStack = []; // snapshots of images state
  let redoStack = [];
  const MAX_UNDO = 30;

  function snapImage(o) {
    return {
      src: o.src, x: o.x, y: o.y, w: o.w, h: o.h, rotation: o.rotation, flipH: o.flipH, flipV: o.flipV,
      borderWidth: o.borderWidth, borderColor: o.borderColor,
      shadowEnabled: o.shadowEnabled, shadowColor: o.shadowColor, shadowBlur: o.shadowBlur,
      cornerRadius: o.cornerRadius, imgFilter: o.imgFilter, panX: o.panX, panY: o.panY,
      opacity: o.opacity, blendMode: o.blendMode, fadeLeft: o.fadeLeft, fadeRight: o.fadeRight, fadeTop: o.fadeTop, fadeBottom: o.fadeBottom, edgeColor: o.edgeColor, isGroup: o.isGroup,
      children: o.children, type: o.type, text: o.text, color: o.color, fontSize: o.fontSize, fontFamily: o.fontFamily, fontWeight: o.fontWeight,
    };
  }

  function saveState() {
    // Snapshot images + canvas dimensions
    undoStack.push({
      canvasW: canvas.width, canvasH: canvas.height,
      images: images.map(snapImage),
    });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = []; // new action clears redo
  }

  function restoreState(state) {
    // Restore canvas dimensions
    if (state.canvasW) { canvas.width = state.canvasW; document.getElementById('collage-w').value = state.canvasW; }
    if (state.canvasH) { canvas.height = state.canvasH; document.getElementById('collage-h').value = state.canvasH; }
    // Restore images
    const imgList = state.images || state; // backwards compat with old format
    images = imgList.map(s => {
      if (s.type === 'text') {
        const o = makeTextObj(s.x, s.y, s.text);
        o.color = s.color; o.fontSize = s.fontSize; o.fontFamily = s.fontFamily; o.fontWeight = s.fontWeight;
        o.rotation = s.rotation; o.opacity = s.opacity;
        return o;
      }
      const o = makeImgObj(s.src, s.x, s.y, s.w, s.h);
      o.borderWidth = s.borderWidth; o.borderColor = s.borderColor;
      o.shadowEnabled = s.shadowEnabled; o.shadowColor = s.shadowColor; o.shadowBlur = s.shadowBlur;
      o.cornerRadius = s.cornerRadius; o.imgFilter = s.imgFilter; o.panX = s.panX; o.panY = s.panY;
      o.rotation = s.rotation; o.flipH = s.flipH; o.flipV = s.flipV;
      o.opacity = s.opacity; o.blendMode = s.blendMode;
      o.fadeLeft = s.fadeLeft; o.fadeRight = s.fadeRight; o.fadeTop = s.fadeTop; o.fadeBottom = s.fadeBottom; o.edgeColor = s.edgeColor;
      o.isGroup = s.isGroup; o.children = s.children;
      return o;
    });
    selection = []; selected = null; snapGuides = [];
    updateCount(); render();
  }

  function currentSnapshot() {
    return { canvasW: canvas.width, canvasH: canvas.height, images: images.map(snapImage) };
  }

  function collageUndo() {
    if (!undoStack.length) return;
    redoStack.push(currentSnapshot());
    restoreState(undoStack.pop());
  }

  function collageRedo() {
    if (!redoStack.length) return;
    undoStack.push(currentSnapshot());
    restoreState(redoStack.pop());
  }
  let snapGuides = []; // {axis:'x'|'y', pos:number} — active snap guide lines during drag
  let zoomLevel = 1;
  let dragTooltip = null; // { text, x, y } — shown near cursor during drag
  const HANDLE = 7;
  const SNAP_THRESHOLD = 6;

  document.addEventListener('keydown', (e) => { if (e.key === 'Shift') _shiftHeld = true; });
  document.addEventListener('keyup', (e) => { if (e.key === 'Shift') _shiftHeld = false; });

  function makeTextObj(x, y, text) {
    // Smart color: contrast with background
    const textColor = getContrastColor();
    return { type: 'text', x, y, w: 200, h: 40, text: text || '', color: textColor, fontSize: 36, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 'bold', opacity: 1, rotation: 0, editing: false };
  }

  function getContrastColor() {
    // Sample background color at center of canvas
    const bg = document.getElementById('collage-bg')?.value || '#ffffff';
    const r = parseInt(bg.slice(1,3),16)||0, g = parseInt(bg.slice(3,5),16)||0, b = parseInt(bg.slice(5,7),16)||0;
    // Luminance formula
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? '#1e293b' : '#ffffff';
  }

  function makeImgObj(src, x, y, w, h) {
    return { src, x, y, w, h, rotation: 0, flipH: false, flipV: false, panX: 0, panY: 0, borderWidth: 0, borderColor: '#ffffff', shadowEnabled: false, shadowColor: '#000000', shadowBlur: 12, cornerRadius: 0, imgFilter: 'none', opacity: 1, blendMode: 'source-over', fadeLeft: 0, fadeRight: 0, fadeTop: 0, fadeBottom: 0, edgeColor: '#000000' };
  }

  // --- Background ---
  let bgImage = null; // background image canvas

  function drawBg() {
    const bgType = document.getElementById('collage-bg-type')?.value || 'solid';
    const bg1 = document.getElementById('collage-bg')?.value || '#ffffff';
    const bg2 = document.getElementById('collage-bg2')?.value || '#e2e8f0';
    if (bgType === 'image' && bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else if (bgType === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, bg1); g.addColorStop(1, bg2); ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = bg1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // --- Draw one image object ---
  function drawImgObj(obj) {
    if (obj.type === 'text') { drawTextObj(ctx, obj); return; }
    drawImgObjOn(ctx, obj);
  }

  function drawTextObj(c, obj) {
    c.save();
    if (obj.rotation) {
      const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
      c.translate(cx, cy); c.rotate(obj.rotation * Math.PI / 180); c.translate(-cx, -cy);
    }
    c.globalAlpha = obj.opacity;
    c.fillStyle = obj.color;
    c.font = `${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily}`;
    c.textBaseline = 'top';
    const lines = (obj.text || '').split('\n');
    const lineH = obj.fontSize * 1.3;
    let maxW = 0;
    lines.forEach(line => { maxW = Math.max(maxW, c.measureText(line).width); });
    obj.w = Math.max(maxW + 8, 40);
    obj.h = Math.max(lines.length * lineH + 4, lineH + 4);
    lines.forEach((line, i) => { c.fillText(line, obj.x + 4, obj.y + i * lineH + 2); });
    // Cursor when editing
    if (obj.editing) {
      const lastLine = lines[lines.length - 1] || '';
      const cursorX = obj.x + 4 + c.measureText(lastLine).width + 2;
      const cursorY = obj.y + (lines.length - 1) * lineH + 2;
      c.strokeStyle = '#F4C430'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(cursorX, cursorY); c.lineTo(cursorX, cursorY + obj.fontSize); c.stroke();
    }
    c.restore();
  }

  function drawImgObjOn(c, obj) {
    const { x, y, w, h, src } = obj;
    const bw = obj.borderWidth || 0;
    const r = obj.cornerRadius || 0;
    const hasEdge = (obj.fadeLeft || obj.fadeRight || obj.fadeTop || obj.fadeBottom);

    // If edge effect: draw entire image+border onto temp canvas first, then apply fade
    const totalW = w + bw * 2, totalH = h + bw * 2;
    const useTemp = hasEdge;
    const tc = useTemp ? document.createElement('canvas') : null;
    let tctx = null;
    let drawX = x, drawY = y; // where to draw in final output
    if (useTemp) {
      tc.width = totalW + 20; tc.height = totalH + 20; // extra for shadow
      tctx = tc.getContext('2d');
      // Draw at offset 10,10 to leave room for shadow
      drawX = 10 + bw; drawY = 10 + bw;
    }
    const dc = useTemp ? tctx : c; // draw context
    const ox = useTemp ? drawX : x; // origin x for image
    const oy = useTemp ? drawY : y;
    const obx = useTemp ? drawX - bw : x - bw; // origin x for border
    const oby = useTemp ? drawY - bw : y - bw;

    if (!useTemp) {
      c.save();
      c.globalAlpha = obj.opacity;
      if (obj.blendMode && obj.blendMode !== 'source-over') c.globalCompositeOperation = obj.blendMode;
      if (obj.rotation || obj.flipH || obj.flipV) {
        const cx = x + w / 2, cy = y + h / 2;
        c.translate(cx, cy);
        if (obj.rotation) c.rotate(obj.rotation * Math.PI / 180);
        if (obj.flipH || obj.flipV) c.scale(obj.flipH ? -1 : 1, obj.flipV ? -1 : 1);
        c.translate(-cx, -cy);
      }
    }

    // Shadow
    if (obj.shadowEnabled) {
      const sr = parseInt(obj.shadowColor.slice(1,3),16)||0, sg = parseInt(obj.shadowColor.slice(3,5),16)||0, sb = parseInt(obj.shadowColor.slice(5,7),16)||0;
      dc.shadowColor = `rgba(${sr},${sg},${sb},0.4)`;
      dc.shadowBlur = obj.shadowBlur; dc.shadowOffsetX = 4; dc.shadowOffsetY = 4;
      dc.fillStyle = obj.borderColor || '#fff';
      if (r > 0) { roundRect(dc, obx, oby, totalW, totalH, r); dc.fill(); }
      else dc.fillRect(obx, oby, totalW, totalH);
      dc.shadowColor = 'transparent'; dc.shadowBlur = 0; dc.shadowOffsetX = 0; dc.shadowOffsetY = 0;
    }

    // Border frame
    if (bw > 0) {
      dc.fillStyle = obj.borderColor || '#ffffff';
      if (r > 0) { roundRect(dc, obx, oby, totalW, totalH, r); dc.fill(); }
      else dc.fillRect(obx, oby, totalW, totalH);
    }

    // Clip
    dc.save();
    if (r > 0) { roundRect(dc, ox, oy, w, h, Math.max(1, r - bw)); dc.clip(); }
    else { dc.beginPath(); dc.rect(ox, oy, w, h); dc.clip(); }

    // Filter
    const fmap = { none:'', grayscale:'grayscale(100%)', sepia:'sepia(100%)', brightness:'brightness(130%)', blur:'blur(2px)', invert:'invert(100%)' };
    if (obj.imgFilter && fmap[obj.imgFilter]) dc.filter = fmap[obj.imgFilter];

    // Draw image with pan offset
    const ppx = obj.panX || 0, ppy = obj.panY || 0;
    dc.drawImage(src, ox + ppx, oy + ppy, w, h);
    dc.filter = 'none';
    dc.restore(); // pop clip

    if (useTemp) {
      // Apply per-edge fades to the temp canvas
      const tw = tc.width, th = tc.height;
      const ec = obj.edgeColor || '#000000';
      const er = parseInt(ec.slice(1,3),16)||0, eg = parseInt(ec.slice(3,5),16)||0, eb = parseInt(ec.slice(5,7),16)||0;
      const solid = `rgba(${er},${eg},${eb},1)`;
      const clear = `rgba(${er},${eg},${eb},0)`;

      function edgeGrad(x1,y1,x2,y2) { const g = tctx.createLinearGradient(x1,y1,x2,y2); g.addColorStop(0, solid); g.addColorStop(1, clear); return g; }

      if (obj.fadeLeft > 0) {
        const sz = tw * obj.fadeLeft / 100;
        tctx.fillStyle = edgeGrad(0, 0, sz, 0); tctx.fillRect(0, 0, sz, th);
      }
      if (obj.fadeRight > 0) {
        const sz = tw * obj.fadeRight / 100;
        tctx.fillStyle = edgeGrad(tw, 0, tw - sz, 0); tctx.fillRect(tw - sz, 0, sz, th);
      }
      if (obj.fadeTop > 0) {
        const sz = th * obj.fadeTop / 100;
        tctx.fillStyle = edgeGrad(0, 0, 0, sz); tctx.fillRect(0, 0, tw, sz);
      }
      if (obj.fadeBottom > 0) {
        const sz = th * obj.fadeBottom / 100;
        tctx.fillStyle = edgeGrad(0, th, 0, th - sz); tctx.fillRect(0, th - sz, tw, sz);
      }

      // Composite temp canvas onto main canvas
      c.save();
      c.globalAlpha = obj.opacity;
      if (obj.blendMode && obj.blendMode !== 'source-over') c.globalCompositeOperation = obj.blendMode;
      if (obj.rotation || obj.flipH || obj.flipV) {
        const cx = x + w / 2, cy = y + h / 2;
        c.translate(cx, cy);
        if (obj.rotation) c.rotate(obj.rotation * Math.PI / 180);
        if (obj.flipH || obj.flipV) c.scale(obj.flipH ? -1 : 1, obj.flipV ? -1 : 1);
        c.translate(-cx, -cy);
      }
      c.drawImage(tc, x - bw - 10, y - bw - 10);
      c.restore();
    } else {
      // No edge effect — already drew directly on c
      c.restore(); // pop the main save
    }
  }

  // --- Selection + handles ---
  function drawSelection(obj) {
    ctx.save();
    // Apply same rotation transform
    if (obj.rotation) {
      const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
      ctx.translate(cx, cy); ctx.rotate(obj.rotation * Math.PI / 180); ctx.translate(-cx, -cy);
    }
    ctx.strokeStyle = '#F4C430'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.strokeRect(obj.x - 1, obj.y - 1, obj.w + 2, obj.h + 2);
    ctx.setLineDash([]);
    ctx.fillStyle = '#F4C430';
    for (const [, hx, hy] of getHandles(obj)) {
      ctx.fillRect(hx - HANDLE/2, hy - HANDLE/2, HANDLE, HANDLE);
    }
    // Rotation handle — circle above top center (not for text)
    if (obj.type !== 'text') {
      const rotX = obj.x + obj.w / 2, rotY = obj.y - 25;
      ctx.beginPath(); ctx.arc(rotX, rotY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#F4C430'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(rotX, rotY + 6); ctx.lineTo(rotX, obj.y); ctx.stroke();
    }
    ctx.restore();
  }

  function getHandles(obj) {
    // Text objects: no resize handles (auto-sized by font)
    if (obj.type === 'text') return [];
    const { x, y, w, h } = obj;
    return [
      ['tl',x,y],['tr',x+w,y],['bl',x,y+h],['br',x+w,y+h],
      ['tm',x+w/2,y],['bm',x+w/2,y+h],['ml',x,y+h/2],['mr',x+w,y+h/2],
    ];
  }

  function hitHandle(obj, px, py) {
    for (const [name, hx, hy] of getHandles(obj)) {
      if (Math.abs(px-hx) < HANDLE && Math.abs(py-hy) < HANDLE) return name;
    }
    return null;
  }

  function hitImage(px, py) {
    for (let i = images.length - 1; i >= 0; i--) {
      const o = images[i];
      if (px >= o.x && px <= o.x+o.w && py >= o.y && py <= o.y+o.h) return o;
    }
    return null;
  }

  // --- Full render ---
  function render() {
    drawBg();

    // Check if any image uses a non-normal blend mode
    const hasBlend = images.some(o => o.blendMode && o.blendMode !== 'source-over');

    if (hasBlend) {
      // Draw all images onto a transparent layer, then composite onto bg
      const layer = document.createElement('canvas');
      layer.width = canvas.width; layer.height = canvas.height;
      const lctx = layer.getContext('2d');
      for (const obj of images) drawImgObjOn(lctx, obj);
      ctx.drawImage(layer, 0, 0);
    } else {
      for (const obj of images) drawImgObj(obj);
    }

    // Selection + guides on top (always normal blend)
    for (const obj of selection) {
      if (obj !== selected) drawSelectionOutline(obj);
    }
    if (selected) drawSelection(selected);
    if (!dragging) { snapGuides = []; dragTooltip = null; }
    drawSnapGuides();
    if (dragTooltip) drawDragTooltip();
    updateHint();
    updateRibbonState();
    if (!textPlaceMode && !dragging) canvas.style.cursor = 'default';
  }

  // Outline for multi-selected (dashed, corner dots, no resize handles)
  function drawSelectionOutline(obj) {
    ctx.save();
    if (obj.rotation) {
      const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
      ctx.translate(cx, cy); ctx.rotate(obj.rotation * Math.PI / 180); ctx.translate(-cx, -cy);
    }
    ctx.strokeStyle = '#F4C430'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 4]);
    ctx.strokeRect(obj.x - 3, obj.y - 3, obj.w + 6, obj.h + 6);
    ctx.setLineDash([]);
    // Corner dots
    ctx.fillStyle = '#F4C430';
    const d = 5;
    ctx.fillRect(obj.x - d, obj.y - d, d*2, d*2);
    ctx.fillRect(obj.x + obj.w - d, obj.y - d, d*2, d*2);
    ctx.fillRect(obj.x - d, obj.y + obj.h - d, d*2, d*2);
    ctx.fillRect(obj.x + obj.w - d, obj.y + obj.h - d, d*2, d*2);
    ctx.restore();
  }

  function updateHint() {
    const hint = document.getElementById('collage-hint');
    if (!hint) return;
    if (canvas.style.display === 'none') { hint.style.display = 'none'; return; }
    hint.style.display = '';
    if (images.length === 0) {
      hint.textContent = 'Click + Add or drop images to get started';
    } else if (selection.length === 0) {
      hint.textContent = 'Click to select \u2022 Shift+Click multi-select \u2022 Ctrl+A all' + (joinMode ? ' \u2022 JOIN MODE: Shift+Click 2 images to auto-blend' : '');
    } else if (selection.length > 1) {
      hint.innerHTML = `<span style="color:var(--saffron-400);">${selection.length} selected</span> \u2022 Drag to move all \u2022 Delete to remove \u2022 <b>Ctrl+G</b> to group`;
    } else if (selected) {
      const s = selected.src;
      const origSize = s ? `${s.width}\u00d7${s.height}` : '';
      const curSize = `${Math.round(selected.w)}\u00d7${Math.round(selected.h)}`;
      const groupHint = selected.isGroup ? ' \u2022 <b>Ctrl+Shift+G</b> to ungroup' : '';
      const panHint = panMode ? ' \u2022 <span style="color:#22c55e;">PAN MODE</span>: drag to shift image in frame' : ' \u2022 Double-click to pan inside frame';
      hint.innerHTML = `<span style="color:var(--saffron-400);">Selected</span> ${origSize ? origSize + ' \u2192 ' : ''}${curSize} \u2022 Drag handles to resize \u2022 <b>Shift = lock ratio</b> \u2022 Delete${groupHint}${panHint}`;
    }
  }

  // --- Canvas coords from mouse event ---
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  }

  // --- Mouse interaction ---
  let _didDrag = false;
  let _mouseDownShift = false;
  let _skipNextMouseup = false;

  function updateRibbonState() {
    const n = selection.length;
    const has1 = n >= 1;
    const has2 = n >= 2;
    const has3 = n >= 3;
    const isGrp = !!selected?.isGroup;

    function setBtn(id, enabled) {
      const el = document.getElementById(id);
      if (el) el.disabled = !enabled;
    }

    // Transform: need 1+
    setBtn('btn-coll-rot-left', has1);
    setBtn('btn-coll-rot-right', has1);
    setBtn('btn-coll-flip-h', has1);
    setBtn('btn-coll-flip-v', has1);

    // Layer order: need 1+
    setBtn('btn-coll-front', has1);
    setBtn('btn-coll-forward', has1);
    setBtn('btn-coll-backward', has1);
    setBtn('btn-coll-back', has1);

    // Delete/Deselect: need 1+
    setBtn('btn-coll-delete', has1);
    setBtn('btn-coll-deselect', has1);

    // Group: need 2+, Ungroup: need group
    setBtn('btn-coll-group', has2);
    setBtn('btn-coll-ungroup', isGrp);

    // Style: need 1+
    setBtn('btn-coll-copy-style', has1);
    setBtn('btn-coll-paste-style', has1);

    // Join: need exactly 2
    setBtn('btn-coll-join', n === 2);

    // Align: need 2+
    setBtn('btn-align-left', has2);
    setBtn('btn-align-right', has2);
    setBtn('btn-align-top', has2);
    setBtn('btn-align-bottom', has2);
    setBtn('btn-align-center-h', has2);
    setBtn('btn-align-center-v', has2);

    // Distribute: need 3+
    setBtn('btn-distribute-h', has3);
    setBtn('btn-distribute-v', has3);

    // Center on canvas: need 1+
    setBtn('btn-center-canvas-h', has1);
    setBtn('btn-center-canvas-v', has1);
  }

  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = toCanvas(e);
    _didDrag = false;
    _mouseDownShift = e.shiftKey;

    // Shift+mousedown: do nothing (selection handled in mouseup)
    if (e.shiftKey) return;

    // Check handle on primary selected
    if (selected && !e.shiftKey) {
      // Rotation handle — circle above top center (not for text)
      const rotX = selected.x + selected.w / 2, rotY = selected.y - 25;
      if (selected.type !== 'text' && Math.hypot(x - rotX, y - rotY) < 10) {
        dragging = true; dragWhat = 'rotate'; _didDrag = true;
        dragStartX = x; dragStartY = y;
        origX = selected.rotation || 0;
        return;
      }
      const h = hitHandle(selected, x, y);
      if (h) {
        dragging = true; dragWhat = h; _didDrag = true;
        dragStartX = x; dragStartY = y;
        origX = selected.x; origY = selected.y; origW = selected.w; origH = selected.h;
        return;
      }
    }

    // Check image hit for drag-move
    const hit = hitImage(x, y);
    if (hit) {
      if (!selection.includes(hit)) { selection = [hit]; selected = hit; render(); }
      dragging = true; dragWhat = 'move';
      dragStartX = x; dragStartY = y;
      dragOrigins = selection.map(o => ({ obj: o, x: o.x, y: o.y }));
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (_skipNextMouseup) { _skipNextMouseup = false; dragging = false; dragWhat = null; snapGuides = []; return; }
    if (_didDrag) { dragging = false; dragWhat = null; _didDrag = false; snapGuides = []; saveState(); render(); return; }
    dragging = false; dragWhat = null;

    const { x, y } = toCanvas(e);

    // Text placement mode — click to place text
    if (textPlaceMode) {
      textPlaceMode = false;
      canvas.style.cursor = 'default';
      document.getElementById('btn-coll-add-text')?.classList.remove('active');
      saveState();
      const t = makeTextObj(x, y, '');
      images.push(t);
      selection = [t]; selected = t;
      t.editing = true;
      // Sync text color picker
      const tcPicker = document.getElementById('coll-text-color');
      if (tcPicker) tcPicker.value = t.color;
      updateCount(); render();
      return;
    }
    const hit = hitImage(x, y);
    const isShift = e.shiftKey || _mouseDownShift;

    if (hit) {
      if (isShift) {
        // Shift+Click: toggle in multi-selection
        const idx = selection.indexOf(hit);
        if (idx >= 0) {
          selection.splice(idx, 1);
          if (selected === hit) selected = selection.length ? selection[selection.length - 1] : null;
        } else {
          selection.push(hit);
          selected = hit;
        }
      } else {
        // Normal click: single-select, stop any text editing
        images.forEach(o => { if (o !== hit && o.editing) o.editing = false; });
        if (!selection.includes(hit)) { selection = [hit]; selected = hit; }
      }
    } else if (!isShift) {
      // Exit pan mode on any click
      if (panMode) panMode = false;
      // Click on nothing: stop text editing, remove empty text objects, deselect
      images.forEach(o => { if (o.editing) o.editing = false; });
      images = images.filter(o => !(o.type === 'text' && !o.text.trim()));
      selection = []; selected = null;
    }

    // Auto-join when join mode is on and exactly 2 selected
    if (joinMode && selection.length === 2) {
      joinBlend();
    }

    render();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const { x, y } = toCanvas(e);
    const dx = x - dragStartX, dy = y - dragStartY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) _didDrag = true;
    if (!selected && dragWhat === 'move') return;

    // Pan mode: shift image within frame
    if (panMode && dragWhat === 'move' && selected && !selected.type) {
      selected.panX = (selected.panX || 0) + (x - dragStartX);
      selected.panY = (selected.panY || 0) + (y - dragStartY);
      dragStartX = x; dragStartY = y;
      dragTooltip = { text: `pan: ${Math.round(selected.panX)}, ${Math.round(selected.panY)}`, x, y };
      render(); return;
    }

    if (dragWhat === 'rotate' && selected) {
      // Free rotation: angle from center to mouse
      const cx = selected.x + selected.w / 2, cy = selected.y + selected.h / 2;
      const angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90; // +90 because handle is above
      selected.rotation = Math.round(angle);
      // Snap to 0, 90, 180, 270 within 5 degrees
      for (const snap of [0, 90, 180, 270, -90, -180, -270, 360]) {
        if (Math.abs(selected.rotation - snap) < 5) { selected.rotation = snap % 360; break; }
      }
      dragTooltip = { text: `${selected.rotation}\u00b0`, x, y };
      render(); return;
    } else if (dragWhat === 'move') {
      // Move all selected images together
      for (const d of dragOrigins) { d.obj.x = d.x + dx; d.obj.y = d.y + dy; }
      // Smart snap (skip if Ctrl held)
      if (!e.ctrlKey && selected) {
        const snap = computeSnap(selected);
        if (snap.dx !== 0 || snap.dy !== 0) {
          for (const d of dragOrigins) { d.obj.x += snap.dx; d.obj.y += snap.dy; }
        }
        snapGuides = snap.guides;
      } else {
        snapGuides = [];
      }
      if (selected) dragTooltip = { text: `${Math.round(selected.x)}, ${Math.round(selected.y)}`, x, y };
    } else {
      // Shift = lock to original image aspect ratio
      const lockRatio = _shiftHeld && selected.src;
      const aspect = lockRatio ? (selected.src.width / selected.src.height) : 0;

      if (dragWhat === 'br' || dragWhat === 'tr' || dragWhat === 'bl' || dragWhat === 'tl') {
        // Corner handles: resize both dimensions
        let newW = origW + (dragWhat.includes('r') ? dx : -dx);
        let newH = origH + (dragWhat.includes('b') ? dy : -dy);
        newW = Math.max(20, newW);
        newH = Math.max(20, newH);
        if (lockRatio) { newH = Math.round(newW / aspect); }
        selected.w = newW;
        selected.h = newH;
        if (dragWhat.includes('l')) selected.x = origX + origW - newW;
        if (dragWhat.includes('t')) selected.y = origY + origH - newH;
      } else {
        // Edge handles: resize one dimension, auto-adjust other if Shift
        if (dragWhat === 'mr' || dragWhat === 'ml') {
          const newW = Math.max(20, dragWhat === 'mr' ? origW + dx : origW - dx);
          selected.w = newW;
          if (dragWhat === 'ml') selected.x = origX + origW - newW;
          if (lockRatio) selected.h = Math.round(newW / aspect);
        }
        if (dragWhat === 'bm' || dragWhat === 'tm') {
          const newH = Math.max(20, dragWhat === 'bm' ? origH + dy : origH - dy);
          selected.h = newH;
          if (dragWhat === 'tm') selected.y = origY + origH - newH;
          if (lockRatio) selected.w = Math.round(newH * aspect);
        }
      }
      dragTooltip = { text: `${Math.round(selected.w)} \u00d7 ${Math.round(selected.h)}`, x, y };
    }
    render();
  });

  // Global mouseup fallback (in case mouseup fires outside canvas)
  window.addEventListener('mouseup', () => { if (dragging) { dragging = false; dragWhat = null; snapGuides = []; render(); } });

  // --- Right-click context menu ---
  function closeCtxMenu() { document.querySelectorAll('.ctx-menu').forEach(m => m.remove()); }

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    closeCtxMenu();

    const { x, y } = toCanvas(e);
    const hit = hitImage(x, y);

    // If right-clicked an unselected image, select it
    if (hit && !selection.includes(hit)) {
      selection = [hit]; selected = hit; render();
    }

    const menu = document.createElement('div');
    menu.className = 'ctx-menu';

    const multi = selection.length > 1;
    const hasSelection = selection.length > 0;
    const isGroup = selected?.isGroup;

    const items = [
      // Edit
      { label: 'Select All', shortcut: 'Ctrl+A', enabled: images.length > 0, action: () => { selection = [...images]; selected = images[images.length-1]; render(); } },
      { label: 'Duplicate', enabled: hasSelection, action: () => {
        saveState(); const dupes = [];
        for (const o of selection) {
          const d = makeImgObj(o.src, o.x + 20, o.y + 20, o.w, o.h);
          d.borderWidth = o.borderWidth; d.borderColor = o.borderColor;
          d.shadowEnabled = o.shadowEnabled; d.shadowColor = o.shadowColor;
          d.shadowBlur = o.shadowBlur; d.cornerRadius = o.cornerRadius;
          d.rotation = o.rotation; d.flipH = o.flipH; d.flipV = o.flipV;
          d.imgFilter = o.imgFilter; d.opacity = o.opacity; d.blendMode = o.blendMode; d.fadeLeft = o.fadeLeft; d.fadeRight = o.fadeRight; d.fadeTop = o.fadeTop; d.fadeBottom = o.fadeBottom; d.edgeColor = o.edgeColor;
          images.push(d); dupes.push(d);
        }
        selection = dupes; selected = dupes[dupes.length-1]; updateCount(); render();
      }},
      { label: 'Delete', shortcut: 'Del', enabled: hasSelection, danger: true, action: () => {
        saveState(); images = images.filter(o => !selection.includes(o));
        selection = []; selected = null; updateCount(); render();
      }},
      { sep: true },
      // Order
      { header: 'Order' },
      { label: 'Front', enabled: hasSelection, action: () => document.getElementById('btn-coll-front')?.click() },
      { label: 'Back', enabled: hasSelection, action: () => document.getElementById('btn-coll-back')?.click() },
      { sep: true },
      // Group
      { header: 'Group' },
      { label: 'Group', shortcut: 'Ctrl+G', enabled: multi, action: groupSelected },
      { label: 'Ungroup', shortcut: 'Ctrl+Shift+G', enabled: isGroup, action: ungroupSelected },
      { label: 'Join Blend', enabled: selection.length === 2, action: joinBlend },
      { sep: true },
      // Align (only show header if 2+)
      { header: 'Align', enabled: multi },
      { label: 'Align Left', enabled: multi, action: () => document.getElementById('btn-align-left')?.click() },
      { label: 'Align Center H', enabled: multi, action: () => document.getElementById('btn-align-center-h')?.click() },
      { label: 'Align Right', enabled: multi, action: () => document.getElementById('btn-align-right')?.click() },
      { label: 'Align Top', enabled: multi, action: () => document.getElementById('btn-align-top')?.click() },
      { label: 'Align Center V', enabled: multi, action: () => document.getElementById('btn-align-center-v')?.click() },
      { label: 'Align Bottom', enabled: multi, action: () => document.getElementById('btn-align-bottom')?.click() },
      { label: 'Center on Canvas', enabled: hasSelection, action: () => { document.getElementById('btn-center-canvas-h')?.click(); document.getElementById('btn-center-canvas-v')?.click(); } },
      { sep: true },
      // Style
      { header: 'Style', enabled: hasSelection },
      { label: 'Copy Style', enabled: hasSelection && !selected?.type, action: () => document.getElementById('btn-coll-copy-style')?.click() },
      { label: 'Paste Style', enabled: !!copiedStyle && hasSelection, action: () => document.getElementById('btn-coll-paste-style')?.click() },
      { sep: true },
      // Reset options — only show when there's something to reset
      { header: 'Reset', enabled: hasSelection && (selected?.rotation || selected?.panX || selected?.panY || selected?.borderWidth || selected?.shadowEnabled || selected?.fadeLeft || selected?.fadeRight || selected?.fadeTop || selected?.fadeBottom || selected?.imgFilter !== 'none') },
      { label: 'Reset Rotation', enabled: hasSelection && !!selected?.rotation, action: () => {
        saveState(); for (const o of selection) o.rotation = 0; render();
      }},
      { label: 'Reset Pan', enabled: hasSelection && !!(selected?.panX || selected?.panY), action: () => {
        saveState(); for (const o of selection) { o.panX = 0; o.panY = 0; } render();
      }},
      { label: 'Reset Flip', enabled: hasSelection && (selected?.flipH || selected?.flipV), action: () => {
        saveState(); for (const o of selection) { o.flipH = false; o.flipV = false; } render();
      }},
      { label: 'Reset Effects', enabled: hasSelection && !!(selected?.borderWidth || selected?.shadowEnabled || selected?.cornerRadius || (selected?.imgFilter && selected?.imgFilter !== 'none') || selected?.fadeLeft || selected?.fadeRight || selected?.fadeTop || selected?.fadeBottom), action: () => {
        saveState();
        for (const o of selection) {
          o.borderWidth = 0; o.shadowEnabled = false; o.cornerRadius = 0;
          o.imgFilter = 'none'; o.fadeLeft = 0; o.fadeRight = 0; o.fadeTop = 0; o.fadeBottom = 0;
          o.blendMode = 'source-over'; o.opacity = 1;
        }
        render();
      }},
      { label: 'Reset All', enabled: hasSelection, action: () => {
        saveState();
        for (const o of selection) {
          o.rotation = 0; o.flipH = false; o.flipV = false;
          o.panX = 0; o.panY = 0;
          o.borderWidth = 0; o.borderColor = '#ffffff';
          o.shadowEnabled = false; o.shadowColor = '#000000'; o.shadowBlur = 12;
          o.cornerRadius = 0; o.imgFilter = 'none';
          o.opacity = 1; o.blendMode = 'source-over';
          o.fadeLeft = 0; o.fadeRight = 0; o.fadeTop = 0; o.fadeBottom = 0; o.edgeColor = '#000000';
        }
        render();
      }},
    ];

    let lastWasSep = true; // avoid leading separator
    for (const item of items) {
      if (item.sep) {
        if (!lastWasSep) {
          const sep = document.createElement('div');
          sep.className = 'ctx-menu-sep';
          menu.appendChild(sep);
          lastWasSep = true;
        }
        continue;
      }
      if (item.header) {
        if (item.enabled === false) continue; // hide header if disabled
        const h = document.createElement('div');
        h.className = 'ctx-menu-header';
        h.textContent = item.header;
        menu.appendChild(h);
        lastWasSep = false;
        continue;
      }
      if (!item.enabled) continue; // hide disabled items entirely
      const el = document.createElement('div');
      el.className = 'ctx-menu-item' + (item.danger ? ' danger' : '');
      el.innerHTML = `${item.label}${item.shortcut ? `<span class="ctx-menu-shortcut">${item.shortcut}</span>` : ''}`;
      el.addEventListener('click', () => { closeCtxMenu(); _skipNextMouseup = true; item.action(); });
      menu.appendChild(el);
      lastWasSep = false;
    }
    // Remove trailing separator
    if (menu.lastChild?.classList?.contains('ctx-menu-sep')) menu.lastChild.remove();

    // Position menu at cursor
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    document.body.appendChild(menu);

    // Keep in viewport
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 4) + 'px';
      if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 4) + 'px';
    });

    // Close on click outside or Escape
    setTimeout(() => {
      const close = (ev) => {
        if (ev.type === 'keydown' && ev.key !== 'Escape') return;
        // Don't close if clicking inside the menu (let click handler run)
        if (ev.type === 'mousedown' && menu.contains(ev.target)) return;
        closeCtxMenu();
        document.removeEventListener('mousedown', close);
        document.removeEventListener('keydown', close);
      };
      document.addEventListener('mousedown', close);
      document.addEventListener('keydown', close);
    }, 50);
  });

  // Delete key
  document.addEventListener('keydown', (e) => {
    if (currentMode !== 'collage') return;
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
    // Skip delete if editing text
    if (selected?.type === 'text' && selected?.editing) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      saveState();
      images = images.filter(o => !selection.includes(o));
      selection = []; selected = null; render(); updateCount();
    }
    // Ctrl+Z undo, Ctrl+Y redo (collage-specific, override global)
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault(); e.stopPropagation(); collageUndo();
    }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault(); e.stopPropagation(); collageRedo();
    }
    // Ctrl+A select all
    if (e.ctrlKey && e.key === 'a' && images.length) {
      e.preventDefault();
      selection = [...images];
      selected = selection[selection.length - 1];
      render();
    }
    // Ctrl+G group / Ctrl+Shift+G ungroup
    if (e.ctrlKey && e.key.toLowerCase() === 'g' && !e.shiftKey && selection.length > 1) {
      e.preventDefault(); groupSelected();
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g' && selected?.isGroup) {
      e.preventDefault(); ungroupSelected();
    }
  });

  // --- Cursor update + hover tooltip ---
  canvas.addEventListener('mousemove', (e) => {
    if (dragging) return;
    const { x, y } = toCanvas(e);
    let cursor = 'default';
    let hoverTip = null;
    if (selected) {
      // Check rotation handle (not for text)
      const rotX = selected.x + selected.w / 2, rotY = selected.y - 25;
      if (selected.type !== 'text' && Math.hypot(x - rotX, y - rotY) < 10) {
        cursor = 'grab';
        hoverTip = `${selected.rotation || 0}\u00b0`;
      } else {
        const h = hitHandle(selected, x, y);
        const cm = { tl:'nwse-resize',tr:'nesw-resize',bl:'nesw-resize',br:'nwse-resize',tm:'ns-resize',bm:'ns-resize',ml:'ew-resize',mr:'ew-resize' };
        if (h) {
          cursor = cm[h] || 'move';
          hoverTip = `${Math.round(selected.w)} \u00d7 ${Math.round(selected.h)}`;
        }
      }
    }
    if (cursor === 'default' && hitImage(x, y)) cursor = 'move';
    canvas.style.cursor = textPlaceMode ? 'text' : cursor;

    // Show/clear hover tooltip
    if (hoverTip && !dragging) {
      dragTooltip = { text: hoverTip, x, y };
      render();
    } else if (dragTooltip && !dragging) {
      dragTooltip = null;
      render();
    }
  });

  // --- Helper ---
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w/2, h/2);
    c.beginPath(); c.moveTo(x+r, y); c.lineTo(x+w-r, y);
    c.quadraticCurveTo(x+w, y, x+w, y+r); c.lineTo(x+w, y+h-r);
    c.quadraticCurveTo(x+w, y+h, x+w-r, y+h); c.lineTo(x+r, y+h);
    c.quadraticCurveTo(x, y+h, x, y+h-r); c.lineTo(x, y+r);
    c.quadraticCurveTo(x, y, x+r, y); c.closePath();
  }

  // --- Smart Snap: snap to other objects' edges/centers + canvas center ---
  function computeSnap(obj) {
    const guides = [];
    let dx = 0, dy = 0;
    const T = SNAP_THRESHOLD;

    // Points to check on the dragged object
    const srcL = obj.x, srcR = obj.x + obj.w, srcCX = obj.x + obj.w / 2;
    const srcT = obj.y, srcB = obj.y + obj.h, srcCY = obj.y + obj.h / 2;

    // Collect target snap points from other images + canvas
    const xTargets = [0, canvas.width, canvas.width / 2]; // canvas left, right, center
    const yTargets = [0, canvas.height, canvas.height / 2]; // canvas top, bottom, center

    for (const o of images) {
      if (selection.includes(o)) continue; // skip selected images
      xTargets.push(o.x, o.x + o.w, o.x + o.w / 2); // left, right, center
      yTargets.push(o.y, o.y + o.h, o.y + o.h / 2); // top, bottom, center
    }

    // Find nearest X snap
    let bestXDist = T + 1, bestXSnap = 0, bestXGuide = 0;
    for (const tx of xTargets) {
      for (const sx of [srcL, srcR, srcCX]) {
        const d = Math.abs(sx - tx);
        if (d < bestXDist) { bestXDist = d; bestXSnap = tx - sx; bestXGuide = tx; }
      }
    }
    if (bestXDist <= T) { dx = bestXSnap; guides.push({ axis: 'x', pos: bestXGuide }); }

    // Find nearest Y snap
    let bestYDist = T + 1, bestYSnap = 0, bestYGuide = 0;
    for (const ty of yTargets) {
      for (const sy of [srcT, srcB, srcCY]) {
        const d = Math.abs(sy - ty);
        if (d < bestYDist) { bestYDist = d; bestYSnap = ty - sy; bestYGuide = ty; }
      }
    }
    if (bestYDist <= T) { dy = bestYSnap; guides.push({ axis: 'y', pos: bestYGuide }); }

    return { dx, dy, guides };
  }

  // --- Draw snap guide lines ---
  function drawDragTooltip() {
    if (!dragTooltip) return;
    ctx.save();
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    const tm = ctx.measureText(dragTooltip.text);
    const pw = tm.width + 12, ph = 20;
    const tx = Math.min(dragTooltip.x + 15, canvas.width - pw - 5);
    const ty = Math.max(dragTooltip.y - 25, 5);
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.beginPath(); ctx.roundRect(tx, ty, pw, ph, 4); ctx.fill();
    ctx.fillStyle = '#F4C430';
    ctx.textBaseline = 'middle';
    ctx.fillText(dragTooltip.text, tx + 6, ty + ph / 2);
    ctx.restore();
  }

  function drawSnapGuides() {
    if (!snapGuides.length) return;
    ctx.save();
    ctx.strokeStyle = '#ef4444'; // red guide lines
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    for (const g of snapGuides) {
      ctx.beginPath();
      if (g.axis === 'x') {
        ctx.moveTo(g.pos + 0.5, 0);
        ctx.lineTo(g.pos + 0.5, canvas.height);
      } else {
        ctx.moveTo(0, g.pos + 0.5);
        ctx.lineTo(canvas.width, g.pos + 0.5);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function updateCount() {
    document.getElementById('collage-count').textContent = images.length.toString();
  }

  // --- Init canvas ---
  function initCanvas() {
    const w = +(document.getElementById('collage-w')?.value) || 1200;
    const h = +(document.getElementById('collage-h')?.value) || 800;
    canvas.width = w; canvas.height = h;
    canvas.style.display = 'block';
    document.getElementById('collage-drop').style.display = 'none';
    render();
  }

  // --- Add image ---
  async function addImageFile(file) {
    const img = await loadImg(file);
    if (!img) return;
    const src = document.createElement('canvas');
    src.width = img.naturalWidth; src.height = img.naturalHeight;
    src.getContext('2d').drawImage(img, 0, 0);

    if (!canvas.width || canvas.style.display === 'none') initCanvas();

    const maxDim = Math.min(canvas.width * 0.4, canvas.height * 0.4);
    const scale = Math.min(maxDim / src.width, maxDim / src.height, 1);
    const w = Math.round(src.width * scale), h = Math.round(src.height * scale);
    const ox = 20 + Math.random() * Math.max(0, canvas.width - w - 40);
    const oy = 20 + Math.random() * Math.max(0, canvas.height - h - 40);

    const obj = makeImgObj(src, Math.round(ox), Math.round(oy), w, h);
    saveState();
    images.push(obj);
    selected = obj;
    updateCount(); render();
  }

  // --- Drop zone ---
  setupDropzone(document.getElementById('collage-drop'), document.getElementById('collage-files-drop'), async (file) => {
    await addImageFile(file);
  }, { multiple: true });

  // --- Add button ---
  const addBtn = document.getElementById('collage-add-btn');
  const addInput = document.getElementById('collage-files');
  addBtn?.addEventListener('click', () => addInput?.click());
  addInput?.addEventListener('change', async (e) => {
    for (const f of e.target.files) await addImageFile(f);
    addInput.value = '';
  });

  // --- Add from Library ---
  document.getElementById('btn-collage-from-lib')?.addEventListener('click', () => {
    openLibraryPicker(async (items) => {
      for (const item of items) {
        const img = new Image();
        img.src = item.dataUrl;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        const src = document.createElement('canvas');
        src.width = img.naturalWidth; src.height = img.naturalHeight;
        src.getContext('2d').drawImage(img, 0, 0);

        if (!canvas.width || canvas.style.display === 'none') initCanvas();

        const maxDim = Math.min(canvas.width * 0.4, canvas.height * 0.4);
        const scale = Math.min(maxDim / src.width, maxDim / src.height, 1);
        const w = Math.round(src.width * scale), h = Math.round(src.height * scale);
        const ox = 20 + Math.random() * Math.max(0, canvas.width - w - 40);
        const oy = 20 + Math.random() * Math.max(0, canvas.height - h - 40);

        const obj = makeImgObj(src, Math.round(ox), Math.round(oy), w, h);
        saveState();
        images.push(obj);
        selected = obj;
        updateCount(); render();
      }
    });
  });

  // --- Add text ---
  let textPlaceMode = false;
  document.getElementById('btn-coll-add-text')?.addEventListener('click', () => {
    if (canvas.style.display === 'none') initCanvas();
    textPlaceMode = true;
    canvas.style.cursor = 'text';
    document.getElementById('btn-coll-add-text')?.classList.add('active');
  });

  // Double-click to edit text
  let panMode = false; // true when double-clicked an image to pan within frame

  canvas.addEventListener('dblclick', (e) => {
    const { x, y } = toCanvas(e);
    const hit = hitImage(x, y);
    if (hit?.type === 'text') {
      selected = hit; selection = [hit];
      hit.editing = true;
      panMode = false; render();
    } else if (hit && !hit.type) {
      // Double-click image: enter pan/crop mode
      selected = hit; selection = [hit];
      panMode = true; render();
    }
  });

  // Text editing keyboard handler
  document.addEventListener('keydown', (e) => {
    if (currentMode !== 'collage') return;
    const editingText = selected?.type === 'text' && selected?.editing;
    if (!editingText) return;

    if (e.key === 'Escape') {
      selected.editing = false;
      if (!selected.text.trim()) { images = images.filter(o => o !== selected); selected = null; selection = []; updateCount(); }
      render(); return;
    }
    if (e.key === 'Backspace') { e.preventDefault(); selected.text = selected.text.slice(0, -1); render(); return; }
    if (e.key === 'Enter') { selected.text += '\n'; render(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); selected.text += e.key; render(); return;
    }
  });

  // --- Zoom (Ctrl+wheel) ---
  canvas.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomLevel = Math.max(0.2, Math.min(5, zoomLevel + delta));
    canvas.style.transform = `scale(${zoomLevel})`;
    canvas.style.transformOrigin = 'center center';
  }, { passive: false });

  // Reset zoom
  canvas.addEventListener('dblclick', (e) => {
    if (e.ctrlKey) { zoomLevel = 1; canvas.style.transform = ''; }
  });

  // --- Background image ---
  const bgImgBtn = document.getElementById('collage-bg-img-btn');
  const bgImgInput = document.getElementById('collage-bg-file');
  bgImgBtn?.addEventListener('click', () => bgImgInput?.click());
  bgImgInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const img = await loadImg(file); if (!img) return;
    bgImage = document.createElement('canvas'); bgImage.width = img.naturalWidth; bgImage.height = img.naturalHeight;
    bgImage.getContext('2d').drawImage(img, 0, 0);
    bgImgInput.value = ''; render();
  });
  document.getElementById('collage-bg-type')?.addEventListener('change', (e) => {
    if (bgImgBtn) bgImgBtn.style.display = e.target.value === 'image' ? '' : 'none';
  });

  // --- Canvas resize + BG ---
  document.getElementById('btn-collage-resize')?.addEventListener('click', () => {
    saveState();
    canvas.width = +(document.getElementById('collage-w')?.value) || 1200;
    canvas.height = +(document.getElementById('collage-h')?.value) || 800;
    render();
  });

  // Fit canvas to content bounds
  document.getElementById('btn-collage-fit')?.addEventListener('click', () => {
    if (!images.length) return; saveState();
    let maxX = 0, maxY = 0;
    for (const o of images) {
      const bw = o.borderWidth || 0;
      maxX = Math.max(maxX, o.x + o.w + bw + 20);
      maxY = Math.max(maxY, o.y + o.h + bw + 20);
    }
    canvas.width = Math.round(maxX);
    canvas.height = Math.round(maxY);
    document.getElementById('collage-w').value = canvas.width;
    document.getElementById('collage-h').value = canvas.height;
    render();
  });
  ['collage-bg', 'collage-bg2', 'collage-bg-type'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', render);
    document.getElementById(id)?.addEventListener('change', render);
  });

  // --- Quick arrange ---
  // Helper: get image's natural aspect ratio
  function imgRatio(o) { return o.src ? (o.src.width / o.src.height) : (o.w / o.h || 1); }

  // Helper: fit image to a max cell size preserving ratio
  function fitToCell(o, maxW, maxH) {
    const r = imgRatio(o);
    if (r > maxW / maxH) { o.w = maxW; o.h = Math.round(maxW / r); }
    else { o.h = maxH; o.w = Math.round(maxH * r); }
  }

  document.getElementById('btn-arrange-grid')?.addEventListener('click', () => {
    const imgs = (selection.length > 1 ? selection : images).filter(o => !o.type); if (!imgs.length) return; saveState();
    const cols = Math.ceil(Math.sqrt(imgs.length)); const gap = 15;
    const cellW = Math.floor((canvas.width * 0.85 - (cols + 1) * gap) / cols);
    const cellH = Math.round(cellW * 0.75);
    const rows = Math.ceil(imgs.length / cols);
    const startX = (canvas.width - (cols * cellW + (cols - 1) * gap)) / 2;
    const startY = (canvas.height - (rows * cellH + (rows - 1) * gap)) / 2;
    imgs.forEach((o, i) => {
      fitToCell(o, cellW, cellH);
      const col = i % cols, row = Math.floor(i / cols);
      o.x = startX + col * (cellW + gap) + (cellW - o.w) / 2;
      o.y = startY + row * (cellH + gap) + (cellH - o.h) / 2;
    });
    render();
  });

  document.getElementById('btn-arrange-row')?.addEventListener('click', () => {
    const imgs = (selection.length > 1 ? selection : images).filter(o => !o.type); if (!imgs.length) return; saveState();
    const gap = 15; const pad = 20;
    const targetH = 300; // reasonable image height
    // Size each to same height, proportional width
    imgs.forEach(o => { fitToCell(o, 600, targetH); });
    let totalW = imgs.reduce((s, o) => s + o.w, 0) + (imgs.length - 1) * gap + pad * 2;
    let totalH = Math.max(...imgs.map(o => o.h)) + pad * 2;
    // Expand canvas if needed
    if (totalW > canvas.width) { canvas.width = totalW; document.getElementById('collage-w').value = totalW; }
    if (totalH > canvas.height) { canvas.height = totalH; document.getElementById('collage-h').value = totalH; }
    let x = (canvas.width - totalW + pad * 2) / 2 + pad;
    imgs.forEach(o => {
      o.x = x; o.y = (canvas.height - o.h) / 2;
      x += o.w + gap;
    });
    render();
  });

  document.getElementById('btn-arrange-col')?.addEventListener('click', () => {
    const imgs = (selection.length > 1 ? selection : images).filter(o => !o.type); if (!imgs.length) return; saveState();
    const gap = 15; const pad = 20;
    const targetW = 400; // reasonable image width
    imgs.forEach(o => { fitToCell(o, targetW, 600); });
    let totalH = imgs.reduce((s, o) => s + o.h, 0) + (imgs.length - 1) * gap + pad * 2;
    let totalW = Math.max(...imgs.map(o => o.w)) + pad * 2;
    // Expand canvas if needed
    if (totalH > canvas.height) { canvas.height = totalH; document.getElementById('collage-h').value = totalH; }
    if (totalW > canvas.width) { canvas.width = totalW; document.getElementById('collage-w').value = totalW; }
    let y = (canvas.height - totalH + pad * 2) / 2 + pad;
    imgs.forEach(o => {
      o.x = (canvas.width - o.w) / 2; o.y = y;
      y += o.h + gap;
    });
    render();
  });

  document.getElementById('btn-arrange-stack')?.addEventListener('click', () => {
    const imgs = (selection.length > 1 ? selection : images).filter(o => !o.type); if (!imgs.length) return; saveState();
    const maxW = canvas.width * 0.5, maxH = canvas.height * 0.5;
    imgs.forEach((o, i) => {
      fitToCell(o, maxW, maxH);
      o.x = (canvas.width - o.w) / 2 + i * 25;
      o.y = (canvas.height - o.h) / 2 + i * 25;
    });
    render();
  });

  // --- Templates ---
  document.getElementById('btn-tpl-polaroid')?.addEventListener('click', () => {
    const imgs = (selection.length > 1 ? selection : images).filter(o => !o.type); if (!imgs.length) return; saveState();
    const sz = Math.min(canvas.width, canvas.height) * 0.35;
    imgs.forEach((o, i) => {
      o.w = sz; o.h = sz;
      o.x = canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.5 - sz / 2;
      o.y = canvas.height / 2 + (Math.random() - 0.5) * canvas.height * 0.4 - sz / 2;
      o.rotation = Math.round((Math.random() - 0.5) * 30);
      o.borderWidth = Math.round(sz * 0.04);
      o.borderColor = '#ffffff';
      o.shadowEnabled = true; o.shadowBlur = 15; o.shadowColor = '#000000';
    });
    render();
  });

  document.getElementById('btn-tpl-filmstrip')?.addEventListener('click', () => {
    const imgs = images.filter(o => !o.type); if (!imgs.length) return; saveState();
    const gap = 8;
    const cellH = canvas.height - gap * 2;
    const cellW = Math.round(cellH * 0.7);
    const totalW = imgs.length * cellW + (imgs.length - 1) * gap;
    const startX = Math.max(gap, (canvas.width - totalW) / 2);
    imgs.forEach((o, i) => {
      o.x = startX + i * (cellW + gap); o.y = gap; o.w = cellW; o.h = cellH;
      o.rotation = 0; o.borderWidth = 3; o.borderColor = '#1e293b';
      o.shadowEnabled = false; o.cornerRadius = 4;
    });
    render();
  });

  document.getElementById('btn-tpl-magazine')?.addEventListener('click', () => {
    const imgs = images.filter(o => !o.type); if (!imgs.length) return; saveState();
    const gap = 12;
    if (imgs.length >= 1) { const o = imgs[0]; o.x = gap; o.y = gap; o.w = canvas.width * 0.6 - gap; o.h = canvas.height - gap * 2; o.rotation = 0; }
    if (imgs.length >= 2) { const o = imgs[1]; o.x = canvas.width * 0.6 + gap; o.y = gap; o.w = canvas.width * 0.4 - gap * 2; o.h = canvas.height * 0.5 - gap; o.rotation = 0; }
    if (imgs.length >= 3) { const o = imgs[2]; o.x = canvas.width * 0.6 + gap; o.y = canvas.height * 0.5 + gap; o.w = canvas.width * 0.4 - gap * 2; o.h = canvas.height * 0.5 - gap * 2; o.rotation = 0; }
    for (let i = 3; i < imgs.length; i++) { const o = imgs[i]; o.x = gap + (i - 3) * 60; o.y = canvas.height - 80; o.w = 70; o.h = 70; o.rotation = 0; }
    render();
  });

  // --- Selected item properties ---
  let _propSaveTimer = null;
  function applyToSelected(fn) {
    if (!selected) return; fn(selected); render();
    // Debounced save: captures state after rapid slider changes settle
    clearTimeout(_propSaveTimer);
    _propSaveTimer = setTimeout(saveState, 500);
  }

  let lastSel = null;
  setInterval(() => {
    if (selected !== lastSel) { lastSel = selected; syncUI(); }
  }, 200);

  function syncUI() {
    if (!selected) return;
    const el = (id) => document.getElementById(id);
    if (el('coll-item-border')) el('coll-item-border').checked = selected.borderWidth > 0;
    if (el('coll-item-border-color')) el('coll-item-border-color').value = selected.borderColor;
    if (el('coll-item-border-width')) el('coll-item-border-width').value = selected.borderWidth;
    if (el('coll-item-shadow')) el('coll-item-shadow').checked = selected.shadowEnabled;
    if (el('coll-item-shadow-color')) el('coll-item-shadow-color').value = selected.shadowColor;
    if (el('coll-item-shadow-blur')) el('coll-item-shadow-blur').value = selected.shadowBlur;
    if (el('coll-item-radius')) el('coll-item-radius').value = selected.cornerRadius;
    if (el('coll-item-filter')) el('coll-item-filter').value = selected.imgFilter;
    if (el('coll-item-opacity')) el('coll-item-opacity').value = Math.round(selected.opacity * 100);
    if (el('coll-item-blend')) el('coll-item-blend').value = selected.blendMode || 'source-over';
    if (el('coll-edge-left')) el('coll-edge-left').value = selected.fadeLeft || 0;
    if (el('coll-edge-right')) el('coll-edge-right').value = selected.fadeRight || 0;
    if (el('coll-edge-top')) el('coll-edge-top').value = selected.fadeTop || 0;
    if (el('coll-edge-bottom')) el('coll-edge-bottom').value = selected.fadeBottom || 0;
    // Text properties
    if (selected.type === 'text') {
      if (el('coll-text-color')) el('coll-text-color').value = selected.color || '#ffffff';
      if (el('coll-text-size')) el('coll-text-size').value = selected.fontSize || 36;
      if (el('coll-text-font')) el('coll-text-font').value = selected.fontFamily || 'Inter, system-ui, sans-serif';
    }
    if (el('coll-item-edge-color')) el('coll-item-edge-color').value = selected.edgeColor || '#000000';
  }

  const propMap = [
    ['coll-item-border', (o,el) => { o.borderWidth = el.checked ? (+(document.getElementById('coll-item-border-width')?.value)||6) : 0; }],
    ['coll-item-border-color', (o,el) => { o.borderColor = el.value; }],
    ['coll-item-border-width', (o,el) => { if (document.getElementById('coll-item-border')?.checked) o.borderWidth = +el.value||0; }],
    ['coll-item-shadow', (o,el) => { o.shadowEnabled = el.checked; }],
    ['coll-item-shadow-color', (o,el) => { o.shadowColor = el.value; }],
    ['coll-item-shadow-blur', (o,el) => { o.shadowBlur = +el.value||12; }],
    ['coll-item-radius', (o,el) => { o.cornerRadius = +el.value||0; }],
    ['coll-item-filter', (o,el) => { o.imgFilter = el.value; }],
    ['coll-item-opacity', (o,el) => { o.opacity = (+el.value||100)/100; }],
    ['coll-item-blend', (o,el) => { o.blendMode = el.value; }],
    ['coll-edge-left', (o,el) => { o.fadeLeft = +el.value; }],
    ['coll-edge-right', (o,el) => { o.fadeRight = +el.value; }],
    ['coll-edge-top', (o,el) => { o.fadeTop = +el.value; }],
    ['coll-edge-bottom', (o,el) => { o.fadeBottom = +el.value; }],
    ['coll-item-edge-color', (o,el) => { o.edgeColor = el.value; }],
    ['coll-text-color', (o,el) => { if (o.type === 'text') o.color = el.value; }],
    ['coll-text-size', (o,el) => { if (o.type === 'text') o.fontSize = +el.value || 36; }],
    ['coll-text-font', (o,el) => { if (o.type === 'text') o.fontFamily = el.value; }],
  ];
  propMap.forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => applyToSelected(o => fn(o, el)));
    el.addEventListener('change', () => applyToSelected(o => fn(o, el)));
  });

  // --- Layer controls ---
  function moveLayer(from, to) {
    if (!selected || from < 0 || to < 0 || to >= images.length) return;
    saveState(); images.splice(from, 1); images.splice(to, 0, selected); render();
  }
  document.getElementById('btn-coll-front')?.addEventListener('click', () => { const i = images.indexOf(selected); if (i >= 0) moveLayer(i, images.length-1); });
  document.getElementById('btn-coll-forward')?.addEventListener('click', () => { const i = images.indexOf(selected); if (i >= 0) moveLayer(i, i+1); });
  document.getElementById('btn-coll-backward')?.addEventListener('click', () => { const i = images.indexOf(selected); if (i >= 0) moveLayer(i, i-1); });
  document.getElementById('btn-coll-back')?.addEventListener('click', () => { const i = images.indexOf(selected); if (i >= 0) moveLayer(i, 0); });
  document.getElementById('btn-coll-delete')?.addEventListener('click', () => {
    saveState();
    images = images.filter(o => !selection.includes(o));
    selection = []; selected = null; updateCount(); render();
  });
  document.getElementById('btn-coll-deselect')?.addEventListener('click', () => { selection = []; selected = null; render(); });

  // --- Group / Ungroup ---
  function groupSelected() {
    if (selection.length < 2) return; saveState();
    try {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const o of selection) {
        minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
        maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
      }
      const gw = Math.round(maxX - minX), gh = Math.round(maxY - minY);
      if (gw < 1 || gh < 1) return;

      // Store children for later ungroup
      const children = selection.map(o => ({
        src: o.src, relX: o.x - minX, relY: o.y - minY, w: o.w, h: o.h,
        borderWidth: o.borderWidth, borderColor: o.borderColor, shadowEnabled: o.shadowEnabled,
        shadowColor: o.shadowColor, shadowBlur: o.shadowBlur, cornerRadius: o.cornerRadius,
        imgFilter: o.imgFilter, opacity: o.opacity
      }));

      // Render all selected into one group canvas
      const gc = document.createElement('canvas'); gc.width = gw; gc.height = gh;
      const gctx = gc.getContext('2d');
      for (const o of selection) {
        gctx.save();
        gctx.globalAlpha = o.opacity;
        gctx.drawImage(o.src, o.x - minX, o.y - minY, o.w, o.h);
        gctx.restore();
      }

      // Remove originals, add group
      images = images.filter(o => !selection.includes(o));
      const group = makeImgObj(gc, Math.round(minX), Math.round(minY), gw, gh);
      group.isGroup = true;
      group.children = children;
      images.push(group);
      selection = [group]; selected = group;
      updateCount(); render();
    } catch (e) { console.error('Group failed:', e); }
  }

  function ungroupSelected() {
    if (!selected?.isGroup || !selected.children) return; saveState();
    const g = selected;
    images = images.filter(o => o !== g);
    // Restore children at absolute positions
    for (const c of g.children) {
      const obj = makeImgObj(c.src, g.x + c.relX, g.y + c.relY, c.w, c.h);
      obj.borderWidth = c.borderWidth; obj.borderColor = c.borderColor;
      obj.shadowEnabled = c.shadowEnabled; obj.shadowColor = c.shadowColor;
      obj.shadowBlur = c.shadowBlur; obj.cornerRadius = c.cornerRadius;
      obj.imgFilter = c.imgFilter; obj.opacity = c.opacity;
      images.push(obj);
    }
    selection = []; selected = null;
    updateCount(); render();
  }

  document.getElementById('btn-coll-group')?.addEventListener('click', groupSelected);
  document.getElementById('btn-coll-ungroup')?.addEventListener('click', ungroupSelected);

  // Rotate/Flip buttons
  // --- Copy/Paste Style ---
  let copiedStyle = null;
  document.getElementById('btn-coll-copy-style')?.addEventListener('click', () => {
    if (!selected) return;
    copiedStyle = {
      borderWidth: selected.borderWidth, borderColor: selected.borderColor,
      shadowEnabled: selected.shadowEnabled, shadowColor: selected.shadowColor, shadowBlur: selected.shadowBlur,
      cornerRadius: selected.cornerRadius, imgFilter: selected.imgFilter,
      opacity: selected.opacity, blendMode: selected.blendMode,
      fadeLeft: selected.fadeLeft, fadeRight: selected.fadeRight, fadeTop: selected.fadeTop, fadeBottom: selected.fadeBottom, edgeColor: selected.edgeColor,
    };
    document.getElementById('footer-status').textContent = 'Style copied';
  });
  document.getElementById('btn-coll-paste-style')?.addEventListener('click', () => {
    if (!copiedStyle || !selection.length) return; saveState();
    for (const o of selection) {
      if (o.type === 'text') continue; // skip text objects
      Object.assign(o, copiedStyle);
    }
    render();
    document.getElementById('footer-status').textContent = `Style pasted to ${selection.length} image(s)`;
  });

  // --- Shadow Presets ---
  document.getElementById('coll-shadow-preset')?.addEventListener('change', (e) => {
    if (!selected || selected.type === 'text') return; saveState();
    const preset = e.target.value;
    if (preset === 'float') {
      selected.shadowEnabled = true; selected.shadowBlur = 20; selected.shadowColor = '#000000';
    } else if (preset === 'contact') {
      selected.shadowEnabled = true; selected.shadowBlur = 5; selected.shadowColor = '#000000';
    } else if (preset === 'long') {
      selected.shadowEnabled = true; selected.shadowBlur = 35; selected.shadowColor = '#000000';
    } else if (preset === 'none') {
      selected.shadowEnabled = false;
    }
    e.target.value = ''; // reset dropdown
    render();
  });

  document.getElementById('btn-coll-rot-left')?.addEventListener('click', () => {
    if (!selected) return; saveState();
    selected.rotation = ((selected.rotation || 0) - 90) % 360; render();
  });
  document.getElementById('btn-coll-rot-right')?.addEventListener('click', () => {
    if (!selected) return; saveState();
    selected.rotation = ((selected.rotation || 0) + 90) % 360; render();
  });
  document.getElementById('btn-coll-flip-h')?.addEventListener('click', () => {
    if (!selected) return; saveState();
    selected.flipH = !selected.flipH; render();
  });
  document.getElementById('btn-coll-flip-v')?.addEventListener('click', () => {
    if (!selected) return; saveState();
    selected.flipV = !selected.flipV; render();
  });

  // --- Join Blend: auto-detect nearest edges of 2 selected images and apply directional fades ---
  function joinBlend() {
    if (selection.length !== 2) return;
    saveState();
    const [a, b] = selection;

    // Find which edges are closest
    const aCX = a.x + a.w / 2, aCY = a.y + a.h / 2;
    const bCX = b.x + b.w / 2, bCY = b.y + b.h / 2;
    const dx = bCX - aCX, dy = bCY - aCY;

    // Determine primary axis and apply per-edge fades
    const fadeAmt = 20; // default fade percentage
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) {
        // B is right of A
        a.fadeRight = fadeAmt; b.fadeLeft = fadeAmt;
        const overlap = Math.round(Math.min(a.w, b.w) * 0.15);
        b.x = a.x + a.w - overlap;
      } else {
        // B is left of A
        a.fadeLeft = fadeAmt; b.fadeRight = fadeAmt;
        const overlap = Math.round(Math.min(a.w, b.w) * 0.15);
        b.x = a.x - b.w + overlap;
      }
      b.y = a.y + (a.h - b.h) / 2;
    } else {
      if (dy > 0) {
        // B is below A
        a.fadeBottom = fadeAmt; b.fadeTop = fadeAmt;
        const overlap = Math.round(Math.min(a.h, b.h) * 0.15);
        b.y = a.y + a.h - overlap;
      } else {
        // B is above A
        a.fadeTop = fadeAmt; b.fadeBottom = fadeAmt;
        const overlap = Math.round(Math.min(a.h, b.h) * 0.15);
        b.y = a.y - b.h + overlap;
      }
      b.x = a.x + (a.w - b.w) / 2;
    }

    // Apply join blend effect to the overlapping image
    const joinEffect = document.getElementById('coll-join-effect')?.value || 'source-over';
    b.blendMode = joinEffect;

    render();
  }

  let joinMode = false;
  document.getElementById('btn-coll-join')?.addEventListener('click', () => {
    joinMode = !joinMode;
    document.getElementById('btn-coll-join').classList.toggle('active', joinMode);
    // If turning on and already have 2 selected, apply immediately
    if (joinMode && selection.length === 2) joinBlend();
  });

  // --- Clear ---
  document.getElementById('btn-collage-clear')?.addEventListener('click', async () => {
    if (images.length) {
      const ok = await pixDialog.confirm('Clear Collage', `Remove all ${images.length} images from the collage?`, { danger: true, okText: 'Clear' });
      if (!ok) return;
    }
    images = []; selection = []; selected = null; snapGuides = [];
    updateCount(); render();
    canvas.style.display = 'none';
    document.getElementById('collage-drop').style.display = '';
  });

  // --- Align functions ---
  function getSelBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const o of selection) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
    }
    return { minX, minY, maxX, maxY };
  }

  document.getElementById('btn-align-left')?.addEventListener('click', () => {
    if (selection.length < 2) return; saveState();
    const target = Math.min(...selection.map(o => o.x));
    for (const o of selection) o.x = target;
    render();
  });
  document.getElementById('btn-align-right')?.addEventListener('click', () => {
    if (selection.length < 2) return; saveState();
    const target = Math.max(...selection.map(o => o.x + o.w));
    for (const o of selection) o.x = target - o.w;
    render();
  });
  document.getElementById('btn-align-top')?.addEventListener('click', () => {
    if (selection.length < 2) return; saveState();
    const target = Math.min(...selection.map(o => o.y));
    for (const o of selection) o.y = target;
    render();
  });
  document.getElementById('btn-align-bottom')?.addEventListener('click', () => {
    if (selection.length < 2) return; saveState();
    const target = Math.max(...selection.map(o => o.y + o.h));
    for (const o of selection) o.y = target - o.h;
    render();
  });
  document.getElementById('btn-align-center-h')?.addEventListener('click', () => {
    if (selection.length < 2) return; saveState();
    const avg = selection.reduce((s, o) => s + o.x + o.w / 2, 0) / selection.length;
    for (const o of selection) o.x = avg - o.w / 2;
    render();
  });
  document.getElementById('btn-align-center-v')?.addEventListener('click', () => {
    if (selection.length < 2) return; saveState();
    const avg = selection.reduce((s, o) => s + o.y + o.h / 2, 0) / selection.length;
    for (const o of selection) o.y = avg - o.h / 2;
    render();
  });
  document.getElementById('btn-distribute-h')?.addEventListener('click', () => {
    if (selection.length < 3) return; saveState();
    const sorted = [...selection].sort((a, b) => a.x - b.x);
    const totalW = sorted.reduce((s, o) => s + o.w, 0);
    const space = (sorted[sorted.length - 1].x + sorted[sorted.length - 1].w - sorted[0].x - totalW) / (sorted.length - 1);
    let x = sorted[0].x;
    for (const o of sorted) { o.x = x; x += o.w + space; }
    render();
  });
  document.getElementById('btn-distribute-v')?.addEventListener('click', () => {
    if (selection.length < 3) return; saveState();
    const sorted = [...selection].sort((a, b) => a.y - b.y);
    const totalH = sorted.reduce((s, o) => s + o.h, 0);
    const space = (sorted[sorted.length - 1].y + sorted[sorted.length - 1].h - sorted[0].y - totalH) / (sorted.length - 1);
    let y = sorted[0].y;
    for (const o of sorted) { o.y = y; y += o.h + space; }
    render();
  });
  document.getElementById('btn-center-canvas-h')?.addEventListener('click', () => {
    if (!selection.length) return; saveState();
    const b = getSelBounds();
    const dx = (canvas.width - (b.maxX - b.minX)) / 2 - b.minX;
    for (const o of selection) o.x += dx;
    render();
  });
  document.getElementById('btn-center-canvas-v')?.addEventListener('click', () => {
    if (!selection.length) return; saveState();
    const b = getSelBounds();
    const dy = (canvas.height - (b.maxY - b.minY)) / 2 - b.minY;
    for (const o of selection) o.y += dy;
    render();
  });

  // --- Export ---
  function getContentBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const o of images) {
      const bw = o.borderWidth || 0;
      minX = Math.min(minX, o.x - bw); minY = Math.min(minY, o.y - bw);
      maxX = Math.max(maxX, o.x + o.w + bw); maxY = Math.max(maxY, o.y + o.h + bw);
    }
    const pad = 10;
    return { x: Math.max(0, minX - pad), y: Math.max(0, minY - pad),
             w: Math.min(canvas.width, maxX + pad) - Math.max(0, minX - pad),
             h: Math.min(canvas.height, maxY + pad) - Math.max(0, minY - pad) };
  }

  document.getElementById('btn-collage-export')?.addEventListener('click', () => {
    if (!canvas.width || !images.length) return;
    const savedSel = selected; const savedSnap = snapGuides;
    selected = null; snapGuides = []; selection = []; render();

    const trim = document.getElementById('collage-trim-export')?.checked;
    const fmt = document.getElementById('collage-export-fmt')?.value || 'png';
    const mime = { png:'image/png', jpeg:'image/jpeg', webp:'image/webp' }[fmt] || 'image/png';
    const q = fmt === 'png' ? undefined : 0.92;

    if (trim) {
      // Export only the content area
      const b = getContentBounds();
      const trimCanvas = document.createElement('canvas');
      trimCanvas.width = b.w; trimCanvas.height = b.h;
      trimCanvas.getContext('2d').drawImage(canvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      trimCanvas.toBlob(blob => {
        chrome.runtime.sendMessage({ action:'download', url:URL.createObjectURL(blob), filename:`pixeroo/collage.${fmt==='jpeg'?'jpg':fmt}`, saveAs:true });
        selected = savedSel; snapGuides = savedSnap; selection = savedSel ? [savedSel] : []; render();
      }, mime, q);
    } else {
      canvas.toBlob(blob => {
        chrome.runtime.sendMessage({ action:'download', url:URL.createObjectURL(blob), filename:`pixeroo/collage.${fmt==='jpeg'?'jpg':fmt}`, saveAs:true });
        selected = savedSel; snapGuides = savedSnap; selection = savedSel ? [savedSel] : []; render();
      }, mime, q);
    }
  });

  // --- Save Project ---
  document.getElementById('btn-collage-save')?.addEventListener('click', () => {
    if (!images.length) return;
    const footer = document.getElementById('footer-status');
    if (footer) footer.textContent = 'Saving project...';

    const project = {
      version: 1,
      canvas: {
        w: canvas.width, h: canvas.height,
        bg: document.getElementById('collage-bg')?.value || '#ffffff',
        bg2: document.getElementById('collage-bg2')?.value || '#e2e8f0',
        bgType: document.getElementById('collage-bg-type')?.value || 'solid',
      },
      images: images.map(o => ({
        data: o.src.toDataURL('image/png'),
        x: o.x, y: o.y, w: o.w, h: o.h,
        borderWidth: o.borderWidth, borderColor: o.borderColor,
        shadowEnabled: o.shadowEnabled, shadowColor: o.shadowColor, shadowBlur: o.shadowBlur,
        cornerRadius: o.cornerRadius, imgFilter: o.imgFilter,
        opacity: o.opacity, blendMode: o.blendMode, fadeLeft: o.fadeLeft, fadeRight: o.fadeRight, fadeTop: o.fadeTop, fadeBottom: o.fadeBottom, edgeColor: o.edgeColor,
        isGroup: o.isGroup || false,
      })),
    };

    const json = JSON.stringify(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({ action: 'download', url, filename: 'pixeroo/collage-project.pixeroo', saveAs: true });
    if (footer) footer.textContent = `Project saved (${(json.length / 1024).toFixed(0)} KB)`;
  });

  // --- Load Project ---
  const loadBtn = document.getElementById('btn-collage-load');
  const loadInput = document.getElementById('collage-load-file');
  loadBtn?.addEventListener('click', () => loadInput?.click());
  loadInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadInput.value = '';
    const footer = document.getElementById('footer-status');
    if (footer) footer.textContent = 'Loading project...';

    try {
      const text = await file.text();
      const project = JSON.parse(text);
      if (!project.version || !project.images) throw new Error('Invalid project file');

      // Restore canvas
      const cw = project.canvas?.w || 1200, ch = project.canvas?.h || 800;
      document.getElementById('collage-w').value = cw;
      document.getElementById('collage-h').value = ch;
      if (project.canvas?.bg) document.getElementById('collage-bg').value = project.canvas.bg;
      if (project.canvas?.bg2) document.getElementById('collage-bg2').value = project.canvas.bg2;
      if (project.canvas?.bgType) document.getElementById('collage-bg-type').value = project.canvas.bgType;
      canvas.width = cw; canvas.height = ch;
      canvas.style.display = 'block';
      document.getElementById('collage-drop').style.display = 'none';

      // Restore images
      images = [];
      selection = []; selected = null;

      for (const imgData of project.images) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imgData.data;
        });
        const src = document.createElement('canvas');
        src.width = img.naturalWidth; src.height = img.naturalHeight;
        src.getContext('2d').drawImage(img, 0, 0);

        const obj = makeImgObj(src, imgData.x, imgData.y, imgData.w, imgData.h);
        obj.borderWidth = imgData.borderWidth || 0;
        obj.borderColor = imgData.borderColor || '#ffffff';
        obj.shadowEnabled = imgData.shadowEnabled || false;
        obj.shadowColor = imgData.shadowColor || '#000000';
        obj.shadowBlur = imgData.shadowBlur || 12;
        obj.cornerRadius = imgData.cornerRadius || 0;
        obj.imgFilter = imgData.imgFilter || 'none';
        obj.opacity = imgData.opacity !== undefined ? imgData.opacity : 1;
        obj.blendMode = imgData.blendMode || 'source-over';
        obj.fadeLeft = imgData.fadeLeft || 0; obj.fadeRight = imgData.fadeRight || 0;
        obj.fadeTop = imgData.fadeTop || 0; obj.fadeBottom = imgData.fadeBottom || 0;
        obj.edgeColor = imgData.edgeColor || '#000000';
        obj.isGroup = imgData.isGroup || false;
        images.push(obj);
      }

      updateCount(); render();
      if (footer) footer.textContent = `Project loaded: ${images.length} images`;
    } catch (err) {
      console.error('Load project failed:', err);
      if (footer) footer.textContent = 'Failed to load project file';
    }
  });

  // Initial ribbon state — all disabled until images added
  updateRibbonState();
}

function triggerDrop(dropId, inputId, file) {
  const dt = new DataTransfer(); dt.items.add(file);
  const input = document.getElementById(inputId);
  input.files = dt.files;
  input.dispatchEvent(new Event('change'));
}

// ============================================================
// Shared helpers
// ============================================================

// Shared: allow dropping a new image onto the work area to replace current (with confirmation)
function setupWorkAreaReplace(workAreaSelector, onReplace, opts = {}) {
  const area = typeof workAreaSelector === 'string' ? document.querySelector(workAreaSelector) : workAreaSelector;
  if (!area) return;
  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  area.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.preventDefault();
    const msg = opts.confirmMsg || 'Replace current image? Unsaved changes will be lost.';
    const ok = await pixDialog.confirm('Replace Image', msg, { okText: 'Replace' });
    if (!ok) return;
    onReplace(file);
  });
}

function setupDropzone(dropEl, fileInput, onFile, opts = {}) {
  dropEl.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const files = opts.multiple ? [...e.target.files] : [e.target.files[0]];
    files.filter(Boolean).forEach(onFile);
  });
  dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('dragover'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('dragover'));
  dropEl.addEventListener('drop', (e) => {
    e.preventDefault(); dropEl.classList.remove('dragover');
    const files = opts.multiple ? [...e.dataTransfer.files] : [e.dataTransfer.files[0]];
    files.filter(Boolean).forEach(onFile);
  });
}

async function loadImg(file) {
  // Use createImageBitmap with EXIF orientation correction (handles rotated phone photos)
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
    c.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
    const img = new Image(); img.src = c.toDataURL();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; });
    return img;
  } catch {}
  // Fallback for older browsers
  return new Promise(r => {
    const reader = new FileReader();
    reader.onload = (e) => { const img = new Image(); img.onload = () => r(img); img.onerror = () => r(null); img.src = e.target.result; };
    reader.readAsDataURL(file);
  });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatBytes(b) { if (b < 1024) return b+' B'; if (b < 1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function rgbHex(r,g,b) { return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function rgbHsl(r,g,b) { r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h,s,l=(mx+mn)/2;if(mx===mn){h=s=0}else{const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;}return`hsl(${Math.round(h*360)},${Math.round(s*100)}%,${Math.round(l*100)}%)`; }
function gcd(a,b){return b===0?a:gcd(b,a%b);}

// ============================================================
// MODE: Edit
// ============================================================

let editCanvas, editCtx, editOriginal, editFilename = 'edited';
const pipeline = new EditPipeline();
let editGuides = null; // CanvasGuides instance

function initEdit() {
  editCanvas = document.getElementById('editor-canvas');
  editCtx = editCanvas.getContext('2d', { willReadFrequently: true });

  setupDropzone(document.getElementById('edit-dropzone'), document.getElementById('edit-file'), async (file) => {
    editFilename = file.name.replace(/\.[^.]+$/, '');
    document.getElementById('file-label').textContent = file.name;
    const img = await loadImg(file);
    if (!img) return;
    editOriginal = img;
    // Non-destructive: load into pipeline, pipeline renders to display canvas
    pipeline.setDisplayCanvas(editCanvas);
    pipeline.loadImage(img);
    editCanvas.style.display = 'block'; document.getElementById('edit-ribbon')?.classList.remove('disabled');
    document.getElementById('edit-dropzone').style.display = 'none';
    updResize(); originalW = 0; originalH = 0; saveEdit();
    // Init guides overlay
    _initEditGuides();
  });

  // Drop-to-replace on work area
  setupWorkAreaReplace('#mode-edit .work-area', async (file) => {
    editFilename = file.name.replace(/\.[^.]+$/, '');
    document.getElementById('file-label').textContent = file.name;
    const img = await loadImg(file);
    if (!img) return;
    editOriginal = img;
    pipeline.setDisplayCanvas(editCanvas);
    pipeline.loadImage(img);
    editCanvas.style.display = 'block';
    document.getElementById('edit-ribbon')?.classList.remove('disabled');
    document.getElementById('edit-dropzone').style.display = 'none';
    updResize(); originalW = 0; originalH = 0; saveEdit();
    resetAdjustmentSliders();
    _initEditGuides();
  });

  // Reset All -- revert to original image
  document.getElementById('btn-reset-all')?.addEventListener('click', async () => {
    if (!editOriginal) return;
    const ok = await pixDialog.confirm('Reset Image', 'Reset all edits and revert to original image?', { danger: true, okText: 'Reset' });
    if (!ok) return;
    // Non-destructive reset: pipeline replays from original
    pipeline.resetAll();
    updResize();
       saveEdit();
    // Reset sliders
    resetAdjustmentSliders();
  });

  // Reset Adjustments -- remove adjust ops from pipeline, reset sliders
  document.getElementById('btn-reset-adjust')?.addEventListener('click', () => {
    resetAdjustmentSliders();
    pipeline.operations = pipeline.operations.filter(op => op.type !== 'adjust');
    pipeline.render();
    saveEdit();
  });

  function resetAdjustmentSliders() {
    ['brightness', 'contrast', 'saturation'].forEach(a => {
      document.getElementById(`adj-${a}`).value = 0;
      document.getElementById(`val-${a}`).textContent = '0';
    });
    document.getElementById('adj-hue').value = 0;
    document.getElementById('val-hue').textContent = '0';
  }

  document.addEventListener('paste', (e) => {
    if (currentMode !== 'edit') return;
    for (const item of (e.clipboardData?.items || [])) {
      if (item.type.startsWith('image/')) {
        loadImg(item.getAsFile()).then(img => {
          if (!img) return;
          editOriginal = img; editFilename = 'pasted';
          document.getElementById('file-label').textContent = 'Pasted image';
          pipeline.setDisplayCanvas(editCanvas);
          pipeline.loadImage(img);
          editCanvas.style.display = 'block'; document.getElementById('edit-ribbon')?.classList.remove('disabled');
          document.getElementById('edit-dropzone').style.display = 'none';
          updResize(); originalW = 0; originalH = 0; saveEdit();
          _initEditGuides();
        }); break;
      }
    }

    // Also handle paste in Convert mode
    if (currentMode === 'convert') {
      for (const item of (e.clipboardData?.items || [])) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          convertFiles.push(file);
          document.getElementById('convert-drop').style.display = 'none';
          document.getElementById('convert-preview').style.display = 'block';
          document.getElementById('convert-img').src = URL.createObjectURL(file);
          document.getElementById('convert-batch-info').textContent = file.name || 'Pasted image';
          document.getElementById('btn-convert-go').disabled = false;
          break;
        }
      }
    }
  });

  document.getElementById('btn-undo').addEventListener('click', editUndo);
  document.getElementById('btn-redo').addEventListener('click', editRedo);
  document.getElementById('btn-history')?.addEventListener('click', function() { _showHistoryPanel(this); });

  // Resize
  const rw = document.getElementById('resize-w'), rh = document.getElementById('resize-h'), lr = document.getElementById('lock-ratio');
  rw.addEventListener('input', () => { if (lr.checked && editCanvas.width) rh.value = Math.round(+rw.value * editCanvas.height / editCanvas.width) || ''; });
  rh.addEventListener('input', () => { if (lr.checked && editCanvas.height) rw.value = Math.round(+rh.value * editCanvas.width / editCanvas.height) || ''; });
  document.getElementById('btn-apply-resize').addEventListener('click', () => {
    const w = +rw.value, h = +rh.value;
    if (!w || !h || (w === editCanvas.width && h === editCanvas.height)) return;
    pipeline.setExportSize(w, h);
    updResize(); saveEdit();
  });

  // Transform (non-destructive via pipeline)
  document.getElementById('btn-rotate-left').addEventListener('click', () => { pipeline.addOperation({type:'rotate', degrees:-90}); updResize(); saveEdit(); });
  document.getElementById('btn-rotate-right').addEventListener('click', () => { pipeline.addOperation({type:'rotate', degrees:90}); updResize(); saveEdit(); });
  document.getElementById('btn-flip-h').addEventListener('click', () => { pipeline.addOperation({type:'flip', direction:'h'}); saveEdit(); });
  document.getElementById('btn-flip-v').addEventListener('click', () => { pipeline.addOperation({type:'flip', direction:'v'}); saveEdit(); });

  // Adjustments (non-destructive via pipeline)
  // Adjustments are live-preview: replace the last 'adjust' op on each slider move
  ['brightness','contrast','saturation','hue'].forEach(a => {
    const s = document.getElementById(`adj-${a}`), l = document.getElementById(`val-${a}`);
    s.addEventListener('input', () => {
      l.textContent = s.value;
      // Remove trailing adjust op if present (live update, not stacking)
      if (pipeline.operations.length && pipeline.operations[pipeline.operations.length - 1].type === 'adjust') {
        pipeline.operations.pop();
      }
      const b = +document.getElementById('adj-brightness').value;
      const c = +document.getElementById('adj-contrast').value;
      const sat = +document.getElementById('adj-saturation').value;
      const h = +document.getElementById('adj-hue').value;
      if (b || c || sat || h) {
        pipeline.operations.push({type:'adjust', brightness: b, contrast: c, saturation: sat, hue: h});
      }
      pipeline.undoneOps = [];
      pipeline.render();
    });
    s.addEventListener('change', saveEdit);
  });

  // Filters (non-destructive via pipeline)
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    if (!editOriginal) return;
    pipeline.addOperation({type:'filter', name: b.dataset.filter});
    saveEdit();
  }));

  // Interactive Crop (non-destructive via pipeline)
  Crop.init(editCanvas, editCtx, (x, y, w, h) => {
    // Convert absolute px to relative coords (0-1) for pipeline
    const cw = editCanvas.width, ch = editCanvas.height;
    pipeline.addOperation({type:'crop', x: x/cw, y: y/ch, w: w/cw, h: h/ch});
    updResize(); saveEdit();
  });

  const cropRatios = { 'btn-crop-free': null, 'btn-crop-1-1': 1, 'btn-crop-4-3': 4/3, 'btn-crop-16-9': 16/9, 'btn-crop-3-2': 3/2 };
  Object.entries(cropRatios).forEach(([id, ratio]) => {
    document.getElementById(id)?.addEventListener('click', () => {
      if (!editCanvas.width) return;
      Crop.start(document.getElementById('edit-work'), ratio);
      document.getElementById('btn-crop-apply').style.display = '';
      document.getElementById('btn-crop-cancel').style.display = '';
    });
  });

  // Smart crop (auto-detect best region)
  document.getElementById('btn-crop-auto')?.addEventListener('click', async () => {
    if (!editCanvas.width || typeof smartcrop === 'undefined') return;
    try {
      // Create an image from current canvas for smartcrop
      const blob = await new Promise(r => editCanvas.toBlob(r, 'image/png'));
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise(r => { img.onload = r; });

      // Find best square crop (most common use case)
      const size = Math.min(editCanvas.width, editCanvas.height);
      const result = await smartcrop.crop(img, { width: size, height: size });
      const c = result.topCrop;
      URL.revokeObjectURL(img.src);

      // Apply the smart crop via pipeline (relative coords)
      pipeline.addOperation({type:'crop', x: c.x/editCanvas.width, y: c.y/editCanvas.height, w: c.width/editCanvas.width, h: c.height/editCanvas.height});
      updResize(); saveEdit();
    } catch (e) {
      console.warn('Smart crop failed:', e);
    }
  });

  document.getElementById('btn-crop-apply')?.addEventListener('click', () => {
    Crop.apply();
    document.getElementById('btn-crop-apply').style.display = 'none';
    document.getElementById('btn-crop-cancel').style.display = 'none';
  });
  document.getElementById('btn-crop-cancel')?.addEventListener('click', () => {
    Crop.cancel();
    document.getElementById('btn-crop-apply').style.display = 'none';
    document.getElementById('btn-crop-cancel').style.display = 'none';
  });

  // Object-based Drawing (replaces stamp-based Annotate)
  const objLayer = new ObjectLayer(editCanvas, saveEdit);

  // Attach object layer when image loads (called from image load handlers)
  window._pixerooObjLayer = objLayer;

  const annTools = { 'btn-ann-rect': 'rect', 'btn-ann-arrow': 'arrow', 'btn-ann-text': 'text', 'btn-ann-pen': 'pen', 'btn-ann-highlighter': 'highlighter', 'btn-ann-redact': 'redact' };
  Object.entries(annTools).forEach(([id, tool]) => {
    document.getElementById(id)?.addEventListener('click', () => {
      if (!editCanvas.width) return;
      if (!objLayer.active) objLayer.attach(document.getElementById('edit-work'));
      objLayer.startTool(tool);
    });
  });

  document.getElementById('ann-color')?.addEventListener('input', (e) => {
    objLayer.color = e.target.value;
    if (objLayer.selected) { objLayer.selected.color = e.target.value; objLayer.render(); }
  });
  document.getElementById('ann-width')?.addEventListener('input', (e) => {
    objLayer.lineWidth = +e.target.value;
    if (objLayer.selected) { objLayer.selected.lineWidth = +e.target.value; objLayer.render(); }
  });
  document.getElementById('ann-fill')?.addEventListener('change', (e) => { objLayer.filled = e.target.checked; });
  document.getElementById('ann-font')?.addEventListener('change', (e) => {
    objLayer.fontFamily = e.target.value;
    // Apply to currently selected text object
    if (objLayer.selected?.type === 'text') { objLayer.selected.fontFamily = e.target.value; objLayer.render(); }
  });
  document.getElementById('ann-fontsize')?.addEventListener('change', (e) => {
    objLayer.fontSize = +e.target.value || 24;
    if (objLayer.selected?.type === 'text') { objLayer.selected.fontSize = +e.target.value || 24; objLayer.render(); }
  });

  // Mask filter tool
  document.getElementById('btn-mask-filter')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    if (!objLayer.active) objLayer.attach(document.getElementById('edit-work'));
    objLayer.maskFilter = 'blur'; // default mask filter
    objLayer.startTool('mask');
  });

  // Guides toggle buttons
  document.getElementById('btn-toggle-ruler')?.addEventListener('click', (e) => {
    if (!editGuides) return;
    editGuides.showRuler = !editGuides.showRuler;
    e.currentTarget.classList.toggle('active', editGuides.showRuler);
    editGuides.render();
  });
  document.getElementById('btn-toggle-grid')?.addEventListener('click', (e) => {
    if (!editGuides) return;
    editGuides.showGrid = !editGuides.showGrid;
    e.currentTarget.classList.toggle('active', editGuides.showGrid);
    editGuides.render();
  });
  document.getElementById('btn-toggle-center')?.addEventListener('click', (e) => {
    if (!editGuides) return;
    editGuides.showCenter = !editGuides.showCenter;
    e.currentTarget.classList.toggle('active', editGuides.showCenter);
    editGuides.render();
  });

  // Watermark
  document.getElementById('watermark-opacity')?.addEventListener('input', (e) => {
    document.getElementById('watermark-opacity-val').textContent = e.target.value;
  });
  // Watermark sliders
  document.getElementById('watermark-opacity')?.addEventListener('input', (e) => {
    const v = document.getElementById('watermark-opacity-val2'); if (v) v.textContent = e.target.value;
  });
  document.getElementById('watermark-fontsize')?.addEventListener('input', (e) => {
    const v = document.getElementById('watermark-fontsize-val'); if (v) v.textContent = e.target.value;
  });
  document.getElementById('watermark-angle')?.addEventListener('input', (e) => {
    const v = document.getElementById('watermark-angle-val'); if (v) v.textContent = e.target.value;
  });

  document.getElementById('btn-watermark')?.addEventListener('click', () => {
    const text = document.getElementById('watermark-text').value;
    if (!text || !editCanvas.width) return;
    pipeline.addOperation({type:'watermark', text, options: {
      opacity: +(document.getElementById('watermark-opacity')?.value || 30) / 100,
      fontSize: +(document.getElementById('watermark-fontsize')?.value || 48),
      angle: +(document.getElementById('watermark-angle')?.value || -30),
      color: document.getElementById('ann-color')?.value || '#ffffff',
    }});
    saveEdit();
  });

  // Effects (non-destructive via pipeline)
  document.getElementById('btn-vignette')?.addEventListener('click', () => { if (!editCanvas.width) return; pipeline.addOperation({type:'vignette'}); saveEdit(); });
  document.getElementById('btn-denoise')?.addEventListener('click', () => { if (!editCanvas.width) return; pipeline.addOperation({type:'denoise'}); saveEdit(); });
  document.getElementById('btn-round-corners')?.addEventListener('click', () => { if (!editCanvas.width) return; pipeline.addOperation({type:'roundCorners'}); saveEdit(); });
  document.getElementById('btn-border')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    const bw = +document.getElementById('border-width').value || 10;
    pipeline.addOperation({type:'border', width: bw, color: document.getElementById('border-color').value});
    updResize(); saveEdit();
  });
  document.getElementById('btn-tile')?.addEventListener('click', () => { if (!editCanvas.width) return; pipeline.addOperation({type:'tile', cols:2, rows:2}); updResize(); saveEdit(); });
  document.getElementById('btn-tile3')?.addEventListener('click', () => { if (!editCanvas.width) return; pipeline.addOperation({type:'tile', cols:3, rows:3}); updResize(); saveEdit(); });

  // Color blindness simulation (non-destructive via pipeline)
  document.querySelectorAll('[data-cb]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!editOriginal) return;
      pipeline.addOperation({type:'colorBlindness', mode: btn.dataset.cb});
      saveEdit();
    });
  });

  // CMYK simulation (non-destructive via pipeline)
  document.getElementById('btn-cmyk-sim')?.addEventListener('click', () => {
    if (!editOriginal) return;
    pipeline.addOperation({type:'cmyk'});
    saveEdit();
  });

  // Histogram
  function updateHistogram() {
    if (!editCanvas.width) return;
    try {
      const hist = computeHistogram(editCanvas);
      drawHistogram(document.getElementById('histogram-canvas'), hist);
    } catch {}
  }

  // Sprite slicer
  document.getElementById('btn-slice-sprite')?.addEventListener('click', async () => {
    if (!editCanvas.width) return;
    const cols = +document.getElementById('sprite-cols').value || 4;
    const rows = +document.getElementById('sprite-rows').value || 4;
    const tiles = sliceSpriteSheet(editCanvas, cols, rows);
    for (const tile of tiles) {
      const blob = await new Promise(r => tile.canvas.toBlob(r, 'image/png'));
      chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/sprite-${tile.row}-${tile.col}.png`, saveAs: false });
    }
  });

  // Steganography
  document.getElementById('btn-steg-detect')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    const result = detectSteganography(editCanvas);
    document.getElementById('steg-result').innerHTML = `<div>${esc(result.assessment)}</div><div>LSB ratio: ${result.lsbRatio}</div>`;
  });
  document.getElementById('btn-steg-visualize')?.addEventListener('click', () => {
    if (!editOriginal) return;
    pipeline.addOperation({type:'lsbVisualize'});
    saveEdit();
  });

  // Reverse image search
  document.querySelectorAll('[data-rsearch]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!editCanvas.width) return;
      openReverseImageSearch(editCanvas.toDataURL('image/png'), btn.dataset.rsearch);
    });
  });

  // Canvas: Padding
  document.getElementById('btn-padding')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    const p = +document.getElementById('pad-size')?.value || 20;
    const color = document.getElementById('pad-color')?.value || '#ffffff';
    pipeline.addOperation({type:'padding', top: p, right: p, bottom: p, left: p, color});
    updResize(); saveEdit();
  });

  // Canvas: Split
  document.getElementById('btn-split-h2')?.addEventListener('click', () => splitAndDownload('horizontal', 2));
  document.getElementById('btn-split-v2')?.addEventListener('click', () => splitAndDownload('vertical', 2));
  document.getElementById('btn-split-h3')?.addEventListener('click', () => splitAndDownload('horizontal', 3));
  document.getElementById('btn-split-v3')?.addEventListener('click', () => splitAndDownload('vertical', 3));

  async function splitAndDownload(dir, parts) {
    if (!editCanvas.width) return;
    const tiles = splitImage(editCanvas, dir, parts);
    for (let i = 0; i < tiles.length; i++) {
      const blob = await new Promise(r => tiles[i].toBlob(r, 'image/png'));
      chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/${editFilename}-${dir[0]}${i+1}.png`, saveAs: false });
    }
  }

  // Background remove



  // Color replace
  document.getElementById('btn-color-replace')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    const from = document.getElementById('color-from').value;
    const to = document.getElementById('color-to').value;
    const fr = parseInt(from.slice(1,3),16), fg = parseInt(from.slice(3,5),16), fb = parseInt(from.slice(5,7),16);
    const tr = parseInt(to.slice(1,3),16), tg = parseInt(to.slice(3,5),16), tb = parseInt(to.slice(5,7),16);
    replaceColor(editCanvas, fr, fg, fb, tr, tg, tb, 30);
    saveEdit();
  });

  // Channel separation (non-destructive via pipeline)
  document.querySelectorAll('[data-channel]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!editOriginal) return;
      pipeline.addOperation({type:'channel', channel: btn.dataset.channel});
      saveEdit();
    });
  });

  // Levels
  ['level-black', 'level-white', 'level-gamma'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      const val = id === 'level-gamma' ? (+e.target.value / 100).toFixed(1) : e.target.value;
      document.getElementById(id + '-val').textContent = val;
    });
  });
  document.getElementById('btn-apply-levels')?.addEventListener('click', () => {
    if (!editOriginal) return;
    pipeline.addOperation({type:'levels', black: +document.getElementById('level-black').value, white: +document.getElementById('level-white').value, gamma: +document.getElementById('level-gamma').value / 100});
    saveEdit();
  });

  // Pixelate art
  document.getElementById('btn-pixelate')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    pipeline.addOperation({type:'pixelate', blockSize: +document.getElementById('pixelate-size').value || 8});
    saveEdit();
  });

  // Favicon preview
  document.getElementById('btn-gen-favicons')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    const previews = generateFaviconPreviews(editCanvas);
    const container = document.getElementById('favicon-previews');
    container.innerHTML = '';
    previews.forEach(p => {
      const img = document.createElement('img');
      img.src = p.canvas.toDataURL();
      img.style.cssText = `width:${Math.min(p.size, 48)}px;height:${Math.min(p.size, 48)}px;border-radius:3px;border:1px solid var(--slate-700);`;
      img.title = `${p.size}x${p.size}`;
      container.appendChild(img);
    });
  });

  // ASCII art
  document.getElementById('btn-ascii')?.addEventListener('click', () => {
    if (!editCanvas.width) return;
    const cols = +document.getElementById('ascii-cols').value || 80;
    const art = imageToAscii(editCanvas, cols);
    const output = document.getElementById('ascii-output');
    output.textContent = art;
    output.style.display = 'block';
    output.classList.add('copyable');
  });

  // Generators
  // Generators with full options
  function showGenerated(canvas, name) {
    editCanvas.width = canvas.width; editCanvas.height = canvas.height;
    editCtx.drawImage(canvas, 0, 0);
    editCanvas.style.display = 'block'; document.getElementById('edit-ribbon')?.classList.remove('disabled');
    document.getElementById('edit-dropzone').style.display = 'none';
    editFilename = name; updResize(); saveEdit();
  }

  document.getElementById('btn-gen-gradient')?.addEventListener('click', () => {
    const w = +(document.getElementById('gen-w')?.value || document.getElementById('bar-w')?.value) || 800;
    const h = +(document.getElementById('gen-h')?.value || document.getElementById('bar-h')?.value) || 600;
    const type = document.getElementById('gen-grad-type').value;
    const c1 = document.getElementById('gen-grad-c1').value;
    const c2 = document.getElementById('gen-grad-c2').value;
    showGenerated(generateGradient(w, h, type, [{ pos: 0, color: c1 }, { pos: 1, color: c2 }]), 'gradient');
  });

  document.getElementById('btn-gen-pattern')?.addEventListener('click', () => {
    const w = +(document.getElementById('gen-w')?.value || document.getElementById('bar-w')?.value) || 800;
    const h = +(document.getElementById('gen-h')?.value || document.getElementById('bar-h')?.value) || 600;
    const type = document.getElementById('gen-pat-type').value;
    const c1 = document.getElementById('gen-pat-c1').value;
    const c2 = document.getElementById('gen-pat-c2').value;
    const cell = +document.getElementById('gen-pat-cell').value || 40;
    showGenerated(generatePattern(w, h, type, c1, c2, cell), 'pattern');
  });

  document.getElementById('btn-gen-placeholder')?.addEventListener('click', () => {
    const w = +(document.getElementById('gen-w')?.value || document.getElementById('bar-w')?.value) || 800;
    const h = +(document.getElementById('gen-h')?.value || document.getElementById('bar-h')?.value) || 600;
    const bg = document.getElementById('gen-ph-bg').value;
    const tc = document.getElementById('gen-ph-text-color').value;
    const text = document.getElementById('gen-ph-text').value || '';
    showGenerated(generatePlaceholder(w, h, bg, tc, text), 'placeholder');
  });

  // Strip metadata
  document.getElementById('btn-strip-meta')?.addEventListener('click', async () => {
    if (!editCanvas.width) return;
    const blob = await stripMetadata(editCanvas, 'png');
    chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/${editFilename}-clean.png`, saveAs: true });
  });

  // Image to PDF
  document.getElementById('btn-to-pdf')?.addEventListener('click', async () => {
    if (!editCanvas.width) return;
    const blob = await imageToPdf([editCanvas], 'pixeroo-export');
    chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/${editFilename}.pdf`, saveAs: true });
  });

  // Export
  document.getElementById('btn-export').addEventListener('click', editExport);

  // Export annotations as SVG overlay
  document.getElementById('btn-export-annotations-svg')?.addEventListener('click', () => {
    if (!window._pixerooObjLayer?.hasObjects()) return;
    const svg = window._pixerooObjLayer.exportAsSVG(editCanvas.width, editCanvas.height);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/${editFilename}-annotations.svg`, saveAs: true });
  });

  // --- Save/Load Edit Project ---
  document.getElementById('btn-edit-save')?.addEventListener('click', () => {
    if (!editOriginal) return;
    const footer = document.getElementById('footer-status');
    if (footer) footer.textContent = 'Saving project...';

    // Save original image as base64 + pipeline operations
    const tmpC = document.createElement('canvas');
    tmpC.width = editOriginal.naturalWidth || editOriginal.width;
    tmpC.height = editOriginal.naturalHeight || editOriginal.height;
    tmpC.getContext('2d').drawImage(editOriginal, 0, 0);

    const project = {
      version: 1,
      type: 'edit',
      original: tmpC.toDataURL('image/png'),
      filename: editFilename,
      exportWidth: pipeline.exportWidth,
      exportHeight: pipeline.exportHeight,
      operations: pipeline.operations,
    };

    const json = JSON.stringify(project);
    const blob = new Blob([json], { type: 'application/json' });
    chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/${editFilename}-project.pixeroo`, saveAs: true });
    if (footer) footer.textContent = `Project saved (${(json.length / 1024).toFixed(0)} KB)`;
  });

  const editLoadBtn = document.getElementById('btn-edit-load');
  const editLoadInput = document.getElementById('edit-load-file');
  editLoadBtn?.addEventListener('click', () => editLoadInput?.click());
  editLoadInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    editLoadInput.value = '';
    const footer = document.getElementById('footer-status');
    if (footer) footer.textContent = 'Loading project...';

    try {
      const text = await file.text();
      const project = JSON.parse(text);
      if (!project.version || !project.original) throw new Error('Invalid project');

      // Restore original image
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = project.original; });

      editOriginal = img;
      editFilename = project.filename || 'loaded';
      document.getElementById('file-label').textContent = editFilename;

      // Restore pipeline
      pipeline.setDisplayCanvas(editCanvas);
      pipeline.loadImage(img);
      if (project.exportWidth) pipeline.exportWidth = project.exportWidth;
      if (project.exportHeight) pipeline.exportHeight = project.exportHeight;
      pipeline.operations = project.operations || [];
      pipeline.undoneOps = [];
      pipeline.render();

      editCanvas.style.display = 'block';
      document.getElementById('edit-ribbon')?.classList.remove('disabled');
      document.getElementById('edit-dropzone').style.display = 'none';
      updResize(); originalW = 0; originalH = 0; saveEdit();
      _initEditGuides();

      if (footer) footer.textContent = `Project loaded: ${pipeline.operations.length} operations`;
    } catch (err) {
      console.error('Load project failed:', err);
      if (footer) footer.textContent = 'Failed to load project file';
    }
  });

  // --- Right-click context menu for Edit mode ---
  document.getElementById('edit-work')?.addEventListener('contextmenu', (e) => {
    if (!editCanvas.width) return;
    e.preventDefault();
    document.querySelectorAll('.ctx-menu').forEach(m => m.remove());

    const hasImage = !!editOriginal;
    const hasOps = pipeline.operations.length > 0;
    const hasUndone = pipeline.undoneOps.length > 0;
    const hasObjects = window._pixerooObjLayer?.hasObjects();
    const selObj = window._pixerooObjLayer?.selected;

    const items = [
      { label: 'Undo', shortcut: 'Ctrl+Z', enabled: hasOps, action: editUndo },
      { label: 'Redo', shortcut: 'Ctrl+Y', enabled: hasUndone, action: editRedo },
      { sep: true },
      { label: 'Reset All', enabled: hasOps, action: () => document.getElementById('btn-reset-all')?.click() },
      { label: 'Reset Adjustments', enabled: hasOps, action: () => document.getElementById('btn-reset-adjust')?.click() },
      { sep: true },
      { header: 'Quick Filters', enabled: hasImage },
      { label: 'Grayscale', enabled: hasImage, action: () => { pipeline.addOperation({type:'filter', name:'grayscale'}); saveEdit(); } },
      { label: 'Sepia', enabled: hasImage, action: () => { pipeline.addOperation({type:'filter', name:'sepia'}); saveEdit(); } },
      { label: 'Invert', enabled: hasImage, action: () => { pipeline.addOperation({type:'filter', name:'invert'}); saveEdit(); } },
      { label: 'Sharpen', enabled: hasImage, action: () => { pipeline.addOperation({type:'filter', name:'sharpen'}); saveEdit(); } },
      { sep: true },
      { header: 'Transform', enabled: hasImage },
      { label: 'Rotate Left 90°', enabled: hasImage, action: () => { pipeline.addOperation({type:'rotate', degrees:-90}); updResize(); saveEdit(); } },
      { label: 'Rotate Right 90°', enabled: hasImage, action: () => { pipeline.addOperation({type:'rotate', degrees:90}); updResize(); saveEdit(); } },
      { label: 'Flip Horizontal', enabled: hasImage, action: () => { pipeline.addOperation({type:'flip', direction:'h'}); saveEdit(); } },
      { label: 'Flip Vertical', enabled: hasImage, action: () => { pipeline.addOperation({type:'flip', direction:'v'}); saveEdit(); } },
      { sep: true },
      { label: 'Copy Image', enabled: hasImage, action: () => {
        editCanvas.toBlob(blob => { navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); });
      }},
      { label: 'Export', shortcut: 'Ctrl+S', enabled: hasImage, action: editExport },
      { sep: true },
      { header: 'Annotations', enabled: hasObjects },
      { label: 'Flatten Annotations', enabled: hasObjects, action: () => { window._pixerooObjLayer.flatten(); saveEdit(); } },
      { label: 'Delete Selected', enabled: !!selObj, action: () => { window._pixerooObjLayer.deleteSelected(); window._pixerooObjLayer.render(); } },
      { label: 'Export as SVG', enabled: hasObjects, action: () => document.getElementById('btn-export-annotations-svg')?.click() },
    ];

    // Reuse the same menu builder from collage
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    let lastWasSep = true;
    for (const item of items) {
      if (item.sep) { if (!lastWasSep) { const s = document.createElement('div'); s.className = 'ctx-menu-sep'; menu.appendChild(s); lastWasSep = true; } continue; }
      if (item.header) { if (item.enabled === false) continue; const h = document.createElement('div'); h.className = 'ctx-menu-header'; h.textContent = item.header; menu.appendChild(h); lastWasSep = false; continue; }
      if (!item.enabled) continue;
      const el = document.createElement('div');
      el.className = 'ctx-menu-item' + (item.danger ? ' danger' : '');
      el.innerHTML = `${item.label}${item.shortcut ? `<span class="ctx-menu-shortcut">${item.shortcut}</span>` : ''}`;
      el.addEventListener('click', () => { menu.remove(); item.action(); });
      menu.appendChild(el);
      lastWasSep = false;
    }
    if (menu.lastChild?.classList?.contains('ctx-menu-sep')) menu.lastChild.remove();

    menu.style.left = e.clientX + 'px'; menu.style.top = e.clientY + 'px';
    document.body.appendChild(menu);
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 4) + 'px';
      if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 4) + 'px';
    });
    setTimeout(() => {
      const close = (ev) => {
        if (ev.type === 'keydown' && ev.key !== 'Escape') return;
        if (ev.type === 'mousedown' && menu.contains(ev.target)) return;
        menu.remove(); document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close);
      };
      document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    }, 50);
  });

  // --- Persistent Info Bar ---
  initInfoBar();
}

function updResize() { document.getElementById('resize-w').value = editCanvas.width; document.getElementById('resize-h').value = editCanvas.height; }
function saveEdit() {
  // Pipeline handles state -- just update UI indicators
  try { const h = computeHistogram(editCanvas); drawHistogram(document.getElementById('histogram-canvas'), h); } catch {}
  updateDimensionBadge();
  updateInfoBar();
  pulseExportButton();
  if (editGuides) editGuides.update();
  _updateHistoryBadge();

  // Show last operation in footer with undo hint
  const footer = document.getElementById('footer-status');
  if (footer && pipeline.operations.length) {
    const last = pipeline.operations[pipeline.operations.length - 1];
    const labels = { rotate:'Rotated', flip:'Flipped', crop:'Cropped', adjust:'Adjusted', filter:'Filter', vignette:'Vignette', denoise:'Denoised', pixelate:'Pixelated', roundCorners:'Rounded', watermark:'Watermark', border:'Border', padding:'Padded', tile:'Tiled', colorBlindness:'CB Sim', cmyk:'CMYK', channel:'Channel', levels:'Levels', lsbVisualize:'LSB' };
    const sizeChanged = ['crop','border','tile','rotate','padding'].includes(last.type);
    footer.textContent = `${labels[last.type] || last.type} | ${editCanvas.width}\u00d7${editCanvas.height} | ${pipeline.operations.length} ops${sizeChanged ? ' | Ctrl+Z to undo' : ''}`;
  }
}

// --- History Panel ---
const _historyOpLabels = {
  rotate:'Rotate', flip:'Flip', crop:'Crop', adjust:'Adjust', filter:'Filter',
  vignette:'Vignette', denoise:'Denoise', pixelate:'Pixelate', roundCorners:'Round Corners',
  watermark:'Watermark', border:'Border', tile:'Tile', colorBlindness:'Color Blind Sim',
  cmyk:'CMYK Sim', channel:'Channel', levels:'Levels', lsbVisualize:'LSB Visualize',
};

function _updateHistoryBadge() {
  const badge = document.getElementById('history-count');
  if (!badge) return;
  const n = pipeline.operations.length;
  if (n > 0) { badge.style.display = ''; badge.textContent = n; }
  else { badge.style.display = 'none'; }
}

function _showHistoryPanel(anchorBtn) {
  // Close existing
  document.querySelectorAll('.history-panel').forEach(p => p.remove());

  const panel = document.createElement('div');
  panel.className = 'history-panel';

  // Original state
  const origin = document.createElement('div');
  origin.className = 'history-origin';
  origin.textContent = 'Original Image';
  origin.addEventListener('click', () => {
    pipeline.operations = [];
    pipeline.undoneOps = [];
    pipeline.render();
    updResize(); saveEdit();
    panel.remove();
  });
  panel.appendChild(origin);

  // Each operation
  pipeline.operations.forEach((op, i) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    if (i === pipeline.operations.length - 1) item.classList.add('active');

    const label = _historyOpLabels[op.type] || op.type;
    let detail = '';
    if (op.type === 'rotate') detail = op.degrees + '°';
    else if (op.type === 'flip') detail = op.direction === 'h' ? 'Horizontal' : 'Vertical';
    else if (op.type === 'filter') detail = op.name;
    else if (op.type === 'adjust') detail = `B${op.brightness} C${op.contrast}`;
    else if (op.type === 'crop') detail = `${Math.round(op.w*100)}%x${Math.round(op.h*100)}%`;

    item.innerHTML = `<span class="hi-num">${i + 1}</span><span class="hi-label">${label}${detail ? ' — ' + detail : ''}</span>`;

    // Click to revert to this step
    item.addEventListener('click', () => {
      // Keep operations 0..i, move rest to undone
      const removed = pipeline.operations.splice(i + 1);
      pipeline.undoneOps = removed.reverse().concat(pipeline.undoneOps);
      pipeline.render();
      updResize(); saveEdit();
      panel.remove();
    });

    panel.appendChild(item);
  });

  // Undone ops (grayed out)
  pipeline.undoneOps.slice().reverse().forEach((op, i) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.style.opacity = '0.35';
    const label = _historyOpLabels[op.type] || op.type;
    item.innerHTML = `<span class="hi-num" style="text-decoration:line-through;">${pipeline.operations.length + i + 1}</span><span class="hi-label">${label} (undone)</span>`;
    item.addEventListener('click', () => {
      // Redo up to this point
      for (let j = 0; j <= i; j++) {
        if (pipeline.undoneOps.length) pipeline.operations.push(pipeline.undoneOps.pop());
      }
      pipeline.render();
      updResize(); saveEdit();
      panel.remove();
    });
    panel.appendChild(item);
  });

  if (pipeline.operations.length === 0 && pipeline.undoneOps.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:10px;text-align:center;color:var(--slate-500);';
    empty.textContent = 'No operations yet';
    panel.appendChild(empty);
  }

  // Position below the button
  const rect = anchorBtn.getBoundingClientRect();
  panel.style.top = (rect.bottom + 4) + 'px';
  panel.style.left = Math.max(8, rect.left - 100) + 'px';
  document.body.appendChild(panel);

  // Close on click outside
  function close(e) {
    if (panel.contains(e.target) || e.target === anchorBtn) return;
    panel.remove();
    document.removeEventListener('mousedown', close);
    document.removeEventListener('keydown', closeKey);
  }
  function closeKey(e) { if (e.key === 'Escape') { panel.remove(); document.removeEventListener('mousedown', close); document.removeEventListener('keydown', closeKey); } }
  setTimeout(() => {
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeKey);
  }, 50);
}

function _initEditGuides() {
  const work = document.getElementById('edit-work');
  if (!work || !editCanvas) return;
  if (editGuides) editGuides.destroy();
  editGuides = new CanvasGuides(work, editCanvas, { showRuler: true, showGrid: true, showCenter: false });
  editGuides.show();

  // Reposition on window resize
  if (!window._guidesResizeWired) {
    window._guidesResizeWired = true;
    window.addEventListener('resize', () => { if (editGuides) editGuides.update(); });
  }
}

// Stepped downscale for sharp resizing (halves until close, then final)
function steppedResize(source, targetW, targetH) {
  let current = source;
  let cw = source.width, ch = source.height;

  while (cw / 2 > targetW || ch / 2 > targetH) {
    const halfW = Math.max(Math.floor(cw / 2), targetW);
    const halfH = Math.max(Math.floor(ch / 2), targetH);
    const step = document.createElement('canvas');
    step.width = halfW; step.height = halfH;
    const sc = step.getContext('2d');
    sc.imageSmoothingEnabled = true;
    sc.imageSmoothingQuality = 'high';
    sc.drawImage(current, 0, 0, halfW, halfH);
    current = step; cw = halfW; ch = halfH;
  }

  // Final step to exact target
  const result = document.createElement('canvas');
  result.width = targetW; result.height = targetH;
  const rc = result.getContext('2d');
  rc.imageSmoothingEnabled = true;
  rc.imageSmoothingQuality = 'high';
  rc.drawImage(current, 0, 0, targetW, targetH);
  return result;
}

function updateDimensionBadge() {
  const badge = document.getElementById('dimension-badge');
  if (!badge || !editCanvas.width) return;
  badge.style.display = 'block';
  badge.textContent = `${editCanvas.width} x ${editCanvas.height}`;
}

let pulseTimeout = null;
function pulseExportButton() {
  const btn = document.getElementById('btn-export');
  if (!btn) return;
  btn.classList.remove('export-pulse');
  clearTimeout(pulseTimeout);
  pulseTimeout = setTimeout(() => btn.classList.add('export-pulse'), 50);
}
function editUndo() { pipeline.undo(); updResize(); saveEdit(); }

// ============================================================
// Persistent Info Bar
// ============================================================

let barUnitPx = true;
let barLocked = true;
let originalW = 0, originalH = 0;

function initInfoBar() {
  const barW = document.getElementById('bar-w');
  const barH = document.getElementById('bar-h');
  const barUnit = document.getElementById('bar-unit');
  const barLock = document.getElementById('bar-lock');
  const barApply = document.getElementById('bar-apply');

  // Toggle px / %
  barUnit?.addEventListener('click', () => {
    barUnitPx = !barUnitPx;
    barUnit.textContent = barUnitPx ? 'px' : '%';
    barUnit.classList.toggle('active', barUnitPx);
    updateInfoBar();
  });

  // Toggle lock
  barLock?.addEventListener('click', () => {
    barLocked = !barLocked;
    barLock.classList.toggle('locked', barLocked);
  });

  // W input changes H if locked
  barW?.addEventListener('input', () => {
    if (!barLocked || !originalW) return;
    const ratio = originalH / originalW;
    if (barUnitPx) {
      barH.value = Math.round(+barW.value * ratio);
    } else {
      barH.value = barW.value; // same percentage
    }
  });

  // H input changes W if locked
  barH?.addEventListener('input', () => {
    if (!barLocked || !originalH) return;
    const ratio = originalW / originalH;
    if (barUnitPx) {
      barW.value = Math.round(+barH.value * ratio);
    } else {
      barW.value = barH.value;
    }
  });

  // Apply resize on button click or Enter key
  function applyBarResize() {
    if (!editCanvas.width) return;
    let newW, newH;
    if (barUnitPx) {
      newW = +barW.value; newH = +barH.value;
    } else {
      newW = Math.round(originalW * +barW.value / 100);
      newH = Math.round(originalH * +barH.value / 100);
    }
    if (!newW || !newH || newW < 1 || newH < 1) return;
    if (newW === editCanvas.width && newH === editCanvas.height) return;

    // Non-destructive: pipeline resize renders from original at target size
    pipeline.setExportSize(newW, newH);
    updResize(); saveEdit();
  }

  barApply?.addEventListener('click', applyBarResize);
  barW?.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyBarResize(); });
  barH?.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyBarResize(); });

  // Fit / 1:1 buttons
  document.getElementById('bar-fit')?.addEventListener('click', () => {
    if (editCanvas) editCanvas.style.maxWidth = '90%';
  });
  document.getElementById('bar-actual')?.addEventListener('click', () => {
    if (editCanvas) editCanvas.style.maxWidth = 'none';
  });

  // Set defaults
  if (barW) barW.value = 800;
  if (barH) barH.value = 600;
}

function updateInfoBar() {
  const bar = document.getElementById('edit-info-bar');
  if (!bar) return;

  // Track original dimensions (set once on first load)
  if (editCanvas.width && !originalW) { originalW = editCanvas.width; originalH = editCanvas.height; }

  const barW = document.getElementById('bar-w');
  const barH = document.getElementById('bar-h');

  if (barUnitPx) {
    barW.value = editCanvas.width;
    barH.value = editCanvas.height;
  } else {
    barW.value = originalW ? Math.round(editCanvas.width / originalW * 100) : 100;
    barH.value = originalH ? Math.round(editCanvas.height / originalH * 100) : 100;
  }

  // Estimate file size
  const pixels = editCanvas.width * editCanvas.height;
  const estPng = Math.round(pixels * 1.5 / 1024); // rough PNG estimate
  const sizeEl = document.getElementById('bar-size');
  if (sizeEl) sizeEl.textContent = `~${estPng > 1024 ? (estPng/1024).toFixed(1) + 'MB' : estPng + 'KB'} PNG`;

  // Zoom level
  const rect = editCanvas.getBoundingClientRect();
  const zoom = Math.round(rect.width / editCanvas.width * 100);
  const zoomEl = document.getElementById('bar-zoom');
  if (zoomEl) zoomEl.textContent = zoom + '%';
}
function editRedo() { pipeline.redo(); updResize(); saveEdit(); }

// editRotate and editFlip removed — now handled by pipeline.addOperation()

// applyAdj removed — now handled by pipeline.addOperation({type:'adjust'})

function editExport() {
  if (!editCanvas.width) return;
  // Flatten any drawn objects into the canvas before export
  if (window._pixerooObjLayer?.hasObjects()) window._pixerooObjLayer.flatten();
  const fmt = document.getElementById('export-format').value;

  // SVG trace export
  if (fmt === 'svg') {
    const svg = PixTrace.traceCanvas(editCanvas, 'default');
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/${editFilename}.svg`, saveAs: true });
    return;
  }

  const mime = {png:'image/png',jpeg:'image/jpeg',webp:'image/webp',bmp:'image/bmp'}[fmt] || 'image/png';
  const q = ['jpeg','webp'].includes(fmt) ? +(document.getElementById('export-quality')?.value || 85) / 100 : undefined;
  editCanvas.toBlob(blob => {
    chrome.runtime.sendMessage({ action:'download', url: URL.createObjectURL(blob), filename:`pixeroo/${editFilename}.${fmt==='jpeg'?'jpg':fmt}`, saveAs:true });
  }, mime, q);
}

// Show/hide quality slider based on format
document.getElementById('export-format')?.addEventListener('change', (e) => {
  const row = document.getElementById('export-quality-row');
  if (row) row.style.display = ['jpeg','webp'].includes(e.target.value) ? 'flex' : 'none';
});
document.getElementById('export-quality')?.addEventListener('input', (e) => {
  const v = document.getElementById('export-quality-val'); if (v) v.textContent = e.target.value;
});

// ============================================================
// MODE: Convert
// ============================================================

let convertFiles = [];

function initConvert() {
  setupDropzone(document.getElementById('convert-drop'), document.getElementById('convert-file'), (file) => {
    convertFiles.push(file);
    document.getElementById('convert-drop').style.display = 'none';
    document.getElementById('convert-preview').style.display = 'block';
    document.getElementById('convert-img').src = URL.createObjectURL(file);
    document.getElementById('convert-batch-info').textContent = convertFiles.length > 1 ? `${convertFiles.length} files` : file.name;
    document.getElementById('btn-convert-go').disabled = false;
  }, { multiple: true });

  document.querySelectorAll('#convert-formats .format-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#convert-formats .format-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('convert-quality-section').style.display = ['jpeg','webp','avif'].includes(b.dataset.fmt) ? 'block' : 'none';
  }));
  document.getElementById('convert-quality').addEventListener('input', e => { document.getElementById('convert-quality-val').textContent = e.target.value; });

  document.getElementById('btn-convert-go').addEventListener('click', async () => {
    const fmt = document.querySelector('#convert-formats .format-btn.active')?.dataset.fmt || 'png';
    const mime = {png:'image/png',jpeg:'image/jpeg',webp:'image/webp',bmp:'image/bmp'}[fmt] || 'image/png';
    const q = ['jpeg','webp'].includes(fmt) ? +document.getElementById('convert-quality').value / 100 : undefined;
    const batchW = +document.getElementById('batch-resize-w').value || 0;
    const batchH = +document.getElementById('batch-resize-h').value || 0;
    const batchLock = document.getElementById('batch-resize-lock').checked;

    for (const file of convertFiles) {
      const img = await loadImg(file); if (!img) continue;
      let w = img.naturalWidth, h = img.naturalHeight;

      // Apply batch resize if specified
      if (batchW > 0 || batchH > 0) {
        if (batchW > 0 && batchH > 0 && !batchLock) {
          w = batchW; h = batchH;
        } else if (batchW > 0) {
          const ratio = img.naturalHeight / img.naturalWidth;
          w = batchW; h = batchLock ? Math.round(batchW * ratio) : (batchH || Math.round(batchW * ratio));
        } else if (batchH > 0) {
          const ratio = img.naturalWidth / img.naturalHeight;
          h = batchH; w = batchLock ? Math.round(batchH * ratio) : (batchW || Math.round(batchH * ratio));
        }
      }

      const srcC = document.createElement('canvas'); srcC.width = img.naturalWidth; srcC.height = img.naturalHeight;
      srcC.getContext('2d').drawImage(img, 0, 0);
      const c = (w !== img.naturalWidth || h !== img.naturalHeight) ? steppedResize(srcC, w, h) : srcC;
      const blob = await new Promise(r => c.toBlob(r, mime, q));
      chrome.runtime.sendMessage({ action:'download', url: URL.createObjectURL(blob), filename:`pixeroo/${file.name.replace(/\.[^.]+$/,'')}.${fmt==='jpeg'?'jpg':fmt}`, saveAs: convertFiles.length === 1 });
    }
  });

  // Compression preview: show sizes for first loaded file
  async function showCompressionPreview(file) {
    const img = await loadImg(file);
    if (!img) return;
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);

    const el = document.getElementById('compression-preview');
    el.innerHTML = '<span style="color:var(--slate-500);">Calculating...</span>';

    const results = await getCompressionSizes(c, [
      { format: 'PNG', mime: 'image/png', qualities: [100] },
      { format: 'JPEG', mime: 'image/jpeg', qualities: [50, 75, 85, 95] },
      { format: 'WebP', mime: 'image/webp', qualities: [50, 75, 85, 95] },
    ]);

    el.innerHTML = results.map(r =>
      `<div style="display:flex;justify-content:space-between;padding:2px 0;color:var(--slate-400);"><span>${r.format}${r.quality < 100 ? ' ' + r.quality + '%' : ''}</span><span style="color:var(--slate-200);font-weight:500;">${r.sizeStr}</span></div>`
    ).join('');
  }

  // Trigger compression preview on first file load
  const origSetup = document.getElementById('convert-file');
  origSetup.addEventListener('change', () => {
    if (origSetup.files[0]) showCompressionPreview(origSetup.files[0]);
  });
}

// ============================================================
// MODE: Store Assets
// ============================================================

const STORE_SPECS = {
  play: [
    { name: 'App Icon', w: 512, h: 512, type: 'icon' },
    { name: 'Feature Graphic', w: 1024, h: 500, type: 'promo' },
    { name: 'TV Banner', w: 1280, h: 720, type: 'promo' },
    { name: 'Hi-res Icon', w: 512, h: 512, type: 'icon', noAlpha: true },
  ],
  apple: [
    { name: 'App Icon', w: 1024, h: 1024, type: 'icon', noAlpha: true },
    { name: 'iPhone 6.7"', w: 1290, h: 2796, type: 'screenshot' },
    { name: 'iPhone 6.5"', w: 1284, h: 2778, type: 'screenshot' },
    { name: 'iPhone 5.5"', w: 1242, h: 2208, type: 'screenshot' },
    { name: 'iPad 12.9"', w: 2048, h: 2732, type: 'screenshot' },
    { name: 'iPad 11"', w: 1668, h: 2388, type: 'screenshot' },
  ],
  chrome: [
    { name: 'Extension Icon', w: 128, h: 128, type: 'icon' },
    { name: 'Small Promo', w: 440, h: 280, type: 'promo' },
    { name: 'Large Promo', w: 920, h: 680, type: 'promo' },
    { name: 'Marquee', w: 1400, h: 560, type: 'promo' },
    { name: 'Screenshot', w: 1280, h: 800, type: 'screenshot' },
  ],
  edge: [
    { name: 'Extension Icon', w: 300, h: 300, type: 'icon' },
    { name: 'Screenshot', w: 1280, h: 800, type: 'screenshot' },
  ],
  firefox: [
    { name: 'Extension Icon', w: 128, h: 128, type: 'icon' },
    { name: 'Screenshot', w: 1280, h: 800, type: 'screenshot' },
  ],
  ms: [
    { name: 'Store Logo', w: 300, h: 300, type: 'icon' },
    { name: 'Hero Image', w: 1920, h: 1080, type: 'promo' },
    { name: 'Screenshot', w: 1366, h: 768, type: 'screenshot' },
  ],
};

let storeIconImg = null, storeScreenImg = null, storeGenerated = {};

function initStore() {
  // Store nav
  document.querySelectorAll('.store-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.store-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderStoreAssets(item.dataset.store);
    });
  });

  setupDropzone(document.getElementById('store-icon-drop'), document.getElementById('store-icon-file'), async (file) => {
    storeIconImg = await loadImg(file);
    if (!storeIconImg) return;
    document.getElementById('store-icon-preview').style.display = 'block';
    const c = document.getElementById('store-icon-canvas'); c.width = 128; c.height = 128;
    c.getContext('2d').drawImage(storeIconImg, 0, 0, 128, 128);
    document.getElementById('btn-store-generate').disabled = false;
    validateStoreIcon();
  });

  setupDropzone(document.getElementById('store-screenshot-drop'), document.getElementById('store-screenshot-file'), async (file) => {
    storeScreenImg = await loadImg(file);
  });

  document.getElementById('btn-store-generate').addEventListener('click', generateStoreAssets);
  document.getElementById('btn-store-export').addEventListener('click', exportStoreZip);

  updateStoreCounts();
}

function validateStoreIcon() {
  const el = document.getElementById('store-validation');
  if (!storeIconImg) { el.textContent = 'Upload source icon'; return; }
  const warnings = [];
  if (storeIconImg.naturalWidth < 1024 || storeIconImg.naturalHeight < 1024) warnings.push('Icon should be at least 1024x1024 for best quality');
  if (storeIconImg.naturalWidth !== storeIconImg.naturalHeight) warnings.push('Icon should be square');
  el.innerHTML = warnings.length ? warnings.map(w => `<div style="color:#fbbf24;margin-bottom:2px;">${esc(w)}</div>`).join('') : '<div style="color:#22c55e;">Icon looks good</div>';
}

function updateStoreCounts() {
  let total = 0;
  for (const [store, specs] of Object.entries(STORE_SPECS)) {
    const count = specs.length;
    total += count;
    const el = document.getElementById(`store-count-${store}`);
    if (el) el.textContent = count;
  }
  document.getElementById('store-count-all').textContent = total;
}

async function generateStoreAssets() {
  if (!storeIconImg) return;
  storeGenerated = {};
  const bg = document.getElementById('store-bg-color').value;
  const radius = +document.getElementById('store-corner-radius').value;

  for (const [store, specs] of Object.entries(STORE_SPECS)) {
    storeGenerated[store] = [];
    for (const spec of specs) {
      const canvas = document.createElement('canvas');
      canvas.width = spec.w; canvas.height = spec.h;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, spec.w, spec.h);

      if (spec.type === 'icon') {
        // Draw icon centered, fitting the canvas
        const size = Math.min(spec.w, spec.h);
        const x = (spec.w - size) / 2, y = (spec.h - size) / 2;

        if (radius > 0) {
          roundRect(ctx, x, y, size, size, radius * size / 100);
          ctx.clip();
        }

        ctx.drawImage(storeIconImg, x, y, size, size);

        if (spec.noAlpha) {
          // Flatten alpha onto background
          const tmp = document.createElement('canvas'); tmp.width = spec.w; tmp.height = spec.h;
          const tc = tmp.getContext('2d');
          tc.fillStyle = bg; tc.fillRect(0, 0, spec.w, spec.h);
          tc.drawImage(canvas, 0, 0);
          ctx.clearRect(0, 0, spec.w, spec.h);
          ctx.drawImage(tmp, 0, 0);
        }
      } else if (spec.type === 'promo' || spec.type === 'screenshot') {
        const src = spec.type === 'screenshot' && storeScreenImg ? storeScreenImg : storeIconImg;
        // Center the source image, fit within dimensions
        const scale = Math.min(spec.w / src.naturalWidth, spec.h / src.naturalHeight, 1);
        const sw = src.naturalWidth * scale, sh = src.naturalHeight * scale;
        ctx.drawImage(src, (spec.w - sw) / 2, (spec.h - sh) / 2, sw, sh);
      }

      storeGenerated[store].push({ spec, canvas });
    }
  }

  document.getElementById('btn-store-export').disabled = false;
  renderStoreAssets(document.querySelector('.store-nav-item.active')?.dataset.store || 'all');
}

function renderStoreAssets(filter) {
  const grid = document.getElementById('store-assets');
  grid.innerHTML = '';

  const stores = filter === 'all' ? Object.keys(STORE_SPECS) : [filter];

  for (const store of stores) {
    const items = storeGenerated[store] || [];
    const specs = STORE_SPECS[store] || [];

    if (filter === 'all' && specs.length) {
      const header = document.createElement('div');
      header.style.cssText = 'grid-column:1/-1;font-weight:600;color:var(--slate-400);text-transform:uppercase;padding-top:0.5rem;';
      header.textContent = { play:'Google Play', apple:'Apple App Store', chrome:'Chrome Web Store', edge:'Edge Add-ons', firefox:'Firefox Add-ons', ms:'Microsoft Store' }[store];
      grid.appendChild(header);
    }

    specs.forEach((spec, idx) => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      const item = items[idx];
      const hasAsset = !!item;

      card.innerHTML = `
        <div class="asset-card-preview">${hasAsset ? '' : '<div style="color:var(--slate-500);">Not generated</div>'}</div>
        <div class="asset-card-label">
          <div class="asset-card-name"><span class="asset-status ${hasAsset ? 'ready' : 'pending'}"></span>${esc(spec.name)}</div>
          <div class="asset-card-dims">${spec.w} x ${spec.h}</div>
        </div>
      `;

      if (hasAsset) {
        const preview = card.querySelector('.asset-card-preview');
        const img = document.createElement('img');
        img.src = item.canvas.toDataURL('image/png');
        preview.appendChild(img);

        // Click to download individual asset
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          item.canvas.toBlob(blob => {
            const name = `${store}-${spec.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${spec.w}x${spec.h}.png`;
            chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/store-assets/${name}`, saveAs: true });
          });
        });
      }

      grid.appendChild(card);
    });
  }

  if (!grid.children.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--slate-500);">Upload a source icon and click Generate</div>';
  }
}

async function exportStoreZip() {
  // Download all assets individually (ZIP requires JSZip - future)
  for (const [store, items] of Object.entries(storeGenerated)) {
    for (const item of items) {
      const name = `${store}-${item.spec.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${item.spec.w}x${item.spec.h}.png`;
      const blob = await new Promise(r => item.canvas.toBlob(r));
      chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/store-assets/${name}`, saveAs: false });
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ============================================================
// MODE: Info
// ============================================================

function initInfo() {
  setupDropzone(document.getElementById('info-drop'), document.getElementById('info-file'), async (file) => {
    document.getElementById('info-drop').style.display = 'none';
    document.getElementById('info-preview').style.display = 'block';
    document.getElementById('info-img').src = URL.createObjectURL(file);
    const grid = document.getElementById('info-details-grid');
    if (grid) { grid.style.display = 'grid'; grid.style.gridTemplateColumns = '1fr 1fr'; }
    const img = await loadImg(file);

    document.getElementById('info-file-details').innerHTML = [
      ['Filename', file.name], ['Type', file.type || 'Unknown'], ['Size', formatBytes(file.size)],
      ['Dimensions', img ? `${img.naturalWidth} x ${img.naturalHeight}` : '?'],
      ['Ratio', img ? `${img.naturalWidth/gcd(img.naturalWidth,img.naturalHeight)}:${img.naturalHeight/gcd(img.naturalWidth,img.naturalHeight)}` : '?'],
      ['Modified', file.lastModified ? new Date(file.lastModified).toLocaleString() : '?'],
    ].map(([l,v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value" class="copyable">${esc(v)}</span></div>`).join('');

    const bytes = new Uint8Array(await file.arrayBuffer());
    const exif = parseExif(bytes);
    document.getElementById('info-exif').innerHTML = exif.length ? exif.map(([t,v]) => `<div class="info-row"><span class="info-label">${esc(t)}</span><span class="info-value" class="copyable">${esc(String(v))}</span></div>`).join('') : '<span style="color:var(--slate-500);">No EXIF data</span>';

    const structure = parseJpegStructure(bytes);
    document.getElementById('info-structure').innerHTML = structure.length ? structure.map(s => `<div style="color:var(--slate-400);padding:2px 0;">${esc(s)}</div>`).join('') : '<span style="color:var(--slate-500);">Not JPEG</span>';

    // DPI
    const dpi = readDpiFromPng(bytes) || readDpiFromJpeg(bytes);
    document.getElementById('info-dpi').innerHTML = dpi
      ? `<div class="info-row"><span class="info-label">DPI</span><span class="info-value">${dpi.x} x ${dpi.y}</span></div>`
      : '<span style="color:var(--slate-500);">Not available</span>';

    // Image hash
    if (img) {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const hashEl = document.getElementById('info-hash');
      hashEl.innerHTML = '<span style="color:var(--slate-500);">Computing...</span>';
      try {
        const sha = await computeImageHash(c, 'SHA-256');
        const phash = computePerceptualHash(c);
        hashEl.innerHTML = `
          <div class="info-row"><span class="info-label">SHA-256</span><span class="info-value copyable" style="font-size:0.5625rem;">${sha.substring(0, 16)}...</span></div>
          <div class="info-row"><span class="info-label">pHash</span><span class="info-value copyable">${phash}</span></div>
        `;
      } catch { hashEl.innerHTML = '<span style="color:var(--slate-500);">Hash failed</span>'; }

      // Base64 button
      const b64Btn = document.getElementById('btn-copy-base64');
      b64Btn.disabled = false;
      b64Btn.onclick = () => {
        navigator.clipboard.writeText(c.toDataURL(file.type || 'image/png'));
      };
    }
  });
}

// ============================================================
// MODE: QR Code
// ============================================================

function initQR() {
  let qrLogo = null;   // Image element for center logo
  let qrBgImg = null;  // Background image behind QR
  let qrDebounce = null;
  let qrHistory = [];
  const QR_HISTORY_MAX = 10;

  const QR_TEMPLATES = {
    url: 'https://example.com',
    wifi: 'WIFI:T:WPA;S:NetworkName;P:Password123;;',
    email: 'mailto:name@example.com?subject=Hello&body=Hi there',
    phone: 'tel:+1234567890',
    vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEMAIL:john@example.com\nEND:VCARD',
    sms: 'smsto:+1234567890:Hello!',
    geo: 'geo:37.7749,-122.4194',
    event: 'BEGIN:VEVENT\nSUMMARY:Meeting\nDTSTART:20240101T100000Z\nDTEND:20240101T110000Z\nEND:VEVENT',
  };

  // --- QR mode tabs (Generate / Read) ---
  document.querySelectorAll('.qr-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.qr-mode-tab').forEach(t => {
        t.classList.remove('active');
        t.style.color = 'var(--slate-500)';
        t.style.borderBottomColor = 'transparent';
      });
      tab.classList.add('active');
      tab.style.color = 'var(--saffron-400)';
      tab.style.borderBottomColor = 'var(--saffron-400)';

      const mode = tab.dataset.qrMode;
      document.getElementById('qr-panel-generate').style.display = mode === 'generate' ? 'flex' : 'none';
      document.getElementById('qr-panel-read').style.display = mode === 'read' ? 'flex' : 'none';
      // Hide ribbon in Read mode (it only applies to Generate)
      const ribbon = document.querySelector('#mode-qr .tool-ribbon');
      if (ribbon) ribbon.style.display = mode === 'generate' ? '' : 'none';
    });
  });

  // --- Live preview: debounced auto-generate on text input ---
  const qrGenBtn = document.getElementById('btn-qr-generate');
  function updateQrGenBtn() {
    qrGenBtn.disabled = !document.getElementById('qr-text').value.trim();
  }
  updateQrGenBtn(); // initial state

  document.getElementById('qr-text').addEventListener('input', () => {
    updateQrGenBtn();
    clearTimeout(qrDebounce);
    qrDebounce = setTimeout(() => genQR(), 500);
  });

  qrGenBtn.addEventListener('click', genQR);
  document.getElementById('qr-text').addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') genQR(); });

  // Sliders: update label + regenerate
  ['qr-px','qr-margin'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      document.getElementById(id+'-val').textContent = e.target.value;
      if (document.getElementById('qr-text').value) genQR();
    });
  });

  // Dropdowns & color pickers: regenerate on change
  ['qr-ecc','qr-fg','qr-bg','qr-fg2','qr-style'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => { if (document.getElementById('qr-text').value) genQR(); });
  });

  // Gradient toggle: show/hide second color, regenerate
  document.getElementById('qr-gradient').addEventListener('change', (e) => {
    document.getElementById('qr-fg2').style.display = e.target.checked ? '' : 'none';
    if (document.getElementById('qr-text').value) genQR();
  });

  // Compact toggle: adjust margin/px and regenerate
  document.getElementById('qr-compact').addEventListener('change', (e) => {
    if (e.target.checked) {
      document.getElementById('qr-margin').value = 1;
      document.getElementById('qr-margin-val').textContent = '1';
      document.getElementById('qr-px').value = 5;
      document.getElementById('qr-px-val').textContent = '5';
    } else {
      document.getElementById('qr-margin').value = 4;
      document.getElementById('qr-margin-val').textContent = '4';
      document.getElementById('qr-px').value = 8;
      document.getElementById('qr-px-val').textContent = '8';
    }
    if (document.getElementById('qr-text').value) genQR();
  });

  // Label field: regenerate on input (debounced)
  document.getElementById('qr-label').addEventListener('input', () => {
    clearTimeout(qrDebounce);
    qrDebounce = setTimeout(() => { if (document.getElementById('qr-text').value) genQR(); }, 500);
  });

  // --- Preset templates ---
  document.querySelectorAll('[data-qr-preset]').forEach(b => b.addEventListener('click', () => {
    // Highlight active preset
    document.querySelectorAll('[data-qr-preset]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('qr-text').value = QR_TEMPLATES[b.dataset.qrPreset] || '';
    genQR();
  }));
  // Clear preset highlight when user manually edits text
  document.getElementById('qr-text').addEventListener('keydown', () => {
    document.querySelectorAll('[data-qr-preset]').forEach(x => x.classList.remove('active'));
  });

  // --- Logo upload ---
  document.getElementById('btn-qr-logo').addEventListener('click', () => document.getElementById('qr-logo-file').click());
  document.getElementById('qr-logo-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const img = new Image();
    img.onload = () => {
      qrLogo = img;
      document.getElementById('btn-qr-logo-clear').style.display = '';
      // Auto-set ECC to High when logo is present
      document.getElementById('qr-ecc').value = 'H';
      if (document.getElementById('qr-text').value) genQR();
    };
    img.src = URL.createObjectURL(file);
  });
  document.getElementById('btn-qr-logo-clear').addEventListener('click', () => {
    qrLogo = null;
    document.getElementById('qr-logo-file').value = '';
    document.getElementById('btn-qr-logo-clear').style.display = 'none';
    if (document.getElementById('qr-text').value) genQR();
  });

  // --- Background image upload ---
  document.getElementById('btn-qr-bg-img').addEventListener('click', () => document.getElementById('qr-bg-img-file').click());
  document.getElementById('qr-bg-img-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const img = new Image();
    img.onload = () => {
      qrBgImg = img;
      document.getElementById('btn-qr-bg-img-clear').style.display = '';
      if (document.getElementById('qr-text').value) genQR();
    };
    img.src = URL.createObjectURL(file);
  });
  document.getElementById('btn-qr-bg-img-clear').addEventListener('click', () => {
    qrBgImg = null;
    document.getElementById('qr-bg-img-file').value = '';
    document.getElementById('btn-qr-bg-img-clear').style.display = 'none';
    if (document.getElementById('qr-text').value) genQR();
  });

  // --- Export: Copy image ---
  document.getElementById('btn-qr-copy').addEventListener('click', () => {
    document.getElementById('qr-canvas').toBlob(b => navigator.clipboard.write([new ClipboardItem({'image/png':b})]));
  });

  // --- Export: Copy text ---
  document.getElementById('btn-qr-copy-text').addEventListener('click', () => {
    const text = document.getElementById('qr-text').value;
    if (text) navigator.clipboard.writeText(text);
  });

  // --- Export: PNG download ---
  document.getElementById('btn-qr-download').addEventListener('click', () => {
    document.getElementById('qr-canvas').toBlob(b => {
      chrome.runtime.sendMessage({action:'download',url:URL.createObjectURL(b),filename:'pixeroo/qrcode.png',saveAs:true});
    });
  });

  // --- Export: SVG download ---
  document.getElementById('btn-qr-svg').addEventListener('click', () => {
    const text = document.getElementById('qr-text').value; if (!text) return;
    try {
      const ecc = qrLogo ? 'H' : document.getElementById('qr-ecc').value;
      const qr = QR.encode(text, ecc), fg = document.getElementById('qr-fg').value, bg = document.getElementById('qr-bg').value;
      const m = +document.getElementById('qr-margin').value, style = document.getElementById('qr-style').value;
      const sz = qr.size + m * 2;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}"><rect width="${sz}" height="${sz}" fill="${bg}"/>`;
      for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
          if (!qr.modules[y][x]) continue;
          const px = x + m, py = y + m;
          if (style === 'dots') {
            svg += `<circle cx="${px + 0.5}" cy="${py + 0.5}" r="0.45" fill="${fg}"/>`;
          } else if (style === 'rounded') {
            svg += `<rect x="${px}" y="${py}" width="1" height="1" rx="0.3" ry="0.3" fill="${fg}"/>`;
          } else {
            svg += `<rect x="${px}" y="${py}" width="1" height="1" fill="${fg}"/>`;
          }
        }
      }
      svg += '</svg>';
      chrome.runtime.sendMessage({action:'download',url:URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),filename:'pixeroo/qrcode.svg',saveAs:true});
    } catch {}
  });

  // --- Export: All Sizes ZIP ---
  document.getElementById('btn-qr-sizes')?.addEventListener('click', async () => {
    const text = document.getElementById('qr-text').value; if (!text) return;
    const ecc = qrLogo ? 'H' : document.getElementById('qr-ecc').value;
    const fg = document.getElementById('qr-fg').value, bg = document.getElementById('qr-bg').value;
    const style = document.getElementById('qr-style').value, label = document.getElementById('qr-label').value.trim();
    const zip = new ZipWriter();
    for (const targetSize of [128, 256, 512, 1024]) {
      const tc = document.createElement('canvas');
      const qr = QR.encode(text, ecc);
      const margin = +document.getElementById('qr-margin').value;
      const px = Math.max(1, Math.floor(targetSize / (qr.size + margin * 2)));
      renderQRToCanvas(tc, qr, px, margin, fg, bg, style, qrLogo, label);
      const blob = await new Promise(r => tc.toBlob(r, 'image/png'));
      await zip.addBlob(`qr-${targetSize}x${targetSize}.png`, blob);
    }
    const zipBlob = zip.toBlob();
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a'); a.href = url; a.download = 'pixeroo-qr-sizes.zip'; a.click();
    URL.revokeObjectURL(url);
  });

  // --- Bulk QR Generation ---
  document.getElementById('btn-qr-bulk')?.addEventListener('click', async () => {
    // Build a custom modal with textarea since pixDialog.prompt uses a single-line input
    const input = await new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(2,6,23,0.7);display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div style="background:var(--slate-900,#0f172a);border:1px solid var(--slate-700,#334155);border-radius:12px;padding:1.25rem;min-width:360px;max-width:75vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);font-family:Inter,system-ui,sans-serif;">
          <div style="font-size:0.875rem;font-weight:600;color:var(--slate-200,#e2e8f0);margin-bottom:0.5rem;">Bulk QR Generation</div>
          <div style="color:var(--slate-400,#94a3b8);margin-bottom:0.75rem;">Paste a list of URLs or texts below — <b style="color:var(--saffron-400);">one per line</b>. A separate QR code will be generated for each line and downloaded as a ZIP file.</div>
          <textarea id="bulk-qr-input" style="width:100%;min-height:120px;background:var(--slate-800,#1e293b);color:var(--slate-200,#e2e8f0);border:1px solid var(--slate-700,#334155);border-radius:6px;padding:8px 10px;resize:vertical;outline:none;font-family:monospace;" placeholder="https://example.com&#10;https://another.com&#10;WIFI:T:WPA;S:MyNetwork;P:pass123;;"></textarea>
          <div style="color:var(--slate-500);margin-top:0.375rem;">Using current settings: <b>${document.getElementById('qr-style')?.value || 'square'}</b> style, <b>${document.getElementById('qr-ecc')?.value || 'M'}</b> ECC, <b>${document.getElementById('qr-px')?.value || 8}</b>px</div>
          <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.75rem;">
            <button id="bulk-qr-cancel" style="background:var(--slate-800,#1e293b);color:var(--slate-300,#cbd5e1);border:1px solid var(--slate-700,#334155);border-radius:6px;padding:6px 16px;font-size:0.75rem;font-weight:500;cursor:pointer;">Cancel</button>
            <button id="bulk-qr-ok" style="background:#F4C430;color:#2A1E05;border:none;border-radius:6px;padding:6px 20px;font-size:0.75rem;font-weight:600;cursor:pointer;">Generate ZIP</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#bulk-qr-cancel').addEventListener('click', () => { document.body.removeChild(overlay); resolve(null); });
      overlay.querySelector('#bulk-qr-ok').addEventListener('click', () => { const v = overlay.querySelector('#bulk-qr-input').value; document.body.removeChild(overlay); resolve(v); });
      overlay.addEventListener('click', e => { if (e.target === overlay) { document.body.removeChild(overlay); resolve(null); } });
      setTimeout(() => overlay.querySelector('#bulk-qr-input').focus(), 50);
    });
    if (!input) return;
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    const ecc = qrLogo ? 'H' : document.getElementById('qr-ecc').value;
    const fg = document.getElementById('qr-fg').value, bg = document.getElementById('qr-bg').value;
    const px = +document.getElementById('qr-px').value, margin = +document.getElementById('qr-margin').value;
    const style = document.getElementById('qr-style').value, label = document.getElementById('qr-label').value.trim();
    const zip = new ZipWriter();
    for (let i = 0; i < lines.length; i++) {
      try {
        const tc = document.createElement('canvas');
        const qr = QR.encode(lines[i], ecc);
        renderQRToCanvas(tc, qr, px, margin, fg, bg, style, qrLogo, label);
        const blob = await new Promise(r => tc.toBlob(r, 'image/png'));
        await zip.addBlob(`qr-${String(i + 1).padStart(3, '0')}.png`, blob);
      } catch { /* skip lines that are too long */ }
    }
    const zipBlob = zip.toBlob();
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a'); a.href = url; a.download = 'pixeroo-qr-bulk.zip'; a.click();
    URL.revokeObjectURL(url);
  });

  // --- QR Read / Decode ---
  async function readQRFromFile(file) {
    const img = await loadImg(file);
    if (!img) throw new Error('Could not load image');

    // Try multiple scales — QR readers can be picky about resolution
    const scales = [1, 0.5, 2, 0.25];
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    for (const scale of scales) {
      const w = Math.round(origW * scale);
      const h = Math.round(origH * scale);
      if (w < 20 || h < 20 || w > 2000 || h > 2000) continue;

      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      // White background (helps with transparent PNGs)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      try {
        const result = await chrome.runtime.sendMessage({
          action: 'readQR',
          data: Array.from(imageData.data),
          width: w,
          height: h
        });
        if (result?.text) return result.text;
      } catch {}
    }
    return null;
  }

  setupDropzone(document.getElementById('qr-read-drop'), document.getElementById('qr-read-file'), async (file) => {
    const resultEl = document.getElementById('qr-read-result');
    // Show the dropped image as preview
    const previewUrl = URL.createObjectURL(file);
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <img src="${previewUrl}" style="width:80px;height:80px;object-fit:contain;border-radius:6px;border:1px solid var(--slate-700);background:#fff;flex-shrink:0;">
        <div style="flex:1;"><span style="color:var(--slate-400);">Reading QR code...</span></div>
      </div>`;
    try {
      const data = await readQRFromFile(file);
      if (data) {
        resultEl.innerHTML = `
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <img src="${previewUrl}" style="width:60px;height:60px;object-fit:contain;border-radius:6px;border:1px solid var(--slate-700);background:#fff;flex-shrink:0;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.375rem;">
                <span style="color:#22c55e;font-weight:600;">QR Code Found</span>
                <div style="display:flex;gap:4px;">
                  <button class="tool-btn qr-read-use" style="border:1px solid var(--saffron-400);color:var(--saffron-400);padding:2px 8px;" title="Load this text into the generator">Use</button>
                  <button class="tool-btn qr-read-copy" style="border:1px solid var(--slate-700);padding:2px 8px;" title="Copy to clipboard">Copy</button>
                  <button class="tool-btn qr-read-close" style="border:1px solid var(--slate-700);padding:2px 6px;" title="Dismiss">&#x2715;</button>
                </div>
              </div>
              <div class="copyable" style="color:var(--slate-200);word-break:break-all;cursor:pointer;padding:6px;background:var(--slate-900);border-radius:4px;" title="Click to copy">${esc(data)}</div>
            </div>
          </div>`;
        resultEl.querySelector('.qr-read-copy')?.addEventListener('click', () => navigator.clipboard.writeText(data));
        resultEl.querySelector('.qr-read-use')?.addEventListener('click', () => {
          document.getElementById('qr-text').value = data;
          updateQrGenBtn();
          genQR();
          // Switch to Generate tab
          document.querySelector('.qr-mode-tab[data-qr-mode="generate"]')?.click();
        });
        resultEl.querySelector('.qr-read-close')?.addEventListener('click', () => { resultEl.style.display = 'none'; });
      } else {
        resultEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="color:#ef4444;">No QR code found in this image</span>
            <button class="tool-btn qr-read-close" style="border:1px solid var(--slate-700);padding:2px 6px;" title="Dismiss">&#x2715;</button>
          </div>
          <div style="color:var(--slate-500);margin-top:0.25rem;">Make sure the image contains a clear, unobstructed QR code.</div>`;
        resultEl.querySelector('.qr-read-close')?.addEventListener('click', () => { resultEl.style.display = 'none'; });
      }
    } catch (e) {
      resultEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="color:#ef4444;">Failed to read QR</span>
          <button class="tool-btn qr-read-close" style="border:1px solid var(--slate-700);padding:2px 6px;" title="Dismiss">&#x2715;</button>
        </div>
        <div style="color:var(--slate-500);margin-top:0.25rem;">${esc(e.message)}</div>`;
      resultEl.querySelector('.qr-read-close')?.addEventListener('click', () => { resultEl.style.display = 'none'; });
    }
  });

  // --- QR History ---
  async function loadQrHistory() {
    try {
      const r = await chrome.storage.local.get('qrHistory');
      qrHistory = r.qrHistory || [];
      renderQrHistory();
    } catch {}
  }

  function saveQrHistory() {
    chrome.storage.local.set({ qrHistory }).catch(() => {});
    renderQrHistory();
  }

  let _lastQrHistoryText = '';

  function addToQrHistory(text, dataUrl) {
    // Only add new entry when text content changes
    if (text === _lastQrHistoryText) {
      // Just update the thumbnail of the existing entry (style changed)
      const existing = qrHistory.find(h => h.text === text);
      if (existing) existing.dataUrl = dataUrl;
      return;
    }
    _lastQrHistoryText = text;
    qrHistory = qrHistory.filter(h => h.text !== text);
    qrHistory.unshift({ text, dataUrl, timestamp: Date.now() });
    if (qrHistory.length > QR_HISTORY_MAX) qrHistory.pop();
    saveQrHistory();
  }

  function renderQrHistory() {
    const container = document.getElementById('qr-history');
    const list = document.getElementById('qr-history-list');
    if (!qrHistory.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    list.innerHTML = '';
    qrHistory.forEach((item, idx) => {
      const thumb = document.createElement('img');
      thumb.src = item.dataUrl;
      const date = new Date(item.timestamp).toLocaleString();
      const preview = item.text.length > 60 ? item.text.substring(0, 60) + '...' : item.text;
      thumb.title = `${preview}\n${date}`;
      thumb.style.cssText = 'width:50px;height:50px;object-fit:contain;border-radius:4px;border:1px solid var(--slate-700);cursor:pointer;background:#fff;flex-shrink:0;transition:border-color 0.12s;';
      thumb.addEventListener('mouseenter', () => { thumb.style.borderColor = 'var(--saffron-400)'; });
      thumb.addEventListener('mouseleave', () => { thumb.style.borderColor = 'var(--slate-700)'; });
      thumb.addEventListener('click', () => {
        document.getElementById('qr-text').value = item.text;
        genQR();
      });
      // Right-click context menu on history item
      thumb.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        _qrHistoryCtxMenu(e.clientX, e.clientY, item, idx);
      });
      list.appendChild(thumb);
    });
  }

  // Reset all QR settings to defaults
  document.getElementById('btn-qr-reset')?.addEventListener('click', async () => {
    const ok = await pixDialog.confirm('Reset QR Tool', 'Reset all settings to defaults?', { okText: 'Reset' });
    if (!ok) return;
    // Text & label
    document.getElementById('qr-text').value = '';
    document.getElementById('qr-label').value = '';
    // Style
    document.getElementById('qr-style').value = 'square';
    document.getElementById('qr-ecc').value = 'M';
    document.getElementById('qr-px').value = 8; document.getElementById('qr-px-val').textContent = '8';
    document.getElementById('qr-margin').value = 4; document.getElementById('qr-margin-val').textContent = '4';
    // Colors
    document.getElementById('qr-fg').value = '#000000';
    document.getElementById('qr-bg').value = '#ffffff';
    const gradCb = document.getElementById('qr-gradient');
    if (gradCb) { gradCb.checked = false; gradCb.dispatchEvent(new Event('change')); }
    document.getElementById('qr-fg2').value = '#0066ff';
    const compactCb = document.getElementById('qr-compact');
    if (compactCb) { compactCb.checked = false; compactCb.dispatchEvent(new Event('change')); }
    // Logo
    if (typeof qrLogo !== 'undefined') qrLogo = null;
    const logoClear = document.getElementById('btn-qr-logo-clear');
    if (logoClear) { logoClear.style.display = 'none'; }
    // Clear preset highlight
    document.querySelectorAll('[data-qr-preset]').forEach(b => b.classList.remove('active'));
    // Clear canvas
    const cvs = document.getElementById('qr-canvas');
    cvs.width = 0; cvs.height = 0;
    // Update generate button state
    updateQrGenBtn();
  });

  document.getElementById('btn-qr-history-clear')?.addEventListener('click', () => {
    qrHistory = [];
    saveQrHistory();
  });

  // --- Context menus for QR ---
  function _removeQrCtx() { document.querySelector('.qr-ctx-menu')?.remove(); }

  function _showQrCtxMenu(x, y, items) {
    _removeQrCtx();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu qr-ctx-menu';
    menu.style.left = Math.min(x, window.innerWidth - 170) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - items.length * 30 - 10) + 'px';
    items.forEach(item => {
      if (item === 'sep') {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:var(--slate-800);margin:2px 0;';
        menu.appendChild(sep);
        return;
      }
      const row = document.createElement('div');
      row.className = 'ctx-menu-item';
      row.textContent = item.label;
      row.addEventListener('click', () => { _removeQrCtx(); item.action(); });
      menu.appendChild(row);
    });
    document.body.appendChild(menu);
    setTimeout(() => {
      document.addEventListener('click', _removeQrCtx, { once: true });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { _removeQrCtx(); document.removeEventListener('keydown', esc); }
      });
    }, 10);
  }

  // Right-click on QR history thumbnail
  function _qrHistoryCtxMenu(x, y, item, idx) {
    _showQrCtxMenu(x, y, [
      { label: 'Load this QR', action: () => { document.getElementById('qr-text').value = item.text; genQR(); } },
      { label: 'Copy Text', action: () => navigator.clipboard.writeText(item.text) },
      { label: 'Copy Image', action: async () => {
        try {
          const resp = await fetch(item.dataUrl);
          const blob = await resp.blob();
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch {}
      }},
      { label: 'Download PNG', action: () => {
        chrome.runtime.sendMessage({ action: 'download', url: item.dataUrl, filename: 'pixeroo/qr-history.png', saveAs: true });
      }},
      'sep',
      { label: 'Remove from History', action: () => {
        qrHistory.splice(idx, 1);
        saveQrHistory();
      }},
    ]);
  }

  // Right-click on generated QR canvas
  document.getElementById('qr-canvas')?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cvs = document.getElementById('qr-canvas');
    const text = document.getElementById('qr-text').value;
    if (!text || !cvs.width) return;
    _showQrCtxMenu(e.clientX, e.clientY, [
      { label: 'Copy Image', action: async () => {
        try {
          const blob = await new Promise(r => cvs.toBlob(r, 'image/png'));
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch {}
      }},
      { label: 'Copy Text', action: () => navigator.clipboard.writeText(text) },
      'sep',
      { label: 'Download PNG', action: () => { document.getElementById('btn-qr-download')?.click(); }},
      { label: 'Download SVG', action: () => { document.getElementById('btn-qr-svg')?.click(); }},
      { label: 'Download All Sizes', action: () => { document.getElementById('btn-qr-sizes')?.click(); }},
      'sep',
      { label: 'Save to Library', action: () => { document.getElementById('btn-qr-save-lib')?.click(); }},
    ]);
  });

  loadQrHistory();

  // ---- Core render function used by genQR, bulk, and all-sizes ----
  function renderQRToCanvas(canvas, qr, pixelSize, margin, fg, bg, style, logo, label) {
    const { modules, size } = qr;
    const qrPx = (size + margin * 2) * pixelSize;
    const labelH = label ? Math.max(20, Math.round(pixelSize * 3.5)) : 0;
    const totalW = qrPx;
    const totalH = qrPx + labelH;
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');

    const gradientEnabled = document.getElementById('qr-gradient')?.checked;
    const fg2Color = document.getElementById('qr-fg2')?.value || '#0066ff';

    // Background
    if (qrBgImg) {
      // Draw background image scaled to cover the QR area
      const imgRatio = qrBgImg.naturalWidth / qrBgImg.naturalHeight;
      const canvasRatio = totalW / totalH;
      let drawW, drawH, drawX, drawY;
      if (imgRatio > canvasRatio) {
        drawH = totalH;
        drawW = totalH * imgRatio;
        drawX = (totalW - drawW) / 2;
        drawY = 0;
      } else {
        drawW = totalW;
        drawH = totalW / imgRatio;
        drawX = 0;
        drawY = (totalH - drawH) / 2;
      }
      ctx.drawImage(qrBgImg, drawX, drawY, drawW, drawH);
      // Draw semi-transparent white behind each module for contrast
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (!modules[y][x]) continue;
          const px = (x + margin) * pixelSize;
          const py = (y + margin) * pixelSize;
          ctx.fillRect(px - 1, py - 1, pixelSize + 2, pixelSize + 2);
        }
      }
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, totalW, totalH);
    }

    // Set fill style: gradient or solid
    if (gradientEnabled) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, fg);
      grad.addColorStop(1, fg2Color);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = fg;
    }

    // Draw modules with chosen style
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!modules[y][x]) continue;
        const px = (x + margin) * pixelSize;
        const py = (y + margin) * pixelSize;
        if (style === 'dots') {
          ctx.beginPath();
          ctx.arc(px + pixelSize / 2, py + pixelSize / 2, pixelSize * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else if (style === 'rounded') {
          const r = pixelSize * 0.3;
          ctx.beginPath();
          ctx.roundRect(px, py, pixelSize, pixelSize, r);
          ctx.fill();
        } else {
          ctx.fillRect(px, py, pixelSize, pixelSize);
        }
      }
    }

    // Draw logo centered on QR
    if (logo) {
      const logoSize = Math.round(qrPx * 0.2);
      const lx = Math.round((qrPx - logoSize) / 2);
      const ly = Math.round((qrPx - logoSize) / 2);
      const pad = 4;
      // White rounded-rect background behind logo
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(lx - pad, ly - pad, logoSize + pad * 2, logoSize + pad * 2, 6);
      ctx.fill();
      // Draw logo image
      ctx.drawImage(logo, lx, ly, logoSize, logoSize);
    }

    // Draw label below QR
    if (label) {
      const fontSize = Math.max(11, Math.round(pixelSize * 2));
      ctx.fillStyle = fg;
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, totalW / 2, qrPx + labelH / 2);
    }
  }

  // QR max capacity (bytes) by ECC level
  const QR_MAX_BYTES = { L: 2953, M: 2331, Q: 1663, H: 1273 };

  function validateQRContent(text) {
    if (!text) return 'Enter text or URL to generate QR code';
    const ecc = qrLogo ? 'H' : document.getElementById('qr-ecc').value;
    const maxBytes = QR_MAX_BYTES[ecc] || 2331;
    const byteLen = new TextEncoder().encode(text).length;
    if (byteLen > maxBytes) return `Content too long (${byteLen} bytes). Max for ${ecc} correction: ${maxBytes} bytes. Shorten text or lower error correction.`;

    // Detect preset type and validate
    if (text.startsWith('https://') || text.startsWith('http://')) {
      try { new URL(text); } catch { return 'Invalid URL format'; }
    } else if (text.startsWith('mailto:')) {
      if (!text.includes('@')) return 'Email must contain @ symbol';
    } else if (text.startsWith('tel:') || text.startsWith('TEL:')) {
      const num = text.replace(/^tel:/i, '');
      if (!/^[+\d\s()-]+$/.test(num)) return 'Phone number contains invalid characters';
    } else if (text.startsWith('WIFI:')) {
      if (!text.includes('S:') || text.includes('S:;')) return 'WiFi config must include network name (S:YourSSID)';
    } else if (text.startsWith('BEGIN:VCARD')) {
      if (!text.includes('FN:')) return 'vCard must include a name (FN:Name)';
      if (!text.includes('END:VCARD')) return 'vCard must end with END:VCARD';
    } else if (text.startsWith('smsto:')) {
      if (text === 'smsto:') return 'SMS must include a phone number';
    } else if (text.startsWith('geo:')) {
      const coords = text.replace('geo:', '');
      if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(coords)) return 'Geo format: geo:latitude,longitude (e.g. geo:37.77,-122.42)';
    } else if (text.startsWith('BEGIN:VEVENT')) {
      if (!text.includes('SUMMARY:')) return 'Event must include SUMMARY:EventName';
      if (!text.includes('END:VEVENT')) return 'Event must end with END:VEVENT';
    }
    // Auto-prepend https:// if it looks like a URL
    if (/^[a-z0-9][-a-z0-9]*\.[a-z]{2,}/i.test(text) && !text.includes(' ') && !text.includes(':')) {
      document.getElementById('qr-text').value = 'https://' + text;
    }
    return null; // valid
  }

  function showQRError(msg) {
    const c = document.getElementById('qr-canvas');
    c.width = 240; c.height = 60;
    const x = c.getContext('2d');
    x.fillStyle = '#1e293b'; x.fillRect(0, 0, 240, 60);
    x.fillStyle = '#ef4444'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center';
    // Word wrap
    const words = msg.split(' '); let lines = [''];
    words.forEach(w => { if ((lines[lines.length-1] + ' ' + w).length > 35) lines.push(w); else lines[lines.length-1] += (lines[lines.length-1] ? ' ' : '') + w; });
    lines.forEach((line, i) => x.fillText(line, 120, 20 + i * 16));
  }

  function genQR() {
    const text = document.getElementById('qr-text').value;
    if (!text) return;

    const error = validateQRContent(text);
    if (error) { showQRError(error); return; }

    // Re-read text (may have been auto-corrected by validation)
    const finalText = document.getElementById('qr-text').value;

    try {
      const ecc = qrLogo ? 'H' : document.getElementById('qr-ecc').value;
      const qr = QR.encode(finalText, ecc);
      const px = +document.getElementById('qr-px').value;
      const margin = +document.getElementById('qr-margin').value;
      const fg = document.getElementById('qr-fg').value;
      const bg = document.getElementById('qr-bg').value;
      const style = document.getElementById('qr-style').value;
      const label = document.getElementById('qr-label').value.trim();
      const cvs = document.getElementById('qr-canvas');
      renderQRToCanvas(cvs, qr, px, margin, fg, bg, style, qrLogo, label);
      try { addToQrHistory(finalText, cvs.toDataURL('image/png')); } catch {}
    } catch {
      showQRError('Could not generate QR. Text may be too long.');
    }
  }
}

// ============================================================
// MODE: Colors
// ============================================================

function initColors() {
  let cImg = null;
  const cc = document.getElementById('colors-canvas'), cx = cc.getContext('2d', { willReadFrequently: true });

  setupDropzone(document.getElementById('colors-drop'), document.getElementById('colors-file'), async (file) => {
    cImg = await loadImg(file); if (!cImg) return;
    document.getElementById('colors-drop').style.display = 'none';
    document.getElementById('colors-preview').style.display = 'block';
    cc.width = cImg.naturalWidth; cc.height = cImg.naturalHeight; cx.drawImage(cImg, 0, 0);
    extractPal();
  });

  cc.addEventListener('click', (e) => {
    const r = cc.getBoundingClientRect(), x = Math.floor((e.clientX-r.left)*cc.width/r.width), y = Math.floor((e.clientY-r.top)*cc.height/r.height);
    const [rv,gv,bv] = cx.getImageData(x,y,1,1).data, hex = rgbHex(rv,gv,bv);
    document.getElementById('picked-color').innerHTML = `<div style="background:${hex};height:32px;border-radius:6px;margin-bottom:0.375rem;border:1px solid var(--slate-700);"></div><div class="color-hex" data-copy="${hex}">${hex}</div><div class="color-secondary">rgb(${rv},${gv},${bv}) | ${rgbHsl(rv,gv,bv)}</div>`;
  });

  document.getElementById('palette-count').addEventListener('input', e => { document.getElementById('palette-count-val').textContent = e.target.value; });
  document.getElementById('btn-reextract').addEventListener('click', extractPal);

  function extractPal() {
    if (!cImg) return;
    const k = +document.getElementById('palette-count').value, data = cx.getImageData(0,0,cc.width,cc.height), px = [];
    for (let i = 0; i < data.data.length; i += 16) { if (data.data[i+3] < 128) continue; px.push([data.data[i],data.data[i+1],data.data[i+2]]); }
    const pal = kMeans(px, k);
    document.getElementById('palette-colors').innerHTML = pal.map(c => `<div class="color-row"><div class="color-preview" style="background:${c.hex};"></div><div style="flex:1;"><div class="color-hex" data-copy="${c.hex}">${c.hex}</div><div class="color-secondary">rgb(${c.r},${c.g},${c.b}) | ${c.pct}%</div></div></div>`).join('');
  }
}

function kMeans(px, k) {
  if (!px.length) return [];
  let cen = px.slice(0, Math.min(k, px.length)).map(p=>[...p]);
  const asg = new Array(px.length).fill(0);
  for (let it=0;it<15;it++) {
    for (let i=0;i<px.length;i++) { let mn=Infinity; for (let j=0;j<cen.length;j++) { const d=(px[i][0]-cen[j][0])**2+(px[i][1]-cen[j][1])**2+(px[i][2]-cen[j][2])**2; if (d<mn){mn=d;asg[i]=j;} } }
    const s=cen.map(()=>[0,0,0]),ct=new Array(cen.length).fill(0);
    for (let i=0;i<px.length;i++){const c=asg[i];s[c][0]+=px[i][0];s[c][1]+=px[i][1];s[c][2]+=px[i][2];ct[c]++;}
    for (let j=0;j<cen.length;j++) if(ct[j]) cen[j]=[Math.round(s[j][0]/ct[j]),Math.round(s[j][1]/ct[j]),Math.round(s[j][2]/ct[j])];
  }
  const ct=new Array(cen.length).fill(0); for(const c of asg)ct[c]++;
  return cen.map((c,i)=>({r:c[0],g:c[1],b:c[2],hex:rgbHex(c[0],c[1],c[2]),pct:Math.round(ct[i]/px.length*100)})).sort((a,b)=>b.pct-a.pct);
}

// ============================================================
// MODE: SVG
// ============================================================

function initSVG() {
  let svgSrc = '';
  setupDropzone(document.getElementById('svg-drop'), document.getElementById('svg-file'), (file) => {
    const r = new FileReader();
    r.onload = (e) => {
      svgSrc = e.target.result;
      document.getElementById('svg-drop').style.display = 'none';
      document.getElementById('svg-preview').style.display = 'block';
      document.getElementById('svg-img').src = URL.createObjectURL(file);
      document.getElementById('svg-source').textContent = svgSrc;
      document.getElementById('btn-svg-export').disabled = false;
      const doc = new DOMParser().parseFromString(svgSrc, 'image/svg+xml'), svg = doc.querySelector('svg');
      const info = svg ? [['Width',svg.getAttribute('width')||'auto'],['Height',svg.getAttribute('height')||'auto'],['ViewBox',svg.getAttribute('viewBox')||'none'],['Elements',svg.querySelectorAll('*').length],['Size',formatBytes(new Blob([svgSrc]).size)]] : [];
      document.getElementById('svg-info').innerHTML = info.map(([l,v])=>`<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${esc(String(v))}</span></div>`).join('');
      const w=parseInt(svg?.getAttribute('width'))||parseInt(svg?.getAttribute('viewBox')?.split(' ')[2])||100;
      const h=parseInt(svg?.getAttribute('height'))||parseInt(svg?.getAttribute('viewBox')?.split(' ')[3])||100;
      document.getElementById('svg-export-w').value=w*2; document.getElementById('svg-export-h').value=h*2;
    };
    r.readAsText(file);
  });

  document.getElementById('btn-svg-export').addEventListener('click', () => {
    if (!svgSrc) return;
    const w=+document.getElementById('svg-export-w').value||400, h=+document.getElementById('svg-export-h').value||400, fmt=document.getElementById('svg-export-fmt').value;
    const img=new Image(); img.onload=()=>{
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
      if(fmt==='jpeg'){x.fillStyle='#fff';x.fillRect(0,0,w,h);}x.drawImage(img,0,0,w,h);
      c.toBlob(b=>{chrome.runtime.sendMessage({action:'download',url:URL.createObjectURL(b),filename:`pixeroo/svg-export.${fmt==='jpeg'?'jpg':fmt}`,saveAs:true});},{png:'image/png',jpeg:'image/jpeg',webp:'image/webp'}[fmt],0.9);
    }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgSrc);
  });
  document.getElementById('btn-svg-copy-source').addEventListener('click', () => { if(svgSrc) navigator.clipboard.writeText(svgSrc); });

  // Image → SVG Trace
  let traceSvg = '';
  setupDropzone(document.getElementById('trace-drop'), document.getElementById('trace-file'), async (file) => {
    const img = await loadImg(file);
    if (!img) return;
    document.getElementById('btn-trace-go').disabled = false;
    document.getElementById('btn-trace-go')._traceImg = img;
    document.getElementById('trace-drop').innerHTML = `<p class="drop-title" style="">${esc(file.name)}</p><p class="drop-sub" style="">${img.naturalWidth}x${img.naturalHeight}</p>`;
  });

  document.getElementById('btn-trace-go')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-trace-go');
    const img = btn._traceImg;
    if (!img) return;
    btn.disabled = true; btn.textContent = 'Tracing...';

    // Run async so UI updates
    setTimeout(() => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);

        const preset = document.getElementById('trace-preset').value;
        const opts = PixTrace.resolveOptions(preset);
        const colors = +document.getElementById('trace-colors').value;
        if (colors >= 2) opts.numberofcolors = colors;

        traceSvg = PixTrace.traceCanvas(c, opts);

        // Show result
        document.getElementById('trace-result').style.display = 'block';
        document.getElementById('trace-preview').innerHTML = traceSvg;
        // Scale preview SVG to fit
        const svgEl = document.getElementById('trace-preview').querySelector('svg');
        if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto'; }
        const kb = (new Blob([traceSvg]).size / 1024).toFixed(1);
        const paths = (traceSvg.match(/<path /g) || []).length;
        document.getElementById('trace-stats').textContent = `${kb} KB | ${paths} paths | ${opts.numberofcolors} colors`;
        // Show ribbon export buttons
        document.getElementById('btn-trace-download').style.display = '';
        document.getElementById('btn-trace-copy').style.display = '';
        document.getElementById('btn-trace-save-lib').style.display = '';
      } catch (e) {
        console.warn('Trace failed:', e);
      }
      btn.disabled = false; btn.textContent = 'Trace to SVG';
    }, 50);
  });

  document.getElementById('btn-trace-download')?.addEventListener('click', () => {
    if (!traceSvg) return;
    const blob = new Blob([traceSvg], { type: 'image/svg+xml' });
    chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: 'pixeroo/traced.svg', saveAs: true });
  });

  document.getElementById('btn-trace-copy')?.addEventListener('click', () => {
    if (traceSvg) navigator.clipboard.writeText(traceSvg);
  });

  // SVG grid overlay toggle (CSS-based since preview is SVG/img, not canvas)
  document.getElementById('btn-svg-guides')?.addEventListener('click', (e) => {
    const preview = document.getElementById('svg-preview') || document.getElementById('trace-preview');
    if (!preview) return;
    const on = !preview.dataset.grid;
    if (on) {
      preview.dataset.grid = '1';
      preview.style.backgroundImage = 'repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(244,196,48,0.12) 49px,rgba(244,196,48,0.12) 50px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(244,196,48,0.12) 49px,rgba(244,196,48,0.12) 50px)';
      preview.style.backgroundSize = '50px 50px';
    } else {
      delete preview.dataset.grid;
      preview.style.backgroundImage = '';
      preview.style.backgroundSize = '';
    }
    e.currentTarget.classList.toggle('active', on);
  });
}

// ============================================================
// MODE: Compare
// ============================================================

// ============================================================
// MODE: Batch Edit
// ============================================================

function initBatch() {
  let batchFiles = [];
  let importedPipeline = null;
  let previewIndex = 0; // which image to preview

  // Slider labels
  document.getElementById('batch-wm-opacity')?.addEventListener('input', (e) => {
    const v = document.getElementById('batch-wm-opacity-val'); if (v) v.textContent = e.target.value;
  });

  // Show/hide logo button based on watermark mode
  document.getElementById('batch-wm-mode')?.addEventListener('change', (e) => {
    const logoBtn = document.getElementById('batch-wm-img-btn');
    if (logoBtn) logoBtn.style.display = e.target.value === 'image' ? '' : 'none';
  });

  // Show/hide copyright text input
  document.getElementById('batch-add-copyright')?.addEventListener('change', (e) => {
    const input = document.getElementById('batch-copyright-text');
    if (input) input.style.display = e.target.checked ? '' : 'none';
  });

  // Load logo image
  const wmImgBtn = document.getElementById('batch-wm-img-btn');
  const wmImgInput = document.getElementById('batch-wm-img-file');
  wmImgBtn?.addEventListener('click', () => wmImgInput?.click());
  wmImgInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const img = await loadImg(file); if (!img) return;
    wmImage = img;
    wmImgBtn.textContent = file.name.length > 10 ? file.name.slice(0, 8) + '..' : file.name;
    wmImgBtn.style.borderColor = 'var(--saffron-400)';
    wmImgInput.value = '';
  });

  document.getElementById('batch-quality')?.addEventListener('input', (e) => {
    const v = document.getElementById('batch-quality-val'); if (v) v.textContent = e.target.value;
  });

  // Drop zone
  setupDropzone(document.getElementById('batch-drop'), document.getElementById('batch-files'), async (file) => {
    const img = await loadImg(file);
    if (!img) return;
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    batchFiles.push({ file, img, canvas: c, checked: true });
    _updateBatchUI();
  }, { multiple: true });

  function _updateBatchUI() {
    const queue = document.getElementById('batch-queue');
    const items = document.getElementById('batch-items');
    const drop = document.getElementById('batch-drop');
    if (batchFiles.length > 0) { queue.style.display = ''; drop.style.display = 'none'; }
    else { queue.style.display = 'none'; drop.style.display = ''; }

    items.innerHTML = '';
    batchFiles.forEach((bf, i) => {
      const card = document.createElement('div');
      card.style.cssText = 'width:90px;background:var(--slate-800);border:1px solid var(--slate-700);border-radius:6px;overflow:hidden;cursor:pointer;transition:transform 0.1s,opacity 0.1s;';
      card.draggable = true; card.dataset.idx = i;
      card.title = `${bf.file.name}\nClick: view | Double-click: preview`;
      card.style.position = 'relative';

      // Checkbox for selection
      const chk = document.createElement('input');
      chk.type = 'checkbox'; chk.checked = bf.checked !== false;
      chk.style.cssText = 'position:absolute;top:3px;left:3px;z-index:2;accent-color:var(--saffron-400);cursor:pointer;';
      chk.addEventListener('click', (e) => { e.stopPropagation(); bf.checked = chk.checked; updateBatchCount(); });
      chk.addEventListener('change', (e) => { e.stopPropagation(); bf.checked = chk.checked; card.style.opacity = chk.checked ? '1' : '0.4'; updateBatchCount(); });

      // Thumbnail — click to preview
      const thumb = document.createElement('img');
      thumb.src = bf.canvas.toDataURL('image/jpeg', 0.3);
      thumb.style.cssText = 'width:100%;height:60px;object-fit:cover;display:block;cursor:pointer;';
      if (bf.checked === false) card.style.opacity = '0.4';
      thumb.addEventListener('click', () => {
        // Preview in a dialog
        // Single click = view original
        pixDialog.alert(bf.file.name, `<img src="${bf.canvas.toDataURL('image/jpeg', 0.7)}" style="max-width:100%;max-height:50vh;border-radius:4px;"><br><span style="color:var(--slate-400);">${bf.img.naturalWidth}\u00d7${bf.img.naturalHeight} | ${bf.file.type || 'image'} | ${(bf.file.size/1024).toFixed(0)} KB</span>`);
      });

      // Delete icon — top right corner
      const del = document.createElement('span');
      del.textContent = '\u00d7';
      del.style.cssText = 'position:absolute;top:2px;right:3px;width:16px;height:16px;background:rgba(239,68,68,0.85);color:#fff;border-radius:50%;text-align:center;line-height:16px;cursor:pointer;z-index:1;';
      del.title = 'Remove';
      del.addEventListener('click', (e) => { e.stopPropagation(); batchFiles.splice(i, 1); _updateBatchUI(); });

      const label = document.createElement('div');
      label.style.cssText = 'padding:2px 4px;font-size:0.5rem;color:var(--slate-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      label.textContent = bf.file.name;
      const badge = document.createElement('div');
      badge.style.cssText = 'padding:1px 4px;font-size:0.45rem;color:var(--slate-500);';
      badge.textContent = `${bf.img.naturalWidth}\u00d7${bf.img.naturalHeight}`;
      // Double click = set as preview target and open compare
      thumb.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        previewIndex = i;
        document.querySelectorAll('#batch-items > div').forEach((c, ci) => {
          c.style.borderColor = ci === i ? 'var(--saffron-400)' : 'var(--slate-700)';
        });
        document.getElementById('batch-preview-area').style.display = 'none';
        document.getElementById('btn-batch-preview')?.click();
      });

      // Drag reorder
      card.addEventListener('dragstart', (e) => { e.dataTransfer.effectAllowed = 'move'; card.style.opacity = '0.4'; card._dragIdx = i; });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.style.transform = 'scale(1.05)'; });
      card.addEventListener('dragleave', () => { card.style.transform = ''; });
      card.addEventListener('drop', (e) => {
        e.preventDefault(); card.style.transform = '';
        const fromIdx = [...items.children].findIndex(c => c._dragIdx !== undefined && c.style.opacity === '0.4');
        if (fromIdx < 0 || fromIdx === i) return;
        const [moved] = batchFiles.splice(fromIdx, 1);
        batchFiles.splice(i, 0, moved);
        _updateBatchUI();
      });

      card.appendChild(chk); card.appendChild(del); card.appendChild(thumb); card.appendChild(label); card.appendChild(badge);
      items.appendChild(card);
    });

    // Add more button
    const addBtn = document.createElement('div');
    addBtn.style.cssText = 'width:90px;height:80px;border:1px dashed var(--slate-700);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--slate-500);font-size:1.5rem;';
    addBtn.textContent = '+';
    const addInput = document.createElement('input');
    addInput.type = 'file'; addInput.accept = 'image/*'; addInput.multiple = true; addInput.style.display = 'none';
    addBtn.appendChild(addInput);
    addBtn.addEventListener('click', () => addInput.click());
    addInput.addEventListener('change', async (e) => {
      for (const f of e.target.files) {
        const img = await loadImg(f); if (!img) continue;
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        batchFiles.push({ file: f, img, canvas: c, checked: true });
      }
      addInput.value = ''; _updateBatchUI();
    });
    items.appendChild(addBtn);
    document.getElementById('batch-status').textContent = `${batchFiles.length} images`;
    document.getElementById('btn-batch-process').disabled = batchFiles.length === 0;
    document.getElementById('btn-batch-preview').disabled = batchFiles.length === 0;
    updateRenamePreview();
  }

  function getChecked() { return batchFiles.filter(bf => bf.checked !== false); }

  function updateBatchCount() {
    const checked = getChecked().length;
    document.getElementById('batch-status').textContent = `${checked}/${batchFiles.length} selected`;
    document.getElementById('btn-batch-process').disabled = checked === 0;
    document.getElementById('btn-batch-preview').disabled = checked === 0;
  }

  function updateRenamePreview() {
    const preview = document.getElementById('batch-rename-preview');
    if (!preview) return;
    if (!batchFiles.length) { preview.textContent = ''; return; }
    const fmt = document.getElementById('batch-format')?.value || 'png';
    const ext = fmt === 'original' ? batchFiles[0].file.name.split('.').pop() : (fmt === 'jpeg' ? 'jpg' : fmt);
    const w = +(document.getElementById('batch-w')?.value) || batchFiles[0].img.naturalWidth;
    const h = +(document.getElementById('batch-h')?.value) || batchFiles[0].img.naturalHeight;
    const name = batchFilename(batchFiles[0], 0, w, h, ext);
    preview.textContent = name;
    preview.title = name;
  }

  // Update rename preview on input
  document.getElementById('batch-rename')?.addEventListener('input', updateRenamePreview);

  // Token insert buttons
  document.querySelectorAll('#batch-rename-tokens [data-token]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('batch-rename');
      if (!input) return;
      input.value += btn.dataset.token;
      input.dispatchEvent(new Event('input'));
    });
  });

  // --- 1. Import Pipeline from Edit mode ---
  document.getElementById('btn-batch-import-pipeline')?.addEventListener('click', () => {
    if (!pipeline || !pipeline.operations.length) {
      document.getElementById('batch-pipeline-info').innerHTML = 'Go to <b>Edit</b> first, apply operations, then come back here to import';
      return;
    }
    importedPipeline = JSON.parse(JSON.stringify(pipeline.operations));
    const opNames = importedPipeline.map(op => op.type).join(', ');
    document.getElementById('batch-pipeline-info').textContent = `${importedPipeline.length} ops: ${opNames}`;
  });

  // --- 4. Batch Consistency Check ---
  document.getElementById('btn-batch-check')?.addEventListener('click', () => {
    if (!batchFiles.length) return;

    // Group by dimensions
    const dimGroups = {};
    batchFiles.forEach(bf => {
      const key = `${bf.img.naturalWidth}\u00d7${bf.img.naturalHeight}`;
      if (!dimGroups[key]) dimGroups[key] = [];
      dimGroups[key].push(bf.file.name);
    });

    // Group by format
    const fmtGroups = {};
    batchFiles.forEach(bf => {
      const fmt = bf.file.type || 'unknown';
      if (!fmtGroups[fmt]) fmtGroups[fmt] = 0;
      fmtGroups[fmt]++;
    });

    // Group by orientation
    let landscape = 0, portrait = 0;
    batchFiles.forEach(bf => {
      if (bf.img.naturalWidth >= bf.img.naturalHeight) landscape++; else portrait++;
    });

    // Build table HTML
    const truncName = (n) => n.length > 25 ? n.slice(0, 22) + '...' : n;
    const sortedDims = Object.entries(dimGroups).sort((a, b) => b[1].length - a[1].length);
    const majority = sortedDims[0]?.[0];

    let html = '<table style="width:100%;border-collapse:collapse;">';
    html += '<tr style="border-bottom:1px solid var(--slate-700);"><th style="text-align:left;padding:4px 8px;color:var(--slate-400);">Dimensions</th><th style="text-align:center;padding:4px 8px;color:var(--slate-400);">Count</th><th style="text-align:left;padding:4px 8px;color:var(--slate-400);">Images</th></tr>';

    for (const [dim, files] of sortedDims) {
      const isOutlier = files.length === 1 && sortedDims.length > 1;
      const rowColor = isOutlier ? 'color:#ef4444;' : (dim === majority ? 'color:var(--slate-200);' : 'color:var(--slate-400);');
      const names = files.map(truncName).join(', ');
      const flag = isOutlier ? ' \u26a0' : (dim === majority ? ' \u2713' : '');
      html += `<tr style="border-bottom:1px solid var(--slate-800);${rowColor}"><td style="padding:4px 8px;font-family:monospace;">${dim}${flag}</td><td style="text-align:center;padding:4px 8px;">${files.length}</td><td style="padding:4px 8px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${names}</td></tr>`;
    }
    html += '</table>';

    // Summary below table
    html += '<div style="margin-top:8px;color:var(--slate-500);">';
    html += `Formats: ${Object.entries(fmtGroups).map(([f, c]) => `${f.split('/')[1] || f} (${c})`).join(', ')}`;
    html += ` | Orientation: ${landscape} landscape, ${portrait} portrait`;
    if (sortedDims.length === 1) html += ' | <span style="color:#22c55e;">\u2713 All consistent</span>';
    else html += ` | <span style="color:#ef4444;">\u26a0 ${sortedDims.length} different sizes</span>`;
    html += '</div>';

    pixDialog.alert('Batch Consistency Check', html);
  });

  // --- Smart rename helper ---
  function batchFilename(bf, index, w, h, ext) {
    const pattern = document.getElementById('batch-rename')?.value || '{name}';
    const baseName = bf.file.name.replace(/\.[^.]+$/, '');
    const origExt = bf.file.name.split('.').pop();
    const date = new Date().toISOString().slice(0, 10);
    return pattern
      .replace(/\{name\}/g, baseName)
      .replace(/\{index\}/g, String(index + 1).padStart(3, '0'))
      .replace(/\{i\}/g, String(index + 1))
      .replace(/\{date\}/g, date)
      .replace(/\{w\}/g, w)
      .replace(/\{h\}/g, h)
      .replace(/\{ext\}/g, origExt)
      + '.' + ext;
  }

  // --- Watermark with position ---
  let wmImage = null; // loaded logo image for image watermark

  function applyPositionedWatermark(c, ctx, text, opts) {
    const mode = document.getElementById('batch-wm-mode')?.value || 'text';
    const pos = document.getElementById('batch-wm-position')?.value || 'center';
    const color = document.getElementById('batch-wm-color')?.value || '#ffffff';
    const fontFamily = document.getElementById('batch-wm-font')?.value || 'Inter, system-ui, sans-serif';
    const fontSize = Math.round(Math.min(c.width, c.height) * 0.05);
    const opacity = opts.opacity || 0.3;

    ctx.save();
    ctx.globalAlpha = opacity;

    // --- Image watermark mode ---
    if (mode === 'image' && wmImage) {
      const maxSize = Math.min(c.width, c.height) * 0.25;
      const scale = Math.min(maxSize / wmImage.width, maxSize / wmImage.height, 1);
      const lw = Math.round(wmImage.width * scale), lh = Math.round(wmImage.height * scale);
      const pad = 15;
      let lx, ly;
      if (pos === 'center') { lx = (c.width - lw) / 2; ly = (c.height - lh) / 2; }
      else if (pos === 'tiled') {
        for (let ty = pad; ty < c.height; ty += lh + pad * 3) {
          for (let tx = pad; tx < c.width; tx += lw + pad * 3) {
            ctx.drawImage(wmImage, tx, ty, lw, lh);
          }
        }
        ctx.restore(); return;
      } else {
        lx = pos.includes('right') ? c.width - lw - pad : pad;
        ly = pos.includes('bottom') ? c.height - lh - pad : pad;
      }
      ctx.drawImage(wmImage, lx, ly, lw, lh);
      ctx.restore(); return;
    }

    // --- Text-based modes ---
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;

    if (mode === 'diagonal') {
      // Large diagonal text across center
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(text, 0, 0);
    } else if (mode === 'grid') {
      // Repeated grid (no rotation)
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const tw = ctx.measureText(text).width + 40;
      const th = fontSize + 30;
      for (let gy = 10; gy < c.height; gy += th) {
        for (let gx = 10; gx < c.width; gx += tw) {
          ctx.fillText(text, gx, gy);
        }
      }
    } else if (mode === 'stamp') {
      // Text inside a bordered rectangle
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width + 20;
      const th = fontSize + 14;
      let sx, sy;
      if (pos === 'center') { sx = (c.width - tw) / 2; sy = (c.height - th) / 2; }
      else {
        const pad = fontSize;
        sx = pos.includes('right') ? c.width - tw - pad : pad;
        sy = pos.includes('bottom') ? c.height - th - pad : pad;
      }
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, tw, th);
      ctx.fillText(text, sx + tw / 2, sy + th / 2);
    } else if (pos === 'tiled') {
      // Tiled with rotation (existing function)
      applyWatermark(c, ctx, text, { opacity, fontSize, angle: -30, color });
    } else if (pos === 'center') {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, c.width / 2, c.height / 2);
    } else {
      // Corner position
      const pad = fontSize;
      const alignH = pos.includes('right') ? 'right' : 'left';
      const alignV = pos.includes('bottom') ? 'bottom' : 'top';
      ctx.textAlign = alignH; ctx.textBaseline = alignV;
      ctx.fillText(text, alignH === 'right' ? c.width - pad : pad, alignV === 'bottom' ? c.height - pad : pad);
    }
    ctx.restore();
  }

  // --- Process single image through all operations ---
  async function processOne(bf, index) {
    const results = []; // { filename, blob }
    const targetW = +(document.getElementById('batch-w')?.value) || 0;
    const targetH = +(document.getElementById('batch-h')?.value) || 0;
    const lockRatio = document.getElementById('batch-lock')?.checked;
    const filterName = document.getElementById('batch-filter')?.value || 'none';
    const watermark = document.getElementById('batch-watermark')?.value || '';
    const wmOpacity = (+(document.getElementById('batch-wm-opacity')?.value) || 30) / 100;
    const format = document.getElementById('batch-format')?.value || 'png';
    const quality = (+(document.getElementById('batch-quality')?.value) || 85) / 100;
    const multiSize = document.getElementById('batch-multi-size')?.checked;
    const sizes = (document.getElementById('batch-sizes')?.value || '150,600,1200').split(',').map(s => +s.trim()).filter(s => s > 0);
    const addCopyright = document.getElementById('batch-add-copyright')?.checked;
    const ratioEnforce = document.getElementById('batch-ratio-enforce')?.value || 'none';
    const normalize = document.getElementById('batch-normalize')?.checked;

    const filterCSS = { none:'', grayscale:'grayscale(100%)', sepia:'sepia(100%)', sharpen:'contrast(150%) brightness(110%)', blur:'blur(2px)', invert:'invert(100%)' };

    // Pre-process: batch crop (trim edges)
    let srcImg = bf.img;
    const cropT = +(document.getElementById('batch-crop-t')?.value) || 0;
    const cropR = +(document.getElementById('batch-crop-r')?.value) || 0;
    const cropB = +(document.getElementById('batch-crop-b')?.value) || 0;
    const cropL = +(document.getElementById('batch-crop-l')?.value) || 0;
    if (cropT || cropR || cropB || cropL) {
      const cw = bf.img.naturalWidth - cropL - cropR;
      const ch = bf.img.naturalHeight - cropT - cropB;
      if (cw > 0 && ch > 0) {
        const cropped = document.createElement('canvas'); cropped.width = cw; cropped.height = ch;
        cropped.getContext('2d').drawImage(bf.img, cropL, cropT, cw, ch, 0, 0, cw, ch);
        srcImg = cropped;
      }
    }

    // Aspect ratio enforcement (crop to ratio)
    if (ratioEnforce !== 'none') {
      const [rw, rh] = ratioEnforce.split(':').map(Number);
      const targetRatio = rw / rh;
      const srcRatio = bf.img.naturalWidth / bf.img.naturalHeight;
      let cropW = bf.img.naturalWidth, cropH = bf.img.naturalHeight, cropX = 0, cropY = 0;
      if (srcRatio > targetRatio) {
        cropW = Math.round(bf.img.naturalHeight * targetRatio); cropX = Math.round((bf.img.naturalWidth - cropW) / 2);
      } else {
        cropH = Math.round(bf.img.naturalWidth / targetRatio); cropY = Math.round((bf.img.naturalHeight - cropH) / 2);
      }
      const cropped = document.createElement('canvas'); cropped.width = cropW; cropped.height = cropH;
      cropped.getContext('2d').drawImage(bf.img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      srcImg = cropped;
    }

    // Size normalization: if enabled, use the largest image dimensions across batch
    let normW = 0, normH = 0;
    if (normalize && !targetW && !targetH) {
      batchFiles.forEach(b => { normW = Math.max(normW, b.img.naturalWidth); normH = Math.max(normH, b.img.naturalHeight); });
    }

    const outputSizes = multiSize ? sizes : [targetW || normW || (srcImg.naturalWidth || srcImg.width)];

    for (const outW of outputSizes) {
      const srcW = srcImg.naturalWidth || srcImg.width;
      const srcH = srcImg.naturalHeight || srcImg.height;
      let w = outW, h;
      if (normalize && normH) {
        // Normalize: all images to same dimensions, letterbox if needed
        w = normW; h = normH;
      } else if (targetH && !multiSize) { h = targetH; }
      else {
        const ratio = srcH / srcW;
        h = lockRatio || multiSize ? Math.round(w * ratio) : (targetH || srcH);
      }

      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');

      // If normalizing, draw centered with letterbox
      if (normalize && normH) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
        const scale = Math.min(w / srcW, h / srcH);
        const dw = srcW * scale, dh = srcH * scale;
        ctx.drawImage(srcImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }

      // Apply imported pipeline operations if any
      if (importedPipeline && importedPipeline.length && !normalize) {
        const tempP = new EditPipeline();
        tempP.setDisplayCanvas(c);
        tempP.original = srcImg;
        tempP.originalWidth = srcW; tempP.originalHeight = srcH;
        tempP.exportWidth = w; tempP.exportHeight = h;
        tempP.operations = importedPipeline.filter(op => !['crop'].includes(op.type));
        tempP.render();
      } else if (!normalize) {
        // Basic draw (normalize already drew above)
        if (filterCSS[filterName]) ctx.filter = filterCSS[filterName];
        ctx.drawImage(srcImg, 0, 0, w, h);
        ctx.filter = 'none';
      }

      // Watermark
      if (watermark) {
        applyPositionedWatermark(c, ctx, watermark, { opacity: wmOpacity });
      }

      // Copyright
      if (addCopyright) {
        ctx.save();
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
        ctx.font = `10px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(`\u00a9 ${new Date().getFullYear()}`, c.width - 6, c.height - 4);
        ctx.restore();
      }

      // Export
      const fmt = format === 'original' ? (bf.file.type?.includes('png') ? 'png' : bf.file.type?.includes('webp') ? 'webp' : 'jpeg') : format;
      const mime = { png:'image/png', jpeg:'image/jpeg', webp:'image/webp' }[fmt] || 'image/png';
      const q = fmt === 'png' ? undefined : quality;
      const ext = fmt === 'jpeg' ? 'jpg' : fmt;
      const filename = batchFilename(bf, index, w, h, ext);
      const subfolder = multiSize ? `${w}w/` : '';

      const blob = await new Promise(r => c.toBlob(r, mime, q));
      results.push({ filename: subfolder + filename, blob });
    }
    return results;
  }

  // --- Preview first image ---
  // Close preview
  document.getElementById('batch-preview-close')?.addEventListener('click', () => {
    document.getElementById('batch-preview-area').style.display = 'none';
  });

  document.getElementById('btn-batch-preview')?.addEventListener('click', async () => {
    if (!batchFiles.length) return;
    const area = document.getElementById('batch-preview-area');
    // Toggle off if already visible
    if (area.style.display !== 'none') { area.style.display = 'none'; return; }
    const idx = Math.min(previewIndex, batchFiles.length - 1);
    const bf = batchFiles[idx];
    area.style.display = '';

    // Update title with image name
    const titleEl = document.getElementById('batch-preview-title');
    if (titleEl) titleEl.textContent = `Preview: ${bf.file.name}`;

    // Show original (scaled to fit 250px max dimension)
    const origCanvas = document.getElementById('batch-preview-original');
    const previewMax = 250;
    const origScale = Math.min(previewMax / bf.img.naturalWidth, previewMax / bf.img.naturalHeight, 1);
    origCanvas.width = Math.round(bf.img.naturalWidth * origScale);
    origCanvas.height = Math.round(bf.img.naturalHeight * origScale);
    origCanvas.getContext('2d').drawImage(bf.img, 0, 0, origCanvas.width, origCanvas.height);

    // Process it (same logic as processOne but capture the result instead of downloading)
    const targetW = +(document.getElementById('batch-w')?.value) || 0;
    const targetH = +(document.getElementById('batch-h')?.value) || 0;
    const lockRatio = document.getElementById('batch-lock')?.checked;
    const filterName = document.getElementById('batch-filter')?.value || 'none';
    const watermark = document.getElementById('batch-watermark')?.value || '';
    const wmOpacity = (+(document.getElementById('batch-wm-opacity')?.value) || 30) / 100;
    const addCopyright = document.getElementById('batch-add-copyright')?.checked;
    const filterCSS = { none:'', grayscale:'grayscale(100%)', sepia:'sepia(100%)', sharpen:'contrast(150%) brightness(110%)', blur:'blur(2px)', invert:'invert(100%)' };

    let w = targetW || bf.img.naturalWidth, h;
    if (targetH && targetW) { h = targetH; }
    else { const ratio = bf.img.naturalHeight / bf.img.naturalWidth; h = lockRatio ? Math.round(w * ratio) : (targetH || bf.img.naturalHeight); }

    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    if (importedPipeline && importedPipeline.length) {
      const tempP = new EditPipeline();
      tempP.setDisplayCanvas(c);
      tempP.original = bf.img;
      tempP.originalWidth = bf.img.naturalWidth; tempP.originalHeight = bf.img.naturalHeight;
      tempP.exportWidth = w; tempP.exportHeight = h;
      tempP.operations = importedPipeline.filter(op => !['crop'].includes(op.type));
      tempP.render();
    } else {
      if (filterCSS[filterName]) ctx.filter = filterCSS[filterName];
      ctx.drawImage(bf.img, 0, 0, w, h);
      ctx.filter = 'none';
    }

    if (watermark) applyPositionedWatermark(c, ctx, watermark, { opacity: wmOpacity });
    if (addCopyright) {
      const crText = (document.getElementById('batch-copyright-text')?.value || '\u00a9 {year}').replace(/\{year\}/g, new Date().getFullYear());
      const crSize = Math.max(10, Math.round(Math.min(c.width, c.height) * 0.025));
      ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
      ctx.font = `${crSize}px Inter, system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      // Subtle shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
      ctx.fillText(crText, c.width - crSize * 0.5, c.height - crSize * 0.4); ctx.restore();
    }

    // Show result (scaled to same max dimension for consistent comparison)
    const resCanvas = document.getElementById('batch-preview-result');
    const resScale = Math.min(previewMax / c.width, previewMax / c.height, 1);
    resCanvas.width = Math.round(c.width * resScale);
    resCanvas.height = Math.round(c.height * resScale);
    resCanvas.getContext('2d').drawImage(c, 0, 0, resCanvas.width, resCanvas.height);

    // Get result blob for size info
    const origSize = bf.file.size;
    const resultBlob = await new Promise(r => {
      const fmt = document.getElementById('batch-format')?.value || 'png';
      const mime = { png:'image/png', jpeg:'image/jpeg', webp:'image/webp' }[fmt === 'original' ? 'png' : fmt] || 'image/png';
      const q = fmt === 'png' ? undefined : (+(document.getElementById('batch-quality')?.value) || 85) / 100;
      c.toBlob(r, mime, q);
    });

    // Click either canvas to view both side by side at full size
    const origDataUrl = bf.canvas.toDataURL('image/jpeg', 0.8);
    const resDataUrl = c.toDataURL('image/jpeg', 0.8);
    const viewBoth = () => {
      pixDialog.alert('Compare: ' + bf.file.name,
        `<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;justify-content:center;">` +
        `<div style="flex:1;min-width:200px;text-align:center;"><div style="color:var(--slate-400);margin-bottom:4px;">Original (${bf.img.naturalWidth}\u00d7${bf.img.naturalHeight} | ${(origSize/1024).toFixed(0)} KB)</div><img src="${origDataUrl}" style="max-width:100%;max-height:50vh;border-radius:4px;border:1px solid var(--slate-700);"></div>` +
        `<div style="flex:1;min-width:200px;text-align:center;"><div style="color:var(--slate-400);margin-bottom:4px;">Result (${c.width}\u00d7${c.height} | ${(resultBlob.size/1024).toFixed(0)} KB)</div><img src="${resDataUrl}" style="max-width:100%;max-height:50vh;border-radius:4px;border:1px solid var(--slate-700);"></div>` +
        `</div>`
      );
    };
    origCanvas.style.cursor = 'pointer'; origCanvas.onclick = viewBoth;
    resCanvas.style.cursor = 'pointer'; resCanvas.onclick = viewBoth;

    // Info
    const info = document.getElementById('batch-preview-info');
    info.textContent = `Original: ${bf.img.naturalWidth}\u00d7${bf.img.naturalHeight} (${(origSize/1024).toFixed(0)} KB) \u2192 Result: ${c.width}\u00d7${c.height} (${(resultBlob.size/1024).toFixed(0)} KB) | ${importedPipeline ? importedPipeline.length + ' pipeline ops' : 'No pipeline'} | Click to compare full size`;
  });

  // --- Auto-refresh preview when settings change ---
  let previewTimer = null;
  function schedulePreviewRefresh() {
    if (document.getElementById('batch-preview-area')?.style.display === 'none') return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { document.getElementById('btn-batch-preview')?.click(); document.getElementById('btn-batch-preview')?.click(); }, 300);
  }
  // Hmm double-click would toggle off then on. Let me use a direct refresh instead:
  async function refreshPreview() {
    if (document.getElementById('batch-preview-area')?.style.display === 'none') return;
    if (!batchFiles.length) return;
    // Force show and re-render
    document.getElementById('batch-preview-area').style.display = 'none';
    document.getElementById('btn-batch-preview')?.click();
  }
  const batchSettingIds = ['batch-w','batch-h','batch-filter','batch-watermark','batch-wm-opacity','batch-wm-mode','batch-wm-position','batch-wm-color','batch-wm-font','batch-format','batch-quality','batch-lock','batch-multi-size','batch-sizes','batch-strip-meta','batch-add-copyright','batch-copyright-text','batch-rename','batch-crop-t','batch-crop-r','batch-crop-b','batch-crop-l','batch-ratio-enforce','batch-normalize'];
  batchSettingIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => { clearTimeout(previewTimer); previewTimer = setTimeout(refreshPreview, 400); };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });

  // --- Process all ---
  document.getElementById('btn-batch-process')?.addEventListener('click', async () => {
    const checked = getChecked();
    if (!checked.length) return;
    const btn = document.getElementById('btn-batch-process');
    btn.disabled = true; btn.textContent = 'Processing...';

    const progress = document.getElementById('batch-progress');
    const bar = document.getElementById('batch-progress-bar');
    const text = document.getElementById('batch-progress-text');
    progress.style.display = '';

    const useZip = document.getElementById('batch-zip')?.checked;
    const allResults = [];

    for (let i = 0; i < checked.length; i++) {
      const pct = Math.round(((i + 1) / checked.length) * 100);
      bar.style.width = pct + '%';
      text.textContent = `Processing ${i + 1} / ${checked.length}: ${checked[i].file.name}`;
      const results = await processOne(checked[i], i);
      allResults.push(...results);
    }

    if (useZip && typeof ZipWriter !== 'undefined') {
      text.textContent = `Zipping ${allResults.length} files...`;
      const zip = new ZipWriter();
      for (const r of allResults) {
        await zip.addBlob(r.filename, r.blob);
      }
      const zipBlob = zip.toBlob();
      const zipUrl = URL.createObjectURL(zipBlob);
      chrome.runtime.sendMessage({ action: 'download', url: zipUrl, filename: 'pixeroo/batch-export.zip', saveAs: true });
      const origTotal = checked.reduce((s, bf) => s + bf.file.size, 0);
      const pctSaved = origTotal > 0 ? Math.round((1 - zipBlob.size / origTotal) * 100) : 0;
      text.textContent = `Done! ${allResults.length} files zipped (${(zipBlob.size / 1024 / 1024).toFixed(1)} MB) | Original: ${(origTotal/1024/1024).toFixed(1)} MB \u2192 ${pctSaved}% ${pctSaved >= 0 ? 'smaller' : 'larger'}`;
    } else {
      // Individual downloads
      for (const r of allResults) {
        chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(r.blob), filename: `pixeroo/batch/${r.filename}`, saveAs: false });
        await new Promise(res => setTimeout(res, 50));
      }
      const origTotal = checked.reduce((s, bf) => s + bf.file.size, 0);
      const outTotal = allResults.reduce((s, r) => s + r.blob.size, 0);
      const pctSaved = origTotal > 0 ? Math.round((1 - outTotal / origTotal) * 100) : 0;
      text.textContent = `Done! ${allResults.length} files | Original: ${(origTotal/1024/1024).toFixed(1)} MB \u2192 Output: ${(outTotal/1024/1024).toFixed(1)} MB (${pctSaved}% ${pctSaved >= 0 ? 'smaller' : 'larger'})`;
    }

    bar.style.width = '100%';
    btn.disabled = false; btn.textContent = 'Process All';
  });

  // --- Clear All ---
  // Add from Library button
  document.getElementById('btn-batch-from-lib')?.addEventListener('click', () => {
    openLibraryPicker(async (items) => {
      for (const item of items) {
        const img = new Image();
        img.src = item.dataUrl;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        // Create a minimal file-like object for name/type/size
        const fakeFile = { name: item.name || 'library-image.png', type: 'image/png', size: item.dataUrl.length };
        batchFiles.push({ file: fakeFile, img, canvas: c, checked: true });
      }
      _updateBatchUI();
    });
  });

  document.getElementById('btn-batch-sel-all')?.addEventListener('click', () => {
    batchFiles.forEach(bf => { bf.checked = true; }); _updateBatchUI();
  });
  document.getElementById('btn-batch-sel-none')?.addEventListener('click', () => {
    batchFiles.forEach(bf => { bf.checked = false; }); _updateBatchUI();
  });

  document.getElementById('btn-batch-clear')?.addEventListener('click', async () => {
    if (batchFiles.length) {
      const ok = await pixDialog.confirm('Clear Batch', `Remove all ${batchFiles.length} images from the batch?`, { danger: true, okText: 'Clear' });
      if (!ok) return;
    }
    batchFiles = []; importedPipeline = null;
    document.getElementById('batch-pipeline-info').textContent = 'No pipeline';
    document.getElementById('batch-progress').style.display = 'none';
    _updateBatchUI();
  });

  // --- 1. LQIP: Lazy Load Placeholders ---
  // --- Helper: download or add to zip ---
  async function batchOutput(filename, blob) {
    const useZip = document.getElementById('batch-zip')?.checked;
    if (useZip && window._batchZip) {
      await window._batchZip.addBlob(filename, blob);
    } else {
      chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/batch/${filename}`, saveAs: false });
      await new Promise(r => setTimeout(r, 50));
    }
  }

  async function startBatchZip() {
    if (document.getElementById('batch-zip')?.checked && typeof ZipWriter !== 'undefined') {
      window._batchZip = new ZipWriter();
      return true;
    }
    window._batchZip = null;
    return false;
  }

  async function finishBatchZip(label) {
    if (window._batchZip) {
      const zipBlob = window._batchZip.toBlob();
      chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(zipBlob), filename: `pixeroo/${label}.zip`, saveAs: true });
      const footer = document.getElementById('footer-status');
      if (footer) footer.textContent = `${label}: ${(zipBlob.size / 1024 / 1024).toFixed(1)} MB zip`;
      window._batchZip = null;
    }
  }

  // --- 1. LQIP ---
  document.getElementById('btn-batch-lqip')?.addEventListener('click', async () => {
    const checked = getChecked(); if (!checked.length) return;
    const json = {};
    await startBatchZip();

    for (const bf of checked) {
      const baseName = bf.file.name.replace(/\.[^.]+$/, '');
      const lqipW = +(document.getElementById('batch-lqip-size')?.value) || 20;
      const tiny = document.createElement('canvas'); tiny.width = lqipW;
      tiny.height = Math.round(lqipW * bf.img.naturalHeight / bf.img.naturalWidth);
      const tc = tiny.getContext('2d');
      tc.filter = 'blur(2px)'; tc.drawImage(bf.img, 0, 0, tiny.width, tiny.height);
      json[baseName] = tiny.toDataURL('image/jpeg', 0.3);
      // Also output actual tiny image file
      const imgBlob = await new Promise(r => tiny.toBlob(r, 'image/jpeg', 0.3));
      await batchOutput(`lqip/${baseName}-lqip.jpg`, imgBlob);
    }

    // Also output the JSON mapping file
    const jsonBlob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    await batchOutput('lqip/placeholders.json', jsonBlob);
    await finishBatchZip('lqip');
    pixDialog.alert('LQIP Placeholders Generated', `<div style="">Generated ${checked.length} tiny blurred images + JSON map.<br><br>Usage:<br><code style="background:var(--slate-800);padding:2px 6px;border-radius:3px;">&lt;img src="photo-lqip.jpg" data-src="photo.jpg" loading="lazy"&gt;</code></div>`);
  });

  // --- 2. Social Preset Batch ---
  document.getElementById('btn-batch-social')?.addEventListener('click', async () => {
    const checked = getChecked(); if (!checked.length) return;
    const btn = document.getElementById('btn-batch-social'); btn.disabled = true; btn.textContent = '...';
    const presets = [
      { name: 'ig-post', w: 1080, h: 1080 },
      { name: 'ig-story', w: 1080, h: 1920 },
      { name: 'fb-cover', w: 820, h: 312 },
      { name: 'tw-header', w: 1500, h: 500 },
      { name: 'yt-thumb', w: 1280, h: 720 },
    ];
    await startBatchZip();
    for (const bf of checked) {
      const baseName = bf.file.name.replace(/\.[^.]+$/, '');
      for (const p of presets) {
        const c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
        const ctx = c.getContext('2d');
        const scale = Math.max(p.w / bf.img.naturalWidth, p.h / bf.img.naturalHeight);
        const sw = bf.img.naturalWidth * scale, sh = bf.img.naturalHeight * scale;
        ctx.drawImage(bf.img, (p.w - sw) / 2, (p.h - sh) / 2, sw, sh);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
        await batchOutput(`social/${baseName}-${p.name}.jpg`, blob);
      }
    }
    await finishBatchZip('social-batch');
    btn.disabled = false; btn.textContent = 'Social';
    document.getElementById('footer-status').textContent = `Social: ${checked.length} images \u00d7 ${presets.length} sizes = ${checked.length * presets.length} files`;
  });

  // --- 3. Processing Report ---
  document.getElementById('btn-batch-report')?.addEventListener('click', async () => {
    const checked = getChecked(); if (!checked.length) return;
    let html = '<!DOCTYPE html><html><head><title>Pixeroo Batch Report</title><style>body{font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:2rem;max-width:900px;margin:0 auto;}table{width:100%;border-collapse:collapse;margin:1rem 0;}th,td{padding:8px 12px;border-bottom:1px solid #334155;text-align:left;font-size:0.875rem;}th{color:#94a3b8;font-weight:600;}img{max-height:60px;border-radius:4px;}</style></head><body>';
    html += `<h1>Pixeroo Batch Report</h1><p style="color:#94a3b8;">${new Date().toLocaleString()} | ${checked.length} images</p>`;
    html += '<table><tr><th>#</th><th>Preview</th><th>Filename</th><th>Dimensions</th><th>Format</th><th>Size</th></tr>';
    checked.forEach((bf, i) => {
      const thumb = bf.canvas.toDataURL('image/jpeg', 0.3);
      html += `<tr><td>${i + 1}</td><td><img src="${thumb}"></td><td>${bf.file.name}</td><td>${bf.img.naturalWidth}\u00d7${bf.img.naturalHeight}</td><td>${bf.file.type || '?'}</td><td>${(bf.file.size / 1024).toFixed(0)} KB</td></tr>`;
    });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    await startBatchZip();
    await batchOutput('report.html', blob);
    await finishBatchZip('batch-report');
  });

  // --- 4. Aspect Ratio + 5. Normalization: handled in processOne ---

  // --- 6. Duplicate Detection ---
  document.getElementById('btn-batch-dupes')?.addEventListener('click', () => {
    const checked = getChecked(); if (checked.length < 2) return;
    // Compute perceptual hash for each (8x8 grayscale average)
    function pHash(img) {
      const c = document.createElement('canvas'); c.width = 8; c.height = 8;
      c.getContext('2d').drawImage(img, 0, 0, 8, 8);
      const d = c.getContext('2d').getImageData(0, 0, 8, 8).data;
      let avg = 0;
      for (let i = 0; i < 64; i++) avg += (d[i*4] + d[i*4+1] + d[i*4+2]) / 3;
      avg /= 64;
      let hash = '';
      for (let i = 0; i < 64; i++) hash += ((d[i*4] + d[i*4+1] + d[i*4+2]) / 3 > avg) ? '1' : '0';
      return hash;
    }
    function hammingDist(a, b) { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; }

    const hashes = checked.map(bf => ({ bf, hash: pHash(bf.img) }));
    const dupes = [];
    for (let i = 0; i < hashes.length; i++) {
      for (let j = i + 1; j < hashes.length; j++) {
        const dist = hammingDist(hashes[i].hash, hashes[j].hash);
        if (dist < 10) dupes.push({ a: hashes[i].bf.file.name, b: hashes[j].bf.file.name, similarity: Math.round((1 - dist/64) * 100) });
      }
    }
    if (dupes.length === 0) { pixDialog.alert('Duplicate Check', 'No similar images found.'); return; }
    let html = `<div style="">Found ${dupes.length} potential duplicate pair(s):</div>`;
    html += '<table style="width:100%;border-collapse:collapse;margin-top:8px;">';
    html += '<tr style="border-bottom:1px solid var(--slate-700);"><th style="text-align:left;padding:4px;">Image A</th><th style="text-align:left;padding:4px;">Image B</th><th style="text-align:center;padding:4px;">Similarity</th></tr>';
    dupes.forEach(d => {
      const color = d.similarity > 95 ? '#ef4444' : d.similarity > 85 ? '#eab308' : 'var(--slate-400)';
      html += `<tr style="border-bottom:1px solid var(--slate-800);"><td style="padding:4px;">${d.a}</td><td style="padding:4px;">${d.b}</td><td style="text-align:center;padding:4px;color:${color};">${d.similarity}%</td></tr>`;
    });
    html += '</table>';
    pixDialog.alert('Duplicate Detection', html);
  });

  // --- 7. Drag Reorder ---
  // Handled in _updateBatchUI — cards get draggable attribute

  // --- 8. Presets (save/load batch settings to chrome.storage) ---
  function getBatchSettings() {
    return {
      w: document.getElementById('batch-w')?.value || '',
      h: document.getElementById('batch-h')?.value || '',
      lock: document.getElementById('batch-lock')?.checked,
      filter: document.getElementById('batch-filter')?.value || 'none',
      watermark: document.getElementById('batch-watermark')?.value || '',
      wmOpacity: document.getElementById('batch-wm-opacity')?.value || '30',
      wmMode: document.getElementById('batch-wm-mode')?.value || 'text',
      wmPosition: document.getElementById('batch-wm-position')?.value || 'center',
      wmColor: document.getElementById('batch-wm-color')?.value || '#ffffff',
      wmFont: document.getElementById('batch-wm-font')?.value || 'Inter, system-ui, sans-serif',
      format: document.getElementById('batch-format')?.value || 'png',
      quality: document.getElementById('batch-quality')?.value || '85',
      stripMeta: document.getElementById('batch-strip-meta')?.checked,
      copyright: document.getElementById('batch-add-copyright')?.checked,
      copyrightText: document.getElementById('batch-copyright-text')?.value || '',
      rename: document.getElementById('batch-rename')?.value || '{name}',
      multiSize: document.getElementById('batch-multi-size')?.checked,
      sizes: document.getElementById('batch-sizes')?.value || '150,600,1200',
      ratio: document.getElementById('batch-ratio-enforce')?.value || 'none',
      normalize: document.getElementById('batch-normalize')?.checked,
      cropT: document.getElementById('batch-crop-t')?.value || '0',
      cropR: document.getElementById('batch-crop-r')?.value || '0',
      cropB: document.getElementById('batch-crop-b')?.value || '0',
      cropL: document.getElementById('batch-crop-l')?.value || '0',
      zip: document.getElementById('batch-zip')?.checked,
    };
  }

  function applyBatchSettings(s) {
    if (!s) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = !!val; else el.value = val; } };
    set('batch-w', s.w); set('batch-h', s.h); set('batch-lock', s.lock);
    set('batch-filter', s.filter); set('batch-watermark', s.watermark);
    set('batch-wm-opacity', s.wmOpacity); set('batch-wm-mode', s.wmMode);
    set('batch-wm-position', s.wmPosition); set('batch-wm-color', s.wmColor);
    set('batch-wm-font', s.wmFont); set('batch-format', s.format);
    set('batch-quality', s.quality); set('batch-strip-meta', s.stripMeta);
    set('batch-add-copyright', s.copyright); set('batch-copyright-text', s.copyrightText);
    set('batch-rename', s.rename); set('batch-multi-size', s.multiSize);
    set('batch-sizes', s.sizes); set('batch-ratio-enforce', s.ratio);
    set('batch-normalize', s.normalize); set('batch-zip', s.zip);
    set('batch-crop-t', s.cropT); set('batch-crop-r', s.cropR);
    set('batch-crop-b', s.cropB); set('batch-crop-l', s.cropL);
    // Update labels
    document.getElementById('batch-wm-opacity-val').textContent = s.wmOpacity || '30';
    document.getElementById('batch-quality-val').textContent = s.quality || '85';
    updateRenamePreview();
  }

  function loadPresetList() {
    chrome.storage.local.get({ batchPresets: {} }, (r) => {
      const sel = document.getElementById('batch-preset-list');
      if (!sel) return;
      sel.innerHTML = '<option value="">Presets...</option>';
      for (const name of Object.keys(r.batchPresets).sort()) {
        const opt = document.createElement('option'); opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
      }
    });
  }
  loadPresetList();

  document.getElementById('btn-batch-save-preset')?.addEventListener('click', async () => {
    const name = await pixDialog.prompt('Save Batch Preset', 'Preset name:', 'My Preset');
    if (!name) return;
    const settings = getBatchSettings();
    chrome.storage.local.get({ batchPresets: {} }, (r) => {
      r.batchPresets[name] = settings;
      chrome.storage.local.set({ batchPresets: r.batchPresets }, () => {
        loadPresetList();
        document.getElementById('footer-status').textContent = `Preset "${name}" saved`;
      });
    });
  });

  document.getElementById('batch-preset-list')?.addEventListener('change', (e) => {
    const name = e.target.value; if (!name) return;
    chrome.storage.local.get({ batchPresets: {} }, (r) => {
      if (r.batchPresets[name]) {
        applyBatchSettings(r.batchPresets[name]);
        document.getElementById('footer-status').textContent = `Preset "${name}" loaded`;
      }
    });
    e.target.value = '';
  });

  document.getElementById('btn-batch-del-preset')?.addEventListener('click', () => {
    const sel = document.getElementById('batch-preset-list');
    const name = sel?.value; if (!name) return;
    chrome.storage.local.get({ batchPresets: {} }, (r) => {
      delete r.batchPresets[name];
      chrome.storage.local.set({ batchPresets: r.batchPresets }, () => {
        loadPresetList();
        document.getElementById('footer-status').textContent = `Preset "${name}" deleted`;
      });
    });
  });

  // --- Right-click context menu on batch area ---
  document.getElementById('batch-queue')?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
    const has = batchFiles.length > 0;

    const items = [
      { label: `${getChecked().length}/${batchFiles.length} selected`, enabled: false },
      { sep: true },
      { label: 'Select All', enabled: has, action: () => { document.getElementById('btn-batch-sel-all')?.click(); } },
      { label: 'Deselect All', enabled: has, action: () => { document.getElementById('btn-batch-sel-none')?.click(); } },
      { sep: true },
      { label: 'Clear All', enabled: has, danger: true, action: () => { document.getElementById('btn-batch-clear')?.click(); } },
      { label: 'Check Consistency', enabled: has, action: () => { document.getElementById('btn-batch-check')?.click(); } },
      { sep: true },
      { header: 'Sort' },
      { label: 'Sort by Name', enabled: has, action: () => { batchFiles.sort((a,b) => a.file.name.localeCompare(b.file.name)); _updateBatchUI(); } },
      { label: 'Sort by Size (small first)', enabled: has, action: () => { batchFiles.sort((a,b) => a.file.size - b.file.size); _updateBatchUI(); } },
      { label: 'Sort by Size (large first)', enabled: has, action: () => { batchFiles.sort((a,b) => b.file.size - a.file.size); _updateBatchUI(); } },
      { label: 'Sort by Width', enabled: has, action: () => { batchFiles.sort((a,b) => a.img.naturalWidth - b.img.naturalWidth); _updateBatchUI(); } },
      { sep: true },
      { label: 'Remove Duplicates', enabled: has, action: () => {
        const seen = new Set();
        batchFiles = batchFiles.filter(bf => { const k = bf.file.name + bf.file.size; if (seen.has(k)) return false; seen.add(k); return true; });
        _updateBatchUI();
      }},
    ];

    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    let lastWasSep = true;
    for (const item of items) {
      if (item.sep) { if (!lastWasSep) { const s = document.createElement('div'); s.className = 'ctx-menu-sep'; menu.appendChild(s); lastWasSep = true; } continue; }
      if (item.header) { const h = document.createElement('div'); h.className = 'ctx-menu-header'; h.textContent = item.header; menu.appendChild(h); lastWasSep = false; continue; }
      if (!item.enabled && item.enabled !== undefined) continue;
      const el = document.createElement('div');
      el.className = 'ctx-menu-item' + (item.danger ? ' danger' : '');
      el.textContent = item.label;
      if (item.action) el.addEventListener('click', () => { menu.remove(); item.action(); });
      menu.appendChild(el);
      lastWasSep = false;
    }
    if (menu.lastChild?.classList?.contains('ctx-menu-sep')) menu.lastChild.remove();

    menu.style.left = e.clientX + 'px'; menu.style.top = e.clientY + 'px';
    document.body.appendChild(menu);
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 4) + 'px';
      if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 4) + 'px';
    });
    setTimeout(() => {
      const close = (ev) => {
        if (ev.type === 'keydown' && ev.key !== 'Escape') return;
        if (ev.type === 'mousedown' && menu.contains(ev.target)) return;
        menu.remove(); document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close);
      };
      document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    }, 50);
  });
}

// ============================================================
// MODE: Social Media
// ============================================================

const SOCIAL_PLATFORM_PRESETS = {
  'tw-header':    { w: 1500, h: 500,  name: 'twitter-header' },
  'tw-post':      { w: 1200, h: 675,  name: 'twitter-post' },
  'tw-profile':   { w: 400,  h: 400,  name: 'twitter-profile' },
  'ig-post':      { w: 1080, h: 1080, name: 'instagram-post' },
  'ig-story':     { w: 1080, h: 1920, name: 'instagram-story' },
  'ig-landscape': { w: 1080, h: 566,  name: 'instagram-landscape' },
  'ig-profile':   { w: 320,  h: 320,  name: 'instagram-profile' },
  'fb-cover':     { w: 820,  h: 312,  name: 'facebook-cover' },
  'fb-post':      { w: 1200, h: 630,  name: 'facebook-post' },
  'fb-profile':   { w: 180,  h: 180,  name: 'facebook-profile' },
  'fb-event':     { w: 1920, h: 1005, name: 'facebook-event' },
  'li-banner':    { w: 1584, h: 396,  name: 'linkedin-banner' },
  'li-post':      { w: 1200, h: 627,  name: 'linkedin-post' },
  'li-profile':   { w: 400,  h: 400,  name: 'linkedin-profile' },
  'yt-thumb':     { w: 1280, h: 720,  name: 'youtube-thumbnail' },
  'yt-banner':    { w: 2560, h: 1440, name: 'youtube-banner' },
  'pin-standard': { w: 1000, h: 1500, name: 'pinterest-standard' },
  'pin-square':   { w: 1000, h: 1000, name: 'pinterest-square' },
  'tt-post':      { w: 1080, h: 1920, name: 'tiktok-post' },
  'dc-avatar':    { w: 128,  h: 128,  name: 'discord-avatar' },
  'dc-banner':    { w: 960,  h: 540,  name: 'discord-banner' },
};

function initSocial() {
  const canvas = document.getElementById('social-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let socialImg = null;

  const platformSel = document.getElementById('social-platform');
  const fitSel = document.getElementById('social-fit');
  const bgColor = document.getElementById('social-bg-color');
  const textInput = document.getElementById('social-text');
  const textColor = document.getElementById('social-text-color');
  const textPos = document.getElementById('social-text-pos');
  const dimsEl = document.getElementById('social-dims');
  const dropzone = document.getElementById('social-dropzone');

  // Drop zone for source image
  setupDropzone(dropzone, document.getElementById('social-file'), async (file) => {
    socialImg = await loadImg(file);
    if (!socialImg) return;
    dropzone.style.display = 'none';
    canvas.style.display = 'block';
    // Show original on canvas as preview
    canvas.width = socialImg.naturalWidth;
    canvas.height = socialImg.naturalHeight;
    ctx.drawImage(socialImg, 0, 0);
  });

  // Add from Library button
  document.getElementById('btn-social-from-lib')?.addEventListener('click', () => {
    openLibraryPicker(async (items) => {
      const item = items[0]; if (!item) return;
      const img = new Image();
      img.src = item.dataUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      socialImg = img;
      dropzone.style.display = 'none';
      canvas.style.display = 'block';
      canvas.width = socialImg.naturalWidth;
      canvas.height = socialImg.naturalHeight;
      ctx.drawImage(socialImg, 0, 0);
    }, { singleSelect: true });
  });

  // Platform selection -> show dims
  platformSel.addEventListener('change', () => {
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (preset) {
      dimsEl.textContent = `${preset.w} \u00d7 ${preset.h}`;
    } else {
      dimsEl.textContent = 'Select a platform';
    }
  });

  // Generate button
  document.getElementById('btn-social-generate').addEventListener('click', () => {
    if (!socialImg) { pixDialog.alert('No Image', 'Drop or select a source image first.'); return; }
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (!preset) { pixDialog.alert('No Platform', 'Select a social media platform preset.'); return; }

    const tw = preset.w, th = preset.h;
    canvas.width = tw; canvas.height = th;

    const sw = socialImg.naturalWidth, sh = socialImg.naturalHeight;
    const fit = fitSel.value;

    if (fit === 'cover') {
      // Scale to fill, crop center
      const scale = Math.max(tw / sw, th / sh);
      const dw = sw * scale, dh = sh * scale;
      const dx = (tw - dw) / 2, dy = (th - dh) / 2;
      ctx.drawImage(socialImg, dx, dy, dw, dh);
    } else if (fit === 'contain') {
      // Scale to fit, fill background
      ctx.fillStyle = bgColor.value;
      ctx.fillRect(0, 0, tw, th);
      const scale = Math.min(tw / sw, th / sh);
      const dw = sw * scale, dh = sh * scale;
      const dx = (tw - dw) / 2, dy = (th - dh) / 2;
      ctx.drawImage(socialImg, dx, dy, dw, dh);
    } else {
      // Stretch
      ctx.drawImage(socialImg, 0, 0, tw, th);
    }

    // Text overlay
    const txt = textInput.value.trim();
    if (txt) {
      const fontSize = Math.max(16, Math.round(Math.min(tw, th) * 0.06));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = textColor.value;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      let tx = tw / 2, ty;
      const pos = textPos.value;
      if (pos === 'top') ty = fontSize * 1.5;
      else if (pos === 'bottom') ty = th - fontSize * 1.5;
      else ty = th / 2;

      ctx.fillText(txt, tx, ty);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    canvas.style.display = 'block';
    dimsEl.textContent = `${tw} \u00d7 ${th}`;
  });

  // Download
  document.getElementById('btn-social-download').addEventListener('click', () => {
    if (!canvas.width || !canvas.height) return;
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    const name = preset ? preset.name : 'social';
    canvas.toBlob((blob) => {
      if (!blob) return;
      chrome.runtime.sendMessage({ action: 'download', url: URL.createObjectURL(blob), filename: `pixeroo/${name}.png`, saveAs: true });
    }, 'image/png');
  });

  // Copy to clipboard
  document.getElementById('btn-social-copy').addEventListener('click', async () => {
    if (!canvas.width || !canvas.height) return;
    try {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (e) {
      pixDialog.alert('Copy Failed', 'Could not copy image to clipboard.');
    }
  });
}

// ============================================================
// MODE: Compare
// ============================================================

function initCompare() {
  let iA=null, iB=null;
  setupDropzone(document.getElementById('compare-drop-a'),document.getElementById('compare-file-a'),async(f)=>{iA=await loadImg(f);if(!iA)return;const c=document.getElementById('compare-canvas-a');c.style.display='block';c.width=iA.naturalWidth;c.height=iA.naturalHeight;c.getContext('2d').drawImage(iA,0,0);document.getElementById('compare-drop-a').style.display='none';document.getElementById('compare-info-a').textContent=`${iA.naturalWidth}x${iA.naturalHeight} | ${f.name}`;});
  setupDropzone(document.getElementById('compare-drop-b'),document.getElementById('compare-file-b'),async(f)=>{iB=await loadImg(f);if(!iB)return;const c=document.getElementById('compare-canvas-b');c.style.display='block';c.width=iB.naturalWidth;c.height=iB.naturalHeight;c.getContext('2d').drawImage(iB,0,0);document.getElementById('compare-drop-b').style.display='none';document.getElementById('compare-info-b').textContent=`${iB.naturalWidth}x${iB.naturalHeight} | ${f.name}`;});

  document.getElementById('btn-compare-diff').addEventListener('click',()=>{
    if(!iA||!iB)return;const w=Math.min(iA.naturalWidth,iB.naturalWidth),h=Math.min(iA.naturalHeight,iB.naturalHeight);
    const cA=document.createElement('canvas');cA.width=w;cA.height=h;cA.getContext('2d',{willReadFrequently:true}).drawImage(iA,0,0,w,h);
    const cB=document.createElement('canvas');cB.width=w;cB.height=h;cB.getContext('2d',{willReadFrequently:true}).drawImage(iB,0,0,w,h);
    const dA=cA.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),dB=cB.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),diff=new ImageData(w,h);let dc=0;
    for(let i=0;i<dA.data.length;i+=4){const d=Math.abs(dA.data[i]-dB.data[i])+Math.abs(dA.data[i+1]-dB.data[i+1])+Math.abs(dA.data[i+2]-dB.data[i+2]);if(d>30){diff.data[i]=255;diff.data[i+1]=0;diff.data[i+2]=0;diff.data[i+3]=255;dc++;}else{diff.data[i]=dA.data[i];diff.data[i+1]=dA.data[i+1];diff.data[i+2]=dA.data[i+2];diff.data[i+3]=80;}}
    const co=document.getElementById('compare-canvas-b');co.width=w;co.height=h;co.getContext('2d').putImageData(diff,0,0);
    document.getElementById('compare-info-b').textContent=`Diff: ${((dc/(w*h))*100).toFixed(1)}% (${dc} px)`;
  });
  document.getElementById('btn-compare-swap').addEventListener('click',()=>{const t=iA;iA=iB;iB=t;if(iA){const c=document.getElementById('compare-canvas-a');c.width=iA.naturalWidth;c.height=iA.naturalHeight;c.getContext('2d').drawImage(iA,0,0);}if(iB){const c=document.getElementById('compare-canvas-b');c.width=iB.naturalWidth;c.height=iB.naturalHeight;c.getContext('2d').drawImage(iB,0,0);}});

  // Compare guides (center crosshair, default off)
  let cmpGuidesA = null, cmpGuidesB = null;
  document.getElementById('btn-compare-guides')?.addEventListener('click', (e) => {
    const cA = document.getElementById('compare-canvas-a');
    const cB = document.getElementById('compare-canvas-b');
    if (!cA.width && !cB.width) return;
    if (!cmpGuidesA && cA.width) {
      cmpGuidesA = new CanvasGuides(cA.parentElement, cA, { showRuler: false, showGrid: false, showCenter: true });
    }
    if (!cmpGuidesB && cB.width) {
      cmpGuidesB = new CanvasGuides(cB.parentElement, cB, { showRuler: false, showGrid: false, showCenter: true });
    }
    const on = cmpGuidesA?.toggle();
    cmpGuidesB?.toggle();
    e.currentTarget.classList.toggle('active', on);
  });

  // --- Before/After Slider ---
  document.getElementById('btn-compare-slider')?.addEventListener('click', () => {
    if (!iA || !iB) return;
    const container = document.getElementById('compare-container');
    const sliderView = document.getElementById('compare-slider-view');
    const isSlider = sliderView.style.display !== 'none';

    if (isSlider) {
      // Switch back to side-by-side
      sliderView.style.display = 'none';
      container.style.display = 'flex';
      document.getElementById('btn-compare-slider').classList.remove('active');
      return;
    }

    // Switch to slider view
    container.style.display = 'none';
    sliderView.style.display = 'block';
    document.getElementById('btn-compare-slider').classList.add('active');

    // Draw both images onto slider canvases at same size
    const w = Math.max(iA.naturalWidth, iB.naturalWidth);
    const h = Math.max(iA.naturalHeight, iB.naturalHeight);
    const cA = document.getElementById('compare-slider-a');
    const cB = document.getElementById('compare-slider-b');
    cA.width = w; cA.height = h;
    cB.width = w; cB.height = h;
    cA.getContext('2d').drawImage(iA, 0, 0, w, h);
    cB.getContext('2d').drawImage(iB, 0, 0, w, h);

    // Reset slider to 50%
    _setSliderPos(50);
  });

  function _setSliderPos(pct) {
    pct = Math.max(0, Math.min(100, pct));
    const cB = document.getElementById('compare-slider-b');
    const line = document.getElementById('compare-slider-line');
    const handle = document.getElementById('compare-slider-handle');
    cB.style.clipPath = `inset(0 0 0 ${pct}%)`;
    line.style.left = pct + '%';
    handle.style.left = pct + '%';
  }

  // Drag handling for slider
  const sliderView = document.getElementById('compare-slider-view');
  let sliderDragging = false;

  function sliderMove(e) {
    if (!sliderDragging) return;
    const rect = sliderView.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    _setSliderPos((x / rect.width) * 100);
  }

  sliderView?.addEventListener('mousedown', (e) => { sliderDragging = true; sliderMove(e); });
  sliderView?.addEventListener('touchstart', (e) => { sliderDragging = true; sliderMove(e); }, { passive: true });
  window.addEventListener('mousemove', sliderMove);
  window.addEventListener('touchmove', sliderMove, { passive: true });
  window.addEventListener('mouseup', () => { sliderDragging = false; });
  window.addEventListener('touchend', () => { sliderDragging = false; });

  // Library buttons for Compare A and B (single-select)
  document.getElementById('btn-compare-lib-a')?.addEventListener('click', () => {
    openLibraryPicker(async (items) => {
      const item = items[0]; if (!item) return;
      const img = new Image();
      img.src = item.dataUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      iA = img;
      const c = document.getElementById('compare-canvas-a');
      c.style.display = 'block'; c.width = iA.naturalWidth; c.height = iA.naturalHeight;
      c.getContext('2d').drawImage(iA, 0, 0);
      document.getElementById('compare-drop-a').style.display = 'none';
      document.getElementById('compare-info-a').textContent = `${iA.naturalWidth}x${iA.naturalHeight} | ${item.name}`;
    }, { singleSelect: true });
  });

  document.getElementById('btn-compare-lib-b')?.addEventListener('click', () => {
    openLibraryPicker(async (items) => {
      const item = items[0]; if (!item) return;
      const img = new Image();
      img.src = item.dataUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      iB = img;
      const c = document.getElementById('compare-canvas-b');
      c.style.display = 'block'; c.width = iB.naturalWidth; c.height = iB.naturalHeight;
      c.getContext('2d').drawImage(iB, 0, 0);
      document.getElementById('compare-drop-b').style.display = 'none';
      document.getElementById('compare-info-b').textContent = `${iB.naturalWidth}x${iB.naturalHeight} | ${item.name}`;
    }, { singleSelect: true });
  });
}

// ============================================================
// MODE: OCR
// ============================================================

// OCR removed from v1 -- Tesseract.js is 6MB+, triggers Chrome review scrutiny

// ============================================================
// Library Picker — shared modal for all tools
// ============================================================

async function openLibraryPicker(onAdd, options) {
  // onAdd receives array of { dataUrl, name, width, height }
  // options: { singleSelect: true } for compare tool
  const singleSelect = options?.singleSelect || false;
  const backdrop = document.getElementById('lib-picker-backdrop');
  const grid = document.getElementById('lib-picker-grid');
  const countEl = document.getElementById('lib-picker-count');
  const selectedEl = document.getElementById('lib-picker-selected');
  const selectAllBtn = document.getElementById('lib-picker-select-all');

  // Load library items (images only, not colors)
  const allItems = await PixLibrary.getAll();
  const items = allItems.filter(i => i.type !== 'color' && i.dataUrl);

  if (!items.length) {
    await pixDialog.alert('Library Empty', 'No images in your library. Save images from the side panel first.');
    return;
  }

  countEl.textContent = items.length + ' items';
  const pickerSelected = new Set();

  // Hide select all in single mode
  selectAllBtn.style.display = singleSelect ? 'none' : '';

  // Render grid
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = 'position:relative;border:2px solid var(--slate-700);border-radius:6px;overflow:hidden;cursor:pointer;aspect-ratio:1;';
    card.dataset.id = item.id;

    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.cssText = 'position:absolute;top:3px;left:3px;z-index:2;accent-color:var(--saffron-400);cursor:pointer;';

    card.appendChild(cb);
    card.appendChild(img);
    grid.appendChild(card);

    card.addEventListener('click', (e) => {
      if (e.target === cb) return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });

    cb.addEventListener('change', () => {
      if (singleSelect && cb.checked) {
        // Deselect all others
        pickerSelected.clear();
        grid.querySelectorAll('input[type="checkbox"]').forEach(other => {
          if (other !== cb) { other.checked = false; other.closest('div').style.borderColor = 'var(--slate-700)'; }
        });
      }
      if (cb.checked) pickerSelected.add(item.id); else pickerSelected.delete(item.id);
      card.style.borderColor = cb.checked ? 'var(--saffron-400)' : 'var(--slate-700)';
      selectedEl.textContent = pickerSelected.size + ' selected';
    });
  });

  // Show modal
  backdrop.style.display = 'flex';

  // Select All toggle
  const selectAllHandler = () => {
    const allSelected = pickerSelected.size === items.length;
    grid.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
      cb.checked = !allSelected;
      const id = items[i].id;
      if (!allSelected) pickerSelected.add(id); else pickerSelected.delete(id);
      cb.closest('div').style.borderColor = cb.checked ? 'var(--saffron-400)' : 'var(--slate-700)';
    });
    selectedEl.textContent = pickerSelected.size + ' selected';
    selectAllBtn.textContent = pickerSelected.size === items.length ? 'Deselect All' : 'Select All';
  };

  function cleanup() {
    backdrop.style.display = 'none';
    selectAllBtn.removeEventListener('click', selectAllHandler);
    document.getElementById('lib-picker-cancel').removeEventListener('click', cancelHandler);
    document.getElementById('lib-picker-add').removeEventListener('click', addHandler);
    document.getElementById('lib-picker-close').removeEventListener('click', cancelHandler);
    backdrop.removeEventListener('click', backdropHandler);
    document.removeEventListener('keydown', escHandler);
  }

  const cancelHandler = () => cleanup();

  const backdropHandler = (e) => { if (e.target === backdrop) cleanup(); };

  const escHandler = (e) => { if (e.key === 'Escape') cleanup(); };

  const addHandler = async () => {
    if (!pickerSelected.size) return;
    const selected = [];
    for (const id of pickerSelected) {
      const item = items.find(i => i.id === id);
      if (item) selected.push({ dataUrl: item.dataUrl, name: item.name || 'library-image', width: item.width || 0, height: item.height || 0 });
    }
    cleanup();
    if (selected.length) onAdd(selected);
  };

  selectAllBtn.addEventListener('click', selectAllHandler);
  document.getElementById('lib-picker-cancel').addEventListener('click', cancelHandler);
  document.getElementById('lib-picker-add').addEventListener('click', addHandler);
  document.getElementById('lib-picker-close').addEventListener('click', cancelHandler);
  backdrop.addEventListener('click', backdropHandler);
  document.addEventListener('keydown', escHandler);
}

// ============================================================
// MODE: Watermark
// ============================================================

let wmImages = []; // Array of { file, img, name }
let wmLogo = null; // Image element for logo watermark
let wmType = 'text'; // 'text' or 'logo'
let wmPosition = 'br';
let wmPreviewIdx = 0;
let wmPreviewTimer = null;

function initWatermark() {
  const canvas = document.getElementById('wm-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dropzone = document.getElementById('wm-dropzone');
  const fileInput = document.getElementById('wm-files');
  const logoInput = document.getElementById('wm-logo-file');
  const thumbsEl = document.getElementById('wm-thumbs');
  const countEl = document.getElementById('wm-count');

  function updateCount() {
    countEl.textContent = wmImages.length + ' image' + (wmImages.length !== 1 ? 's' : '') + ' loaded';
  }

  function addImage(file) {
    loadImg(file).then(img => {
      if (!img) return;
      wmImages.push({ file, img, name: file.name });
      updateCount();
      dropzone.style.display = 'none';
      thumbsEl.style.display = 'flex';
      // Add thumbnail
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.style.cssText = 'height:50px;border-radius:4px;cursor:pointer;border:2px solid transparent;flex-shrink:0;';
      thumb.title = file.name;
      const idx = wmImages.length - 1;
      thumb.addEventListener('click', () => {
        wmPreviewIdx = idx;
        wmRenderPreview();
        // Highlight active thumb
        thumbsEl.querySelectorAll('img').forEach(t => t.style.borderColor = 'transparent');
        thumb.style.borderColor = 'var(--saffron-400)';
      });
      thumbsEl.appendChild(thumb);
      // Auto-preview first image
      if (wmImages.length === 1) {
        wmPreviewIdx = 0;
        wmRenderPreview();
        thumb.style.borderColor = 'var(--saffron-400)';
      }
    });
  }

  // Dropzone for batch image loading
  setupDropzone(dropzone, fileInput, addImage, { multiple: true });

  // Add Images button
  document.getElementById('btn-wm-add').addEventListener('click', () => fileInput.click());

  // Add from Library button
  document.getElementById('btn-wm-from-lib')?.addEventListener('click', () => {
    openLibraryPicker(async (items) => {
      for (const item of items) {
        const img = new Image();
        img.src = item.dataUrl;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        wmImages.push({ file: null, img, name: item.name });
        updateCount();
        dropzone.style.display = 'none';
        thumbsEl.style.display = 'flex';
        const thumb = document.createElement('img');
        thumb.src = img.src;
        thumb.style.cssText = 'height:50px;border-radius:4px;cursor:pointer;border:2px solid transparent;flex-shrink:0;';
        thumb.title = item.name;
        const idx = wmImages.length - 1;
        thumb.addEventListener('click', () => {
          wmPreviewIdx = idx;
          wmRenderPreview();
          thumbsEl.querySelectorAll('img').forEach(t => t.style.borderColor = 'transparent');
          thumb.style.borderColor = 'var(--saffron-400)';
        });
        thumbsEl.appendChild(thumb);
        if (wmImages.length === 1) {
          wmPreviewIdx = 0;
          wmRenderPreview();
          thumb.style.borderColor = 'var(--saffron-400)';
        }
      }
    });
  });

  // Clear button
  document.getElementById('btn-wm-clear').addEventListener('click', async () => {
    if (wmImages.length) {
      const ok = await pixDialog.confirm('Clear Images', `Remove all ${wmImages.length} images?`, { danger: true, okText: 'Clear' });
      if (!ok) return;
    }
    wmImages = [];
    wmPreviewIdx = 0;
    updateCount();
    canvas.style.display = 'none';
    dropzone.style.display = '';
    thumbsEl.style.display = 'none';
    thumbsEl.innerHTML = '';
  });

  // Type toggle (Text / Logo)
  document.getElementById('wm-type-text').addEventListener('click', () => {
    wmType = 'text';
    document.getElementById('wm-type-text').classList.add('active');
    document.getElementById('wm-type-logo').classList.remove('active');
    document.getElementById('wm-text-group').style.display = '';
    document.getElementById('wm-logo-row').style.display = 'none';
    wmDebouncedPreview();
  });
  document.getElementById('wm-type-logo').addEventListener('click', () => {
    wmType = 'logo';
    document.getElementById('wm-type-logo').classList.add('active');
    document.getElementById('wm-type-text').classList.remove('active');
    document.getElementById('wm-text-group').style.display = 'none';
    document.getElementById('wm-logo-row').style.display = '';
    wmDebouncedPreview();
  });

  // Logo upload
  document.getElementById('btn-wm-logo-upload').addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    wmLogo = await loadImg(file);
    document.getElementById('wm-logo-name').textContent = file.name;
    wmDebouncedPreview();
  });

  // Position grid
  document.querySelectorAll('.wm-pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wmPosition = btn.dataset.pos;
      document.querySelectorAll('.wm-pos-btn').forEach(b => {
        b.classList.remove('active');
        b.querySelector('span').style.background = 'var(--slate-500)';
      });
      btn.classList.add('active');
      btn.querySelector('span').style.background = 'var(--saffron-400)';
      wmDebouncedPreview();
    });
  });

  // Style sliders — live update
  ['wm-opacity', 'wm-size', 'wm-rotation', 'wm-margin'].forEach(id => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + '-val');
    el.addEventListener('input', () => {
      valEl.textContent = el.value;
      wmDebouncedPreview();
    });
  });

  // Mode dropdown — show/hide tile gap
  document.getElementById('wm-mode').addEventListener('change', () => {
    const mode = document.getElementById('wm-mode').value;
    document.getElementById('wm-tile-row').style.display = mode === 'tile' ? '' : 'none';
    document.getElementById('wm-position-group').style.display = mode === 'single' ? '' : 'none';
    wmDebouncedPreview();
  });

  // Tile gap num-spin buttons
  document.querySelectorAll('#wm-tile-row .num-spin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById('wm-tile-gap');
      const step = btn.dataset.dir === 'up' ? 10 : -10;
      inp.value = Math.max(20, Math.min(500, parseInt(inp.value || 100) + step));
      wmDebouncedPreview();
    });
  });

  // Text / color / font change triggers preview
  ['wm-text', 'wm-font', 'wm-text-color', 'wm-shadow', 'wm-shadow-color'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const ev = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(ev, () => wmDebouncedPreview());
  });

  // Preview button
  document.getElementById('btn-wm-preview').addEventListener('click', () => wmRenderPreview());

  // Apply All button
  document.getElementById('btn-wm-apply').addEventListener('click', () => wmApplyAll());

  // Download ZIP button
  document.getElementById('btn-wm-download').addEventListener('click', () => wmDownloadZip());
}

function wmDebouncedPreview() {
  clearTimeout(wmPreviewTimer);
  wmPreviewTimer = setTimeout(() => wmRenderPreview(), 150);
}

function getWmOptions() {
  return {
    type: wmType,
    text: document.getElementById('wm-text').value || 'Watermark',
    font: document.getElementById('wm-font').value,
    textColor: document.getElementById('wm-text-color').value,
    shadowEnabled: document.getElementById('wm-shadow').checked,
    shadowColor: document.getElementById('wm-shadow-color').value,
    logoImg: wmLogo,
    position: wmPosition,
    opacity: parseInt(document.getElementById('wm-opacity').value),
    size: parseInt(document.getElementById('wm-size').value),
    rotation: parseInt(document.getElementById('wm-rotation').value),
    margin: parseInt(document.getElementById('wm-margin').value),
    mode: document.getElementById('wm-mode').value,
    tileGap: parseInt(document.getElementById('wm-tile-gap').value) || 100,
  };
}

function wmRenderPreview() {
  if (!wmImages.length) return;
  const idx = Math.min(wmPreviewIdx, wmImages.length - 1);
  const sourceImg = wmImages[idx].img;
  const options = getWmOptions();
  const result = applyWatermark(sourceImg, options);
  const canvas = document.getElementById('wm-canvas');
  canvas.width = result.width;
  canvas.height = result.height;
  canvas.getContext('2d').drawImage(result, 0, 0);
  canvas.style.display = 'block';
}

function getWatermarkPosition(position, canvasW, canvasH, wmW, wmH, margin) {
  const m = margin;
  const positions = {
    'tl': { x: m, y: m },
    'tc': { x: (canvasW - wmW) / 2, y: m },
    'tr': { x: canvasW - wmW - m, y: m },
    'cl': { x: m, y: (canvasH - wmH) / 2 },
    'cc': { x: (canvasW - wmW) / 2, y: (canvasH - wmH) / 2 },
    'cr': { x: canvasW - wmW - m, y: (canvasH - wmH) / 2 },
    'bl': { x: m, y: canvasH - wmH - m },
    'bc': { x: (canvasW - wmW) / 2, y: canvasH - wmH - m },
    'br': { x: canvasW - wmW - m, y: canvasH - wmH - m },
  };
  return positions[position] || positions['br'];
}

function drawWatermarkAt(ctx, cw, ch, options) {
  if (options.type === 'text') {
    const fontSize = Math.round(cw * options.size / 100 / 5);
    ctx.font = `bold ${fontSize}px ${options.font}`;
    ctx.fillStyle = options.textColor;
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(options.text);
    const wmW = metrics.width;
    const wmH = fontSize;
    const pos = getWatermarkPosition(options.position, cw, ch, wmW, wmH, options.margin);

    ctx.save();
    if (options.rotation !== 0) {
      ctx.translate(pos.x + wmW / 2, pos.y + wmH / 2);
      ctx.rotate(options.rotation * Math.PI / 180);
      ctx.translate(-(pos.x + wmW / 2), -(pos.y + wmH / 2));
    }
    if (options.shadowEnabled) {
      ctx.shadowColor = options.shadowColor;
      ctx.shadowBlur = Math.max(2, fontSize * 0.1);
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }
    ctx.fillText(options.text, pos.x, pos.y);
    ctx.restore();
  } else if (options.type === 'logo' && options.logoImg) {
    const logoW = cw * options.size / 100;
    const logoH = logoW * (options.logoImg.naturalHeight / options.logoImg.naturalWidth);
    const pos = getWatermarkPosition(options.position, cw, ch, logoW, logoH, options.margin);

    ctx.save();
    if (options.rotation !== 0) {
      ctx.translate(pos.x + logoW / 2, pos.y + logoH / 2);
      ctx.rotate(options.rotation * Math.PI / 180);
      ctx.translate(-(pos.x + logoW / 2), -(pos.y + logoH / 2));
    }
    ctx.drawImage(options.logoImg, pos.x, pos.y, logoW, logoH);
    ctx.restore();
  }
}

function applyWatermark(sourceImg, options) {
  const c = document.createElement('canvas');
  c.width = sourceImg.naturalWidth || sourceImg.width;
  c.height = sourceImg.naturalHeight || sourceImg.height;
  const ctx = c.getContext('2d');

  // Draw source image
  ctx.drawImage(sourceImg, 0, 0);

  // Apply watermark based on mode
  ctx.globalAlpha = options.opacity / 100;

  if (options.mode === 'single') {
    drawWatermarkAt(ctx, c.width, c.height, options);
  } else if (options.mode === 'tile') {
    // Calculate watermark size for tiling
    let wmW, wmH;
    if (options.type === 'text') {
      const fontSize = Math.round(c.width * options.size / 100 / 5);
      ctx.font = `bold ${fontSize}px ${options.font}`;
      wmW = ctx.measureText(options.text).width;
      wmH = fontSize;
    } else if (options.logoImg) {
      wmW = c.width * options.size / 100;
      wmH = wmW * (options.logoImg.naturalHeight / options.logoImg.naturalWidth);
    } else {
      wmW = wmH = 50;
    }
    const gap = options.tileGap;
    const cols = Math.ceil(c.width / (wmW + gap)) + 1;
    const rows = Math.ceil(c.height / (wmH + gap)) + 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * (wmW + gap);
        const y = row * (wmH + gap);
        ctx.save();
        if (options.rotation !== 0) {
          ctx.translate(x + wmW / 2, y + wmH / 2);
          ctx.rotate(options.rotation * Math.PI / 180);
          ctx.translate(-wmW / 2, -wmH / 2);
        } else {
          ctx.translate(x, y);
        }
        if (options.type === 'text') {
          const fontSize = Math.round(c.width * options.size / 100 / 5);
          ctx.font = `bold ${fontSize}px ${options.font}`;
          ctx.fillStyle = options.textColor;
          ctx.textBaseline = 'top';
          if (options.shadowEnabled) {
            ctx.shadowColor = options.shadowColor;
            ctx.shadowBlur = Math.max(2, fontSize * 0.1);
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
          }
          ctx.fillText(options.text, 0, 0);
        } else if (options.logoImg) {
          ctx.drawImage(options.logoImg, 0, 0, wmW, wmH);
        }
        ctx.restore();
      }
    }
  } else if (options.mode === 'diagonal') {
    // Diagonal repeating text/logo across the image
    const angle = options.rotation || -45;
    let wmW, wmH;
    if (options.type === 'text') {
      const fontSize = Math.round(c.width * options.size / 100 / 5);
      ctx.font = `bold ${fontSize}px ${options.font}`;
      wmW = ctx.measureText(options.text).width;
      wmH = fontSize;
    } else if (options.logoImg) {
      wmW = c.width * options.size / 100;
      wmH = wmW * (options.logoImg.naturalHeight / options.logoImg.naturalWidth);
    } else {
      wmW = wmH = 50;
    }
    const gap = options.tileGap;
    const diag = Math.sqrt(c.width * c.width + c.height * c.height);
    const rowCount = Math.ceil(diag / (wmH + gap)) + 2;
    const colCount = Math.ceil(diag / (wmW + gap)) + 2;

    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(angle * Math.PI / 180);

    for (let row = -rowCount; row < rowCount; row++) {
      for (let col = -colCount; col < colCount; col++) {
        const x = col * (wmW + gap);
        const y = row * (wmH + gap);
        if (options.type === 'text') {
          const fontSize = Math.round(c.width * options.size / 100 / 5);
          ctx.font = `bold ${fontSize}px ${options.font}`;
          ctx.fillStyle = options.textColor;
          ctx.textBaseline = 'top';
          if (options.shadowEnabled) {
            ctx.shadowColor = options.shadowColor;
            ctx.shadowBlur = Math.max(2, fontSize * 0.1);
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
          }
          ctx.fillText(options.text, x, y);
        } else if (options.logoImg) {
          ctx.drawImage(options.logoImg, x, y, wmW, wmH);
        }
      }
    }
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  return c;
}

async function wmApplyAll() {
  if (!wmImages.length) { pixDialog.alert('No Images', 'Load images first.'); return; }
  const options = getWmOptions();
  if (options.type === 'text' && !document.getElementById('wm-text').value.trim()) {
    pixDialog.alert('No Text', 'Enter watermark text.'); return;
  }
  if (options.type === 'logo' && !wmLogo) {
    pixDialog.alert('No Logo', 'Upload a logo image first.'); return;
  }

  const format = document.getElementById('wm-format').value;
  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const quality = format === 'jpeg' ? 0.85 : format === 'webp' ? 0.85 : undefined;

  const results = [];
  for (let i = 0; i < wmImages.length; i++) {
    const result = applyWatermark(wmImages[i].img, options);
    const blob = await new Promise(r => result.toBlob(r, mime, quality));
    const ext = format === 'jpeg' ? 'jpg' : format;
    const name = wmImages[i].name.replace(/\.[^.]+$/, '') + '-wm.' + ext;
    results.push({ name, blob });
  }

  // Store for download
  wmApplyAll._results = results;
  pixDialog.alert('Done', `Applied watermark to ${results.length} image(s). Click "Download ZIP" to export.`);
}

async function wmDownloadZip() {
  const results = wmApplyAll._results;
  if (!results || !results.length) {
    // Apply first if not yet done
    await wmApplyAll();
    if (!wmApplyAll._results || !wmApplyAll._results.length) return;
    return wmDownloadZip();
  }

  const zip = new ZipWriter();
  for (const r of results) {
    await zip.addBlob(r.name, r.blob);
  }
  const zipBlob = zip.toBlob();
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pixeroo-watermarked.zip';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// EXIF Parser (shared)
// ============================================================

function parseExif(bytes) {
  const e=[];if(bytes[0]!==0xFF||bytes[1]!==0xD8)return e;let o=2;
  while(o<bytes.length-1){if(bytes[o]!==0xFF)break;const m=bytes[o+1];if(m===0xD9||m===0xDA)break;const l=(bytes[o+2]<<8)|bytes[o+3];
  if(m===0xE1){const h=String.fromCharCode(...bytes.slice(o+4,o+8));if(h==='Exif')parseTIFD(bytes,o+10,e);}o+=2+l;}return e;
}
function parseTIFD(b,ts,e){if(ts+8>b.length)return;const le=b[ts]===0x49;const r16=(o)=>le?(b[o]|(b[o+1]<<8)):((b[o]<<8)|b[o+1]);const r32=(o)=>le?(b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0:((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;
const is=ts+r32(ts+4);if(is+2>b.length)return;const T={0x010F:'Make',0x0110:'Model',0x0112:'Orientation',0x011A:'XResolution',0x011B:'YResolution',0x0131:'Software',0x0132:'DateTime',0x829A:'ExposureTime',0x829D:'FNumber',0x8827:'ISO',0x9003:'DateTimeOriginal',0x920A:'FocalLength',0xA405:'FocalLength35mm',0xA002:'PixelXDimension',0xA003:'PixelYDimension',0x8769:'ExifIFD',0x8825:'GPSIFD'};
const c=r16(is);for(let i=0;i<c&&is+2+i*12+12<=b.length;i++){const eo=is+2+i*12,tag=r16(eo),ty=r16(eo+2),tc=r32(eo+4),vo=eo+8;const n=T[tag];if(!n)continue;if(tag===0x8769||tag===0x8825){parseTSub(b,ts,ts+r32(vo),e,le,T);continue;}const v=readTV(b,ts,ty,tc,vo,le);if(v!==null)e.push([n,v]);}}
function parseTSub(b,ts,is,e,le,T){if(is+2>b.length)return;const r16=(o)=>le?(b[o]|(b[o+1]<<8)):((b[o]<<8)|b[o+1]);const r32=(o)=>le?(b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0:((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;
const c=r16(is);for(let i=0;i<c&&is+2+i*12+12<=b.length;i++){const eo=is+2+i*12,tag=r16(eo),ty=r16(eo+2),tc=r32(eo+4),vo=eo+8;const n=T[tag];if(!n||tag===0x8769||tag===0x8825)continue;const v=readTV(b,ts,ty,tc,vo,le);if(v!==null)e.push([n,v]);}}
function readTV(b,ts,ty,c,vo,le){const r16=(o)=>le?(b[o]|(b[o+1]<<8)):((b[o]<<8)|b[o+1]);const r32=(o)=>le?(b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0:((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;
try{if(ty===2){const d=c>4?ts+r32(vo):vo;let s='';for(let i=0;i<c-1&&d+i<b.length;i++)s+=String.fromCharCode(b[d+i]);return s.trim();}if(ty===3)return r16(vo);if(ty===4)return r32(vo);if(ty===5){const d=ts+r32(vo);if(d+8>b.length)return null;const n=r32(d),dn=r32(d+4);return dn===0?n:n%dn===0?n/dn:`${n}/${dn}`;}}catch{}return null;}

function parseJpegStructure(bytes) {
  const s=[];if(bytes[0]!==0xFF||bytes[1]!==0xD8)return s;s.push('SOI');let o=2;
  const N={0xE0:'APP0/JFIF',0xE1:'APP1/EXIF',0xDB:'DQT',0xC0:'SOF0/Baseline',0xC2:'SOF2/Progressive',0xC4:'DHT',0xDA:'SOS',0xD9:'EOI',0xFE:'COM'};
  while(o<bytes.length-1){if(bytes[o]!==0xFF)break;const m=bytes[o+1];if(m===0xD9){s.push('EOI');break;}if(m===0xDA){s.push('SOS');break;}const l=(bytes[o+2]<<8)|bytes[o+3];s.push(`${N[m]||'0xFF'+m.toString(16).toUpperCase()} [${l}B]`);o+=2+l;}return s;
}

// ============================================================
// Save to Library Dialog (custom modal)
// ============================================================

async function saveToLibraryDialog(dataUrl, metadata = {}) {
  // metadata: { name, width, height, source, type }
  const overlay = document.getElementById('stl-overlay');
  if (!overlay) return false;

  const collections = await PixLibrary.getCollections();

  // Populate thumbnail
  document.getElementById('stl-thumb').src = dataUrl;

  // Populate name
  document.getElementById('stl-name').value = metadata.name || 'image';

  // Populate collection dropdown
  const sel = document.getElementById('stl-collection');
  sel.innerHTML = collections.map(c => `<option value="${c}"${c === 'General' ? ' selected' : ''}>${c}</option>`).join('') +
    '<option value="__new__">+ New Collection...</option>';

  // Reset new collection input
  const newInput = document.getElementById('stl-new-collection');
  newInput.value = '';
  newInput.style.display = 'none';

  // Wire dropdown toggle
  const onSelChange = () => {
    newInput.style.display = sel.value === '__new__' ? 'block' : 'none';
    if (sel.value === '__new__') newInput.focus();
  };
  sel.addEventListener('change', onSelChange);

  overlay.style.display = 'flex';
  document.getElementById('stl-name').focus();

  return new Promise((resolve) => {
    const cleanup = (result) => {
      overlay.style.display = 'none';
      sel.removeEventListener('change', onSelChange);
      document.getElementById('stl-save').removeEventListener('click', onSave);
      document.getElementById('stl-cancel').removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };

    const doSave = async () => {
      const name = document.getElementById('stl-name').value || metadata.name || 'image';
      let collection = sel.value;
      if (collection === '__new__') {
        collection = newInput.value.trim() || 'General';
      }
      await PixLibrary.add({
        dataUrl,
        name,
        collection,
        source: metadata.source || 'Tool',
        width: metadata.width || 0,
        height: metadata.height || 0,
        type: metadata.type || 'image',
      });
      return true;
    };

    const onSave = async () => { const r = await doSave(); cleanup(r); };
    const onCancel = () => cleanup(false);
    const onBackdrop = (e) => { if (e.target === overlay) cleanup(false); };
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); onSave(); }
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };

    document.getElementById('stl-save').addEventListener('click', onSave);
    document.getElementById('stl-cancel').addEventListener('click', onCancel);
    overlay.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
  });
}

// ============================================================
// Wire Save to Library buttons for all tools
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Edit mode
  document.getElementById('btn-edit-save-lib')?.addEventListener('click', async () => {
    if (!editCanvas.width) return;
    const dataUrl = editCanvas.toDataURL('image/png');
    await saveToLibraryDialog(dataUrl, { name: editFilename || 'edit-export', source: 'Edit', width: editCanvas.width, height: editCanvas.height });
  });

  // Generate mode
  document.getElementById('btn-gen-save-lib')?.addEventListener('click', async () => {
    const canvas = document.getElementById('gen-canvas');
    if (!canvas || !canvas.width) return;
    const dataUrl = canvas.toDataURL('image/png');
    await saveToLibraryDialog(dataUrl, { name: 'generated', source: 'Generate', width: canvas.width, height: canvas.height });
  });

  // Collage mode
  document.getElementById('btn-collage-save-lib')?.addEventListener('click', async () => {
    const canvas = document.getElementById('collage-canvas');
    if (!canvas || !canvas.width) return;
    const dataUrl = canvas.toDataURL('image/png');
    await saveToLibraryDialog(dataUrl, { name: 'collage', source: 'Collage', width: canvas.width, height: canvas.height });
  });

  // QR mode
  document.getElementById('btn-qr-save-lib')?.addEventListener('click', async () => {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas || !canvas.width) return;
    const dataUrl = canvas.toDataURL('image/png');
    await saveToLibraryDialog(dataUrl, { name: 'qrcode', source: 'QR Code', width: canvas.width, height: canvas.height });
  });

  // Social media mode
  document.getElementById('btn-social-save-lib')?.addEventListener('click', async () => {
    const canvas = document.getElementById('social-canvas');
    if (!canvas || !canvas.width || !canvas.height) return;
    const dataUrl = canvas.toDataURL('image/png');
    await saveToLibraryDialog(dataUrl, { name: 'social-banner', source: 'Social Media', width: canvas.width, height: canvas.height });
  });

  // Watermark mode — save the preview canvas
  document.getElementById('btn-wm-save-lib')?.addEventListener('click', async () => {
    const canvas = document.getElementById('wm-canvas');
    if (!canvas || !canvas.width) return;
    const dataUrl = canvas.toDataURL('image/png');
    await saveToLibraryDialog(dataUrl, { name: 'watermarked', source: 'Watermark', width: canvas.width, height: canvas.height });
  });

  // SVG Trace mode — render SVG to canvas for library save
  document.getElementById('btn-trace-save-lib')?.addEventListener('click', async () => {
    const svgEl = document.querySelector('#trace-preview svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 800;
    c.height = img.naturalHeight || 600;
    c.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const dataUrl = c.toDataURL('image/png');
    await saveToLibraryDialog(dataUrl, { name: 'svg-trace', source: 'SVG Trace', width: c.width, height: c.height });
  });
});
