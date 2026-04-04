// Gazo Content Script - Image Detector
// Minimal footprint: only activates when messaged by background/popup/sidepanel

(() => {
  'use strict';

  // --- Watch for lazy-loaded images ---
  let _observerActive = false;
  let _lastImageCount = 0;
  let _debounceTimer = null;

  function startImageObserver() {
    if (_observerActive) return;
    _observerActive = true;
    _lastImageCount = document.querySelectorAll('img').length;

    const observer = new MutationObserver(() => {
      try { chrome.runtime; } catch { observer.disconnect(); return; }
      const currentCount = document.querySelectorAll('img').length;
      if (currentCount > _lastImageCount) {
        _lastImageCount = currentCount;
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
          try {
            chrome.runtime.sendMessage({ action: 'imagesUpdated' }).catch(() => {});
          } catch { observer.disconnect(); }
        }, 800);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- Message Listener ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'getPageImages':
        sendResponse({ images: collectPageImages() });
        startImageObserver();
        break;

      case 'cancelEyedropper':
        document.getElementById('gazo-eyedropper')?.remove();
        sendResponse({ success: true });
        break;

      case 'showImageInfo':
        showImageInfoOverlay(message.src);
        sendResponse({ success: true });
        break;

      case 'copyAsPng':
        copyImageAsPng(message.src);
        sendResponse({ success: true });
        break;

      case 'convertAndSave':
        convertAndSave(message.src, message.format);
        sendResponse({ success: true });
        break;

      case 'readQR':
        readQRFromImage(message.src);
        sendResponse({ success: true });
        break;

      case 'extractColors':
        extractColorsFromImage(message.src);
        sendResponse({ success: true });
        break;

      case 'startEyedropper':
        startEyedropperOverlay(message.screenshot, sendResponse);
        return true; // async response

      case 'quickQR':
        sendResponse({ success: true });
        break;

      case 'runAudit':
        runAccessibilityAudit();
        sendResponse({ success: true });
        break;

      case 'extractPageColors':
        sendResponse({ colors: extractCSSColors() });
        break;

      case 'startRegionCapture':
        _showRegionSelector();
        sendResponse({ ok: true });
        break;

      case 'captureFullScreen':
        // Same as region but auto-selects full viewport
        try {
          chrome.runtime.sendMessage({
            action: 'captureRegion',
            region: { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }
          });
        } catch {}
        sendResponse({ ok: true });
        break;

      case 'startFullPageCapture':
        _captureFullPage();
        sendResponse({ ok: true });
        break;

      case 'showCaptureOverlay':
        chrome.storage.local.get('gazo-capture', (r) => {
          const d = r['gazo-capture'];
          if (d?.dataUrl) _showCaptureOverlay(d.dataUrl, d.name);
        });
        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
    return true;
  });

  // ── Region capture overlay ─────────────────────────────
  function _showRegionSelector() {
    // Create full-screen overlay for user to draw a rectangle
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(0,0,0,0.15);';
    const hint = document.createElement('div');
    hint.textContent = 'Click and drag to select a region. Press Escape to cancel.';
    hint.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#e2e8f0;padding:8px 16px;border-radius:8px;font:13px Inter,system-ui,sans-serif;z-index:2147483647;pointer-events:none;';
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    let startX, startY, selBox = null;

    overlay.addEventListener('mousedown', (e) => {
      startX = e.clientX; startY = e.clientY;
      selBox = document.createElement('div');
      selBox.style.cssText = 'position:fixed;border:2px solid #F4C430;background:rgba(244,196,48,0.08);pointer-events:none;z-index:2147483647;';
      document.body.appendChild(selBox);
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!selBox) return;
      const x = Math.min(startX, e.clientX), y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY);
      selBox.style.left = x + 'px'; selBox.style.top = y + 'px';
      selBox.style.width = w + 'px'; selBox.style.height = h + 'px';
    });

    overlay.addEventListener('mouseup', (e) => {
      const x = Math.min(startX, e.clientX), y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY);
      overlay.remove();
      if (selBox) selBox.remove();
      if (w < 10 || h < 10) return; // too small
      // Request capture from background
      try {
        chrome.runtime.sendMessage({ action: 'captureRegion', region: { x, y, w, h } });
      } catch {}
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        if (selBox) selBox.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ── Crop confirm bar ───────────────────────────────────
  function _showCropConfirm(ctx, canvas, cx, cy, cw, ch, undoStack, saveState, toolBar, actionBar) {
    document.getElementById('gazo-crop-confirm')?.remove();

    // Save original display values
    const toolBarDisplay = toolBar.style.cssText;
    const actionBarDisplay = actionBar.style.cssText;

    const confirm = document.createElement('div');
    confirm.id = 'gazo-crop-confirm';
    confirm.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:12px;padding:8px 14px;background:rgba(15,23,42,0.97);border:1px solid #F4C430;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.5);z-index:2147483647;';

    const label = document.createElement('span');
    label.textContent = `Crop to ${Math.round(cw)} \u00d7 ${Math.round(ch)}`;
    label.style.cssText = 'color:#e2e8f0;font-size:12px;font-weight:600;white-space:nowrap;';

    const btnApply = document.createElement('button');
    btnApply.textContent = 'Apply';
    btnApply.style.cssText = 'padding:5px 14px;border:none;border-radius:6px;background:#F4C430;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancel';
    btnCancel.style.cssText = 'padding:5px 10px;border:1px solid #475569;border-radius:6px;background:none;color:#94a3b8;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;';

    confirm.append(label, btnApply, btnCancel);

    // Hide toolbars, show confirm in their place
    toolBar.style.display = 'none';
    actionBar.style.display = 'none';
    toolBar.parentNode.insertBefore(confirm, toolBar);

    function cleanup() {
      confirm.remove();
      toolBar.style.cssText = toolBarDisplay;
      actionBar.style.cssText = actionBarDisplay;
    }

    btnApply.addEventListener('click', () => {
      if (undoStack.length) ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
      const cropped = ctx.getImageData(cx, cy, cw, ch);
      canvas.width = cw;
      canvas.height = ch;
      ctx.putImageData(cropped, 0, 0);
      saveState();
      cleanup();
    });

    btnCancel.addEventListener('click', () => {
      if (undoStack.length) ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
      cleanup();
    });
  }

  // ── Pixel blur helper ──────────────────────────────────
  function _applyPixelBlur(ctx, x, y, w, h, blockSize) {
    const imgData = ctx.getImageData(x, y, w, h);
    const d = imgData.data;
    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        // Average the block
        for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
          for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
            const i = ((by + dy) * w + (bx + dx)) * 4;
            r += d[i]; g += d[i + 1]; b += d[i + 2]; count++;
          }
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        // Fill the block with average
        for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
          for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
            const i = ((by + dy) * w + (bx + dx)) * 4;
            d[i] = r; d[i + 1] = g; d[i + 2] = b;
          }
        }
      }
    }
    ctx.putImageData(imgData, x, y);
  }

  // ── Hex luminance helper ──────────────────────────────
  function _hexLum(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // ── Inline text input popup (replaces browser prompt) ──
  function _showTextInput(canvasX, canvasY, screenX, screenY, canvas, ctx, color, lineW, saveState) {
    const existing = document.getElementById('gazo-text-input');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'gazo-text-input';
    popup.style.cssText = `
      position:fixed;z-index:2147483647;
      left:${screenX}px;top:${screenY + 8}px;
      display:flex;gap:6px;align-items:center;
      padding:6px 8px;background:rgba(15,23,42,0.97);
      border:1px solid #334155;border-radius:10px;
      box-shadow:0 12px 40px rgba(0,0,0,0.6);
      font-family:Inter,system-ui,-apple-system,sans-serif;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type text...';
    input.style.cssText = `
      width:200px;padding:6px 10px;
      background:rgba(30,41,59,0.9);border:1px solid #475569;border-radius:6px;
      color:#e2e8f0;font-size:13px;font-family:inherit;outline:none;
    `;

    const btnOk = document.createElement('button');
    btnOk.textContent = 'Add';
    btnOk.style.cssText = `
      padding:6px 14px;border:none;border-radius:6px;
      background:#F4C430;color:#0f172a;font-size:12px;font-weight:700;
      cursor:pointer;font-family:inherit;white-space:nowrap;
    `;

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancel';
    btnCancel.style.cssText = `
      padding:6px 10px;border:1px solid #475569;border-radius:6px;
      background:none;color:#94a3b8;font-size:12px;font-weight:500;
      cursor:pointer;font-family:inherit;white-space:nowrap;
    `;

    popup.append(input, btnOk, btnCancel);
    document.body.appendChild(popup);

    // Keep popup in viewport
    const rect = popup.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) popup.style.left = (window.innerWidth - rect.width - 8) + 'px';
    if (rect.bottom > window.innerHeight - 8) popup.style.top = (screenY - rect.height - 8) + 'px';

    input.focus();

    function apply() {
      const txt = input.value.trim();
      if (txt) {
        const sz = Math.max(16, lineW * 8);
        ctx.font = `bold ${sz}px Inter,system-ui,sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(txt, canvasX, canvasY);
        saveState();
      }
      cleanup();
    }

    function cleanup() {
      popup.remove();
      document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cleanup(); }
    }

    document.addEventListener('keydown', onKey);
    btnOk.addEventListener('click', apply);
    btnCancel.addEventListener('click', cleanup);
  }

  // ── Post-capture overlay with quick annotate tools ─────
  function _showCaptureOverlay(dataUrl, name) {
    const ID = 'gazo-capture-overlay';
    document.getElementById(ID)?.remove();
    if (!dataUrl) return;

    // State
    let tool = 'none'; // none, pen, line, rect, circle, arrow, text
    let color = '#ef4444';
    let lineW = 3;
    let drawing = false, startX = 0, startY = 0;
    const undoStack = [];
    let baseImg = null;

    const COLORS = ['#ef4444','#f97316','#F4C430','#22c55e','#38bdf8','#a855f7','#ffffff','#000000'];

    // ── Overlay container ──
    const overlay = document.createElement('div');
    overlay.id = ID;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,0.82);display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Inter,system-ui,-apple-system,sans-serif;';

    // ── Canvas wrapper (holds image + drawing canvas) ──
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;max-width:80vw;max-height:60vh;border-radius:10px;border:2px solid rgba(244,196,48,0.3);box-shadow:0 20px 60px rgba(0,0,0,0.6);overflow:hidden;';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;max-width:80vw;max-height:60vh;cursor:default;';

    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Load image into canvas
    const img = new Image();
    img.onload = () => {
      baseImg = img;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.src = dataUrl;

    // ── Tool bar ──
    const toolBar = document.createElement('div');
    toolBar.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:12px;padding:6px 10px;background:rgba(15,23,42,0.95);border:1px solid #334155;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.5);';

    const TS = 'display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid transparent;border-radius:6px;background:none;color:#94a3b8;cursor:pointer;transition:all 0.12s;';
    const TS_ACTIVE = 'border-color:#F4C430;color:#F4C430;background:rgba(244,196,48,0.1);';

    function mkTool(svg, id, title) {
      const b = document.createElement('button');
      b.style.cssText = TS;
      b.innerHTML = svg;
      b.title = title;
      b.dataset.tool = id;
      b.addEventListener('click', () => setTool(id));
      return b;
    }

    let stepCount = 1; // for numbering tool

    const toolBtns = [
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>', 'pen', 'Pen'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="2" fill="currentColor" opacity="0.3"/><path d="M6 5l2 3h8l2-3"/></svg>', 'highlighter', 'Highlighter'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>', 'line', 'Line'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>', 'rect', 'Rectangle'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>', 'circle', 'Circle'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="15 8 19 12 15 16"/></svg>', 'arrow', 'Arrow'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>', 'text', 'Text'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="12" font-weight="bold" stroke="none">1</text></svg>', 'number', 'Step Number'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="2" y="6" width="20" height="12" rx="2"/></svg>', 'redact', 'Redact'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2" stroke-dasharray="3 2"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/></svg>', 'blur', 'Blur'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="4 2"/><line x1="4" y1="4" x2="9" y2="9"/><line x1="20" y1="4" x2="15" y2="9"/><line x1="4" y1="20" x2="9" y2="15"/><line x1="20" y1="20" x2="15" y2="15"/></svg>', 'crop', 'Crop'),
      mkTool('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="none"><text x="12" y="16" text-anchor="middle" font-size="14">&#x2714;</text></svg>', 'emoji', 'Emoji Stamp'),
    ];

    // Separator
    const tsep1 = document.createElement('div');
    tsep1.style.cssText = 'width:1px;height:22px;background:#334155;margin:0 2px;';

    // Color swatches
    const colorWrap = document.createElement('div');
    colorWrap.style.cssText = 'display:flex;gap:3px;align-items:center;';
    const colorBtns = COLORS.map(c => {
      const b = document.createElement('button');
      b.style.cssText = `width:18px;height:18px;border-radius:50%;border:2px solid ${c === color ? '#F4C430' : 'transparent'};background:${c};cursor:pointer;transition:border-color 0.12s;`;
      b.addEventListener('click', () => {
        color = c;
        colorBtns.forEach(cb => { cb.style.borderColor = 'transparent'; });
        b.style.borderColor = '#F4C430';
      });
      return b;
    });
    colorBtns.forEach(b => colorWrap.appendChild(b));

    // Separator
    const tsep2 = document.createElement('div');
    tsep2.style.cssText = 'width:1px;height:22px;background:#334155;margin:0 2px;';

    // Size buttons
    const sizeWrap = document.createElement('div');
    sizeWrap.style.cssText = 'display:flex;gap:2px;align-items:center;';
    [2, 3, 5].forEach(w => {
      const b = document.createElement('button');
      b.style.cssText = 'display:flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid transparent;border-radius:5px;background:none;cursor:pointer;';
      const dot = document.createElement('div');
      dot.style.cssText = `width:${w*2+2}px;height:${w*2+2}px;border-radius:50%;background:${w===lineW?'#F4C430':'#64748b'};transition:background 0.12s;`;
      b.appendChild(dot);
      b.addEventListener('click', () => {
        lineW = w;
        sizeWrap.querySelectorAll('div').forEach(d => { d.style.background = '#64748b'; });
        dot.style.background = '#F4C430';
      });
      sizeWrap.appendChild(b);
    });

    // Separator
    const tsep3 = document.createElement('div');
    tsep3.style.cssText = 'width:1px;height:22px;background:#334155;margin:0 2px;';

    // Undo
    const btnUndo = document.createElement('button');
    btnUndo.style.cssText = TS;
    btnUndo.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
    btnUndo.title = 'Undo';
    btnUndo.addEventListener('click', undo);

    toolBtns.forEach(b => toolBar.appendChild(b));
    toolBar.append(tsep1, colorWrap, tsep2, sizeWrap, tsep3, btnUndo);

    const EMOJIS = ['\u2714','\u2718','\u2753','\u2B50','\u26A0','\u2764','\u1F44D','\u1F44E','\u1F4A1','\u1F512'];
    let currentEmoji = '\u2714';

    function setTool(t) {
      // Close emoji picker if open
      document.getElementById('gazo-emoji-picker')?.remove();

      if (t === 'emoji') {
        _showEmojiPicker();
        return;
      }
      tool = (tool === t) ? 'none' : t;
      const cursors = { text: 'text', crop: 'crosshair', number: 'pointer', redact: 'crosshair', blur: 'crosshair' };
      canvas.style.cursor = tool === 'none' ? 'default' : (cursors[tool] || 'crosshair');
      toolBtns.forEach(b => {
        if (b.dataset.tool === tool) b.style.cssText = TS + TS_ACTIVE;
        else { b.style.cssText = TS; }
      });
    }

    function _showEmojiPicker() {
      document.getElementById('gazo-emoji-picker')?.remove();
      const picker = document.createElement('div');
      picker.id = 'gazo-emoji-picker';
      picker.style.cssText = 'position:fixed;z-index:2147483647;display:flex;gap:2px;flex-wrap:wrap;width:200px;padding:8px;background:rgba(15,23,42,0.97);border:1px solid #334155;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.6);';
      // Position near the emoji button
      const emojiBtn = toolBtns.find(b => b.dataset.tool === 'emoji');
      if (emojiBtn) {
        const r = emojiBtn.getBoundingClientRect();
        picker.style.left = r.left + 'px';
        picker.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      }
      EMOJIS.forEach(em => {
        const b = document.createElement('button');
        b.textContent = em;
        b.style.cssText = 'width:32px;height:32px;border:1px solid transparent;border-radius:6px;background:none;font-size:18px;cursor:pointer;transition:all 0.1s;';
        b.addEventListener('mouseenter', () => { b.style.background = 'rgba(244,196,48,0.15)'; b.style.borderColor = '#F4C430'; });
        b.addEventListener('mouseleave', () => { b.style.background = 'none'; b.style.borderColor = 'transparent'; });
        b.addEventListener('click', () => {
          currentEmoji = em;
          tool = 'emoji';
          canvas.style.cursor = 'pointer';
          toolBtns.forEach(tb => {
            if (tb.dataset.tool === 'emoji') tb.style.cssText = TS + TS_ACTIVE;
            else tb.style.cssText = TS;
          });
          picker.remove();
        });
        picker.appendChild(b);
      });
      overlay.appendChild(picker);
    }

    function undo() {
      if (undoStack.length > 1) {
        undoStack.pop();
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
      }
    }

    // ── Canvas drawing ──
    function canvasXY(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    }

    function saveState() {
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.length > 30) undoStack.shift();
    }

    canvas.addEventListener('mousedown', (e) => {
      if (tool === 'none') return;
      document.getElementById('gazo-emoji-picker')?.remove();
      const p = canvasXY(e);
      startX = p.x; startY = p.y;
      drawing = true;

      if (tool === 'text') {
        drawing = false;
        _showTextInput(p.x, p.y, e.clientX, e.clientY, canvas, ctx, color, lineW, saveState);
        return;
      }

      // Step number — click to place
      if (tool === 'number') {
        drawing = false;
        const scale = canvas.width / canvas.getBoundingClientRect().width;
        const r = Math.max(14, lineW * 5) * scale;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // Contrast text
        const lum = _hexLum(color);
        ctx.fillStyle = lum > 0.5 ? '#000000' : '#ffffff';
        ctx.font = `bold ${Math.round(r * 1.2)}px Inter,system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(stepCount), p.x, p.y + 1);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        stepCount++;
        saveState();
        return;
      }

      // Emoji stamp — click to place
      if (tool === 'emoji') {
        drawing = false;
        const scale = canvas.width / canvas.getBoundingClientRect().width;
        const sz = Math.max(24, lineW * 10) * scale;
        ctx.font = `${sz}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentEmoji, p.x, p.y);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        saveState();
        return;
      }

      if (tool === 'pen' || tool === 'highlighter') {
        const isHL = tool === 'highlighter';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = isHL ? 0.35 : 1;
        ctx.lineWidth = (isHL ? lineW * 6 : lineW) * (canvas.width / canvas.getBoundingClientRect().width);
        ctx.lineCap = isHL ? 'butt' : 'round';
        ctx.lineJoin = 'round';
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const p = canvasXY(e);
      if (tool === 'pen' || tool === 'highlighter') {
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        // Live preview: restore last state and redraw shape
        if (undoStack.length) ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        const sw = lineW * (canvas.width / canvas.getBoundingClientRect().width);
        ctx.strokeStyle = color;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'line') {
          ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(p.x, p.y); ctx.stroke();
        } else if (tool === 'rect') {
          ctx.strokeRect(startX, startY, p.x - startX, p.y - startY);
        } else if (tool === 'circle') {
          const rx = Math.abs(p.x - startX) / 2, ry = Math.abs(p.y - startY) / 2;
          const cx = Math.min(startX, p.x) + rx, cy = Math.min(startY, p.y) + ry;
          ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (tool === 'arrow') {
          ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(p.x, p.y); ctx.stroke();
          // Arrowhead
          const angle = Math.atan2(p.y - startY, p.x - startX);
          const hl = sw * 5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - hl * Math.cos(angle - 0.5), p.y - hl * Math.sin(angle - 0.5));
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - hl * Math.cos(angle + 0.5), p.y - hl * Math.sin(angle + 0.5));
          ctx.stroke();
        } else if (tool === 'redact') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(startX, startY, p.x - startX, p.y - startY);
        } else if (tool === 'blur') {
          // Preview: draw dashed rect to show blur area
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.strokeRect(startX, startY, p.x - startX, p.y - startY);
          ctx.setLineDash([]);
        } else if (tool === 'crop') {
          // Preview: darken outside, dashed border on crop area
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          const cx = Math.min(startX, p.x), cy = Math.min(startY, p.y);
          const cw = Math.abs(p.x - startX), ch = Math.abs(p.y - startY);
          // Top
          ctx.fillRect(0, 0, canvas.width, cy);
          // Bottom
          ctx.fillRect(0, cy + ch, canvas.width, canvas.height - cy - ch);
          // Left
          ctx.fillRect(0, cy, cx, ch);
          // Right
          ctx.fillRect(cx + cw, cy, canvas.width - cx - cw, ch);
          // Border
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#F4C430';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, cy, cw, ch);
          ctx.setLineDash([]);
        }
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!drawing) return;
      drawing = false;
      ctx.globalAlpha = 1;

      if (tool === 'blur') {
        // Apply pixelated blur to the selected region
        const p = canvasXY(e);
        const x = Math.min(startX, p.x), y = Math.min(startY, p.y);
        const w = Math.abs(p.x - startX), h = Math.abs(p.y - startY);
        if (w > 4 && h > 4) {
          // Restore clean state first (remove preview dashes)
          if (undoStack.length) ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
          _applyPixelBlur(ctx, x, y, w, h, 10);
        }
        saveState();
        return;
      }

      if (tool === 'crop') {
        const p = canvasXY(e);
        const cx = Math.min(startX, p.x), cy = Math.min(startY, p.y);
        const cw = Math.abs(p.x - startX), ch = Math.abs(p.y - startY);
        if (cw > 10 && ch > 10) {
          _showCropConfirm(ctx, canvas, cx, cy, cw, ch, undoStack, saveState, toolBar, bar);
        } else {
          // Too small, restore
          if (undoStack.length) ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        }
        return;
      }

      saveState();
    });

    canvas.addEventListener('mouseleave', () => {
      if (drawing && (tool === 'pen' || tool === 'highlighter')) {
        drawing = false;
        ctx.globalAlpha = 1;
        saveState();
      }
    });

    // ── Action bar ──
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;background:rgba(15,23,42,0.95);border:1px solid #334155;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);';

    const BS = 'display:flex;align-items:center;gap:6px;padding:8px 16px;border:1px solid #334155;border-radius:8px;background:rgba(30,41,59,0.8);color:#e2e8f0;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap;';

    function mkBtn(html, hc) {
      const b = document.createElement('button');
      b.style.cssText = BS;
      b.innerHTML = html;
      b.addEventListener('mouseenter', () => { b.style.borderColor = hc; b.style.color = hc; });
      b.addEventListener('mouseleave', () => { b.style.borderColor = '#334155'; b.style.color = '#e2e8f0'; });
      return b;
    }

    const btnCopy = mkBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy', '#38bdf8');
    const btnDl = mkBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download', '#4ade80');
    const btnEdit = mkBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>Advanced Edit', '#F4C430');

    const asep = document.createElement('div');
    asep.style.cssText = 'width:1px;height:24px;background:#334155;';

    const btnX = mkBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', '#f87171');
    btnX.title = 'Dismiss (Esc)';

    bar.append(btnCopy, btnDl, btnEdit, asep, btnX);

    const hint = document.createElement('div');
    hint.textContent = 'Esc to dismiss';
    hint.style.cssText = 'color:#64748b;font-size:11px;margin-top:8px;';

    overlay.append(wrap, toolBar, bar, hint);
    document.body.appendChild(overlay);

    // ── Get final canvas data (with annotations) ──
    function getFinalDataUrl() { return canvas.toDataURL('image/png'); }

    function dismiss() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }

    function fb(btn, txt, err) {
      const o = btn.innerHTML;
      btn.innerHTML = '<span style="color:' + (err ? '#f87171' : '#4ade80') + '">' + txt + '</span>';
      btn.style.pointerEvents = 'none';
      setTimeout(() => { btn.innerHTML = o; btn.style.pointerEvents = ''; }, 1500);
    }

    btnCopy.addEventListener('click', async () => {
      try {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        fb(btnCopy, 'Copied!');
        setTimeout(dismiss, 600);
      } catch { fb(btnCopy, 'Failed', true); }
    });

    btnDl.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({
          action: 'download',
          url: getFinalDataUrl(),
          filename: 'gazo/' + (name || 'screenshot') + '.png',
          saveAs: true
        });
        fb(btnDl, 'Downloading...');
        setTimeout(dismiss, 800);
      } catch { fb(btnDl, 'Failed', true); }
    });

    btnEdit.addEventListener('click', () => {
      chrome.storage.local.set(
        { 'gazo-screenshot': { dataUrl: getFinalDataUrl(), name: name || 'screenshot' } },
        () => {
          chrome.runtime.sendMessage({ action: 'openEditor', params: 'fromScreenshot=1' });
          dismiss();
        }
      );
    });

    btnX.addEventListener('click', dismiss);

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismiss(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    };
    document.addEventListener('keydown', onKey);
  }

  // ── Full page capture (scroll-stitch) ──────────────────
  async function _captureFullPage() {
    const scrollH = document.documentElement.scrollHeight;
    const viewH = window.innerHeight;
    const viewW = window.innerWidth;
    const origScrollY = window.scrollY;

    // Stitch canvas
    const stitchCanvas = document.createElement('canvas');
    stitchCanvas.width = viewW * (window.devicePixelRatio || 1);
    stitchCanvas.height = scrollH * (window.devicePixelRatio || 1);
    const sctx = stitchCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    let y = 0;
    while (y < scrollH) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150)); // wait for render
      try {
        const response = await chrome.runtime.sendMessage({ action: 'captureTab' });
        if (response?.dataUrl) {
          const img = await new Promise((resolve) => {
            const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = response.dataUrl;
          });
          if (img) {
            const captureH = Math.min(viewH, scrollH - y);
            sctx.drawImage(img, 0, 0, img.naturalWidth, captureH * dpr, 0, y * dpr, img.naturalWidth, captureH * dpr);
          }
        }
      } catch {}
      y += viewH;
    }

    // Restore scroll
    window.scrollTo(0, origScrollY);

    // Send stitched result
    const dataUrl = stitchCanvas.toDataURL('image/png');
    try {
      chrome.runtime.sendMessage({ action: 'fullPageCaptured', dataUrl });
    } catch {}
  }

  // --- Collect All Images on Page ---
  function collectPageImages() {
    const images = [];
    const seen = new Set();

    // <img> elements
    document.querySelectorAll('img').forEach(img => {
      const src = img.currentSrc || img.src;
      if (!src || seen.has(src)) return;
      seen.add(src);
      images.push({
        src,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        alt: img.alt || '',
        title: img.title || '',
        type: guessTypeFromUrl(src),
        filename: extractFilename(src),
      });
    });

    // CSS background images
    document.querySelectorAll('*').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(["']?(.+?)["']?\)/);
        if (match && match[1] && !seen.has(match[1])) {
          const src = match[1];
          seen.add(src);
          images.push({
            src,
            type: guessTypeFromUrl(src),
            filename: extractFilename(src),
            isBgImage: true,
          });
        }
      }
    });

    // <picture> / <source> elements
    document.querySelectorAll('source[srcset]').forEach(source => {
      const srcset = source.srcset;
      srcset.split(',').forEach(entry => {
        const src = entry.trim().split(/\s+/)[0];
        if (src && !seen.has(src)) {
          seen.add(src);
          images.push({
            src,
            type: guessTypeFromUrl(src),
            filename: extractFilename(src),
          });
        }
      });
    });

    // Favicons: <link rel="icon">, <link rel="shortcut icon">, <link rel="apple-touch-icon">
    document.querySelectorAll('link[rel*="icon"]').forEach(link => {
      const src = link.href;
      if (!src || seen.has(src)) return;
      seen.add(src);

      // Parse sizes attribute if available (e.g., "32x32", "192x192")
      const sizes = link.getAttribute('sizes');
      let w = 0, h = 0;
      if (sizes && sizes !== 'any') {
        const parts = sizes.split('x');
        if (parts.length === 2) { w = parseInt(parts[0]); h = parseInt(parts[1]); }
      }

      images.push({
        src,
        width: w,
        height: h,
        naturalWidth: w,
        naturalHeight: h,
        type: guessTypeFromUrl(src) || 'ICO',
        filename: extractFilename(src),
        isFavicon: true,
        alt: link.getAttribute('rel') || 'favicon',
      });
    });

    return images;
  }

  // --- Show Info Overlay ---
  function showImageInfoOverlay(src) {
    removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'gazo-overlay';
    overlay.style.cssText = `
      position: fixed; top: 12px; right: 12px; z-index: 2147483647;
      width: 320px; max-height: 80vh; overflow-y: auto;
      background: #0f172a; color: #e2e8f0; font-family: Inter, system-ui, sans-serif;
      border: 1px solid #334155; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      font-size: 13px; line-height: 1.5;
    `;

    overlay.innerHTML = `
      <div style="padding:12px;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;color:#F4C430;">Gazo</span>
        <button id="gazo-close" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:18px;">&times;</button>
      </div>
      <div style="padding:8px 12px;">
        <div style="background:#1e293b;border-radius:8px;padding:8px;margin-bottom:8px;text-align:center;max-height:150px;overflow:hidden;cursor:pointer;" id="gazo-thumb-wrap" title="Click to enlarge">
          <img src="${escapeAttr(src)}" style="max-width:100%;max-height:140px;object-fit:contain;border-radius:4px;" alt="Preview" id="gazo-thumb-img">
        </div>
        <div id="gazo-info-rows" style="font-size:12px;">
          <div style="color:#64748b;text-align:center;padding:8px;">Loading image info...</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#gazo-close').addEventListener('click', removeOverlay);

    // Click thumbnail to enlarge
    overlay.querySelector('#gazo-thumb-wrap')?.addEventListener('click', () => {
      let enlarged = document.getElementById('gazo-enlarged');
      if (enlarged) { enlarged.remove(); return; }
      enlarged = document.createElement('div');
      enlarged.id = 'gazo-enlarged';
      enlarged.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;';
      enlarged.innerHTML = `<img src="${escapeAttr(src)}" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.6);">`;
      enlarged.addEventListener('click', () => enlarged.remove());
      document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { enlarged.remove(); document.removeEventListener('keydown', esc); } });
      document.body.appendChild(enlarged);
    });

    // Delegated click-to-copy
    overlay.addEventListener('click', (e) => {
      if (e.target.classList?.contains('gazo-copyable')) {
        navigator.clipboard.writeText(e.target.textContent);
      }
    });

    // Load actual info
    loadImageInfo(src);
  }

  async function loadImageInfo(src) {
    const rows = document.getElementById('gazo-info-rows');
    if (!rows) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });

      let fileSize = 'Unknown';
      try {
        const resp = await fetch(src, { method: 'HEAD' });
        const cl = resp.headers.get('content-length');
        if (cl) fileSize = formatBytes(parseInt(cl));
      } catch {}

      const info = [
        ['Filename', extractFilename(src)],
        ['Type', guessTypeFromUrl(src)],
        ['Dimensions', `${img.naturalWidth} x ${img.naturalHeight} px`],
        ['File Size', fileSize],
        ['URL', src],
      ];

      // Find matching <img> on page for alt/title
      const pageImg = document.querySelector(`img[src="${CSS.escape(src)}"]`) ||
                       document.querySelector(`img[currentSrc="${CSS.escape(src)}"]`);
      if (pageImg) {
        if (pageImg.alt) info.push(['Alt Text', pageImg.alt]);
        if (pageImg.title) info.push(['Title', pageImg.title]);
        if (pageImg.width !== img.naturalWidth || pageImg.height !== img.naturalHeight) {
          info.push(['Displayed', `${pageImg.width} x ${pageImg.height} px`]);
          const scale = ((pageImg.width / img.naturalWidth) * 100).toFixed(0);
          info.push(['Scale', `${scale}%`]);
        }
      }

      rows.innerHTML = info.map(([label, value]) => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b;">
          <span style="color:#64748b;">${label}</span>
          <span class="gazo-copyable" style="color:#cbd5e1;max-width:180px;text-align:right;word-break:break-all;cursor:pointer;" title="Click to copy">${escapeHtml(truncate(String(value), 50))}</span>
        </div>
      `).join('');
    } catch (e) {
      rows.innerHTML = `<div style="color:#ef4444;padding:8px;">Failed to load image info</div>`;
    }
  }

  // --- Copy Image as PNG ---
  async function copyImageAsPng(src) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Copied as PNG');
    } catch (e) {
      showToast('Failed to copy image', true);
    }
  }

  // --- Convert and Save ---
  async function convertAndSave(src, format) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);

      const mimeMap = {
        png: 'image/png',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        bmp: 'image/bmp',
      };
      const mime = mimeMap[format] || 'image/png';
      const quality = ['jpeg', 'webp'].includes(format) ? 0.85 : undefined;

      const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
      const url = URL.createObjectURL(blob);
      const filename = `${extractFilename(src).replace(/\.[^.]+$/, '')}.${format}`;

      chrome.runtime.sendMessage({
        action: 'download',
        url,
        filename: `gazo/${filename}`,
        saveAs: true
      });

      showToast(`Saved as ${format.toUpperCase()}`);
    } catch (e) {
      showToast('Conversion failed', true);
      if (['avif', 'ico'].includes(format)) {
        showToast('AVIF/ICO conversion not supported in this format', true);
      }
    }
  }

  // --- Read QR (sends image data to background for jsQR processing) ---
  async function readQRFromImage(src) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = src; });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Send pixel data to background service worker for QR reading
      const result = await chrome.runtime.sendMessage({
        action: 'readQR',
        data: Array.from(imageData.data),
        width: canvas.width,
        height: canvas.height
      });

      if (result?.text) {
        showToast('QR: ' + result.text);
        navigator.clipboard.writeText(result.text).catch(() => {});
      } else {
        showToast('No QR code found in this image');
      }
    } catch (e) {
      showToast('Could not read QR from this image', true);
    }
  }

  // --- Extract Colors (placeholder) ---
  function extractColorsFromImage(src) {
    // TODO: Implement k-means color extraction
    showToast('Color extraction coming soon');
  }

  // --- Extract CSS Colors from Page ---
  function extractCSSColors() {
    const colorMap = new Map(); // hex -> count
    const props = ['color', 'backgroundColor', 'borderColor', 'outlineColor'];

    function rgbStringToHex(str) {
      if (!str || str === 'transparent') return null;
      const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
      if (!m) return null;
      const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
      if (a === 0) return null;
      const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      try {
        const cs = getComputedStyle(el);
        for (const prop of props) {
          const hex = rgbStringToHex(cs[prop]);
          if (hex) {
            colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
          }
        }
      } catch {}
    });

    // Sort by frequency descending, limit to 50
    const sorted = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([hex, count]) => ({ hex, count }));

    return sorted;
  }

  // --- Accessibility Audit (placeholder) ---
  function runAccessibilityAudit() {
    const imgs = document.querySelectorAll('img');
    let missing = 0;
    let total = imgs.length;

    imgs.forEach(img => {
      if (!img.alt && !img.getAttribute('role')?.includes('presentation')) {
        missing++;
        img.style.outline = '3px solid #ef4444';
        img.style.outlineOffset = '2px';
      }
    });

    showToast(`Audit: ${total} images, ${missing} missing alt text`);
  }

  // --- Toast Notification ---
  function showToast(msg, isError = false) {
    const existing = document.getElementById('gazo-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'gazo-toast';
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; padding: 10px 20px; border-radius: 8px;
      font-family: Inter, system-ui, sans-serif; font-size: 13px; font-weight: 500;
      background: ${isError ? '#7f1d1d' : '#0f172a'}; color: ${isError ? '#fca5a5' : '#F4C430'};
      border: 1px solid ${isError ? '#991b1b' : '#334155'};
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      transition: opacity 0.3s;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    setTimeout(() => toast.remove(), 3000);
  }

  // --- Helpers ---
  function removeOverlay() {
    document.getElementById('gazo-overlay')?.remove();
  }

  function guessTypeFromUrl(url) {
    try {
      const ext = new URL(url, location.href).pathname.split('.').pop()?.toLowerCase();
      const map = {
        jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG', gif: 'GIF',
        webp: 'WebP', avif: 'AVIF', svg: 'SVG', bmp: 'BMP',
        ico: 'ICO', tiff: 'TIFF', tif: 'TIFF',
      };
      return map[ext] || ext?.toUpperCase() || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  function extractFilename(url) {
    try {
      return new URL(url, location.href).pathname.split('/').pop() || 'image';
    } catch {
      return 'image';
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  }

  // --- Eyedropper Overlay with Magnifier ---
  function startEyedropperOverlay(screenshotDataUrl, sendResponse) {
    // Remove any existing overlay
    document.getElementById('gazo-eyedropper')?.remove();

    if (!screenshotDataUrl) {
      sendResponse({ color: null });
      return;
    }

    const img = new Image();
    img.onerror = () => {
      sendResponse({ color: null });
    };
    img.onload = () => {
      // Full-screen canvas overlay
      const overlay = document.createElement('div');
      overlay.id = 'gazo-eyedropper';
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 2147483647; cursor: none;
        overflow: hidden; width: 100vw; height: 100vh;
      `;

      // Hide page scrollbars while overlay is active
      const prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100vw;height:100vh;';
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      // Crosshair at cursor position (this is the actual pick point)
      const crosshair = document.createElement('div');
      crosshair.style.cssText = `
        position: fixed; pointer-events: none; display: none;
        width: 20px; height: 20px; margin-left: -10px; margin-top: -10px;
        border: 2px solid #ffffff; border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3);
      `;
      // Center dot
      const centerDot = document.createElement('div');
      centerDot.style.cssText = `
        position: absolute; top: 50%; left: 50%; width: 4px; height: 4px;
        margin: -2px 0 0 -2px; background: #ffffff; border-radius: 50%;
        box-shadow: 0 0 2px rgba(0,0,0,0.8);
      `;
      crosshair.appendChild(centerDot);

      // Magnifier (floating preview, offset from cursor)
      const mag = document.createElement('div');
      const magSize = 100;
      const magZoom = 8;
      mag.style.cssText = `
        position: fixed; pointer-events: none; display: none;
        width: ${magSize}px; height: ${magSize}px;
        border-radius: 50%; border: 2px solid #F4C430;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        overflow: hidden;
      `;
      const magCanvas = document.createElement('canvas');
      magCanvas.width = magSize; magCanvas.height = magSize;
      magCanvas.style.cssText = 'width:100%;height:100%;';
      mag.appendChild(magCanvas);

      // Color label (shows hex below magnifier)
      const label = document.createElement('div');
      label.style.cssText = `
        position: fixed; pointer-events: none; display: none;
        background: #0f172a; color: #F4C430; font-family: monospace;
        font-size: 11px; font-weight: 600; padding: 3px 8px;
        border-radius: 4px; border: 1px solid #334155;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        white-space: nowrap;
      `;

      // Hint text
      const hint = document.createElement('div');
      hint.style.cssText = `
        position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
        background: #0f172a; color: #e2e8f0; font-family: Inter, system-ui, sans-serif;
        font-size: 12px; padding: 6px 14px; border-radius: 6px;
        border: 1px solid #334155; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        z-index: 1;
      `;
      hint.textContent = 'Click to pick · Esc to cancel';

      overlay.appendChild(canvas);
      overlay.appendChild(crosshair);
      overlay.appendChild(mag);
      overlay.appendChild(label);
      overlay.appendChild(hint);
      document.body.appendChild(overlay);

      function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        return {
          px: Math.floor((clientX - rect.left) * sx),
          py: Math.floor((clientY - rect.top) * sy),
          sx, sy
        };
      }

      function getPixelAt(clientX, clientY) {
        const { px, py } = getCanvasCoords(clientX, clientY);
        const cx = Math.max(0, Math.min(px, canvas.width - 1));
        const cy = Math.max(0, Math.min(py, canvas.height - 1));
        const data = ctx.getImageData(cx, cy, 1, 1).data;
        return { r: data[0], g: data[1], b: data[2] };
      }

      function drawMagnifier(clientX, clientY) {
        const mc = magCanvas.getContext('2d');
        const { px, py, sx } = getCanvasCoords(clientX, clientY);
        const srcSize = magSize / magZoom;

        mc.imageSmoothingEnabled = false;
        mc.clearRect(0, 0, magSize, magSize);
        mc.drawImage(canvas, px - srcSize / 2, py - srcSize / 2, srcSize, srcSize, 0, 0, magSize, magSize);

        // Crosshair in center
        const cellSize = Math.max(magZoom, Math.round(sx * magZoom));
        mc.strokeStyle = 'rgba(255,255,255,0.6)';
        mc.lineWidth = 1;
        mc.strokeRect(magSize / 2 - cellSize / 2, magSize / 2 - cellSize / 2, cellSize, cellSize);
      }

      overlay.addEventListener('mousemove', (e) => {
        crosshair.style.display = 'block';
        mag.style.display = 'block';
        label.style.display = 'block';

        // Crosshair: exactly at cursor
        crosshair.style.left = e.clientX + 'px';
        crosshair.style.top = e.clientY + 'px';

        // Magnifier: offset to top-right of cursor
        let magX = e.clientX + 24;
        let magY = e.clientY - magSize - 8;

        // Keep in viewport
        if (magY < 4) magY = e.clientY + 24;
        if (magX + magSize > window.innerWidth - 4) magX = e.clientX - magSize - 24;

        mag.style.left = magX + 'px';
        mag.style.top = magY + 'px';

        // Label: below magnifier
        label.style.left = magX + 'px';
        label.style.top = (magY + magSize + 4) + 'px';

        drawMagnifier(e.clientX, e.clientY);

        const { r, g, b } = getPixelAt(e.clientX, e.clientY);
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        label.textContent = hex;
        mag.style.borderColor = hex;
        crosshair.style.borderColor = hex;
        centerDot.style.background = hex;
      });

      function cleanup() {
        document.removeEventListener('keydown', onKey, true);
        overlay.removeEventListener('keydown', onKey);
        overlay.remove();
        document.documentElement.style.overflow = prevOverflow;
      }

      overlay.addEventListener('click', (e) => {
        const { r, g, b } = getPixelAt(e.clientX, e.clientY);
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        cleanup();
        sendResponse({ color: { r, g, b, hex } });
      });

      // Make overlay focusable so it receives keyboard events
      overlay.tabIndex = 0;
      overlay.focus();

      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cleanup();
          sendResponse({ color: null });
        }
      };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('keydown', onKey);
    };
    img.src = screenshotDataUrl;
  }
})();
