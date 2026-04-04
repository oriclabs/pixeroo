// Gazo — Draw Tool
// Blank canvas + ObjectLayer for freehand drawing, shapes, text, images.
// Includes undo/redo, duplicate, layer order, grid, circle tool.

function initDraw() {
  const drawCanvas = $('draw-canvas');
  if (!drawCanvas) return;
  const drawCtx = drawCanvas.getContext('2d');
  let drawObjLayer = null;
  let drawBgColor = '#ffffff';
  let drawBgImage = null; // non-selectable backdrop image

  // ── Undo/Redo stack ──
  let undoStack = [];
  let redoStack = [];
  const MAX_UNDO = 50;

  function _saveUndoState() {
    if (!drawObjLayer) return;
    undoStack.push(drawObjLayer.objects.map(o => _cloneObj(o)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    _updateUndoButtons();
  }

  function _cloneObj(obj) {
    const c = new DrawObject(obj.type, obj.x, obj.y, obj.w, obj.h);
    for (const key of Object.keys(obj)) {
      if (key === 'imgSource') { c.imgSource = obj.imgSource; continue; }
      if (key === 'points') { c.points = obj.points.map(p => ({ ...p })); continue; }
      if (typeof obj[key] !== 'function') c[key] = obj[key];
    }
    c.selected = false;
    c.editing = false;
    return c;
  }

  function _drawUndo() {
    if (!drawObjLayer || !undoStack.length) return;
    redoStack.push(drawObjLayer.objects.map(o => _cloneObj(o)));
    drawObjLayer.objects = undoStack.pop();
    drawObjLayer.selected = null;
    drawObjLayer.render();
    _updateUndoButtons();
  }

  function _drawRedo() {
    if (!drawObjLayer || !redoStack.length) return;
    undoStack.push(drawObjLayer.objects.map(o => _cloneObj(o)));
    drawObjLayer.objects = redoStack.pop();
    drawObjLayer.selected = null;
    drawObjLayer.render();
    _updateUndoButtons();
  }

  function _updateUndoButtons() {
    const u = $('btn-draw-undo'), r = $('btn-draw-redo');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  // ── Grid state ──
  let showGrid = false;
  let gridSize = 20;

  function _drawGrid() {
    if (!showGrid || !drawObjLayer) return;
    const ctx = drawObjLayer.overlayCtx;
    const w = drawObjLayer.overlay.width;
    const h = drawObjLayer.overlay.height;
    ctx.strokeStyle = 'rgba(100,116,139,0.15)';
    ctx.lineWidth = 1;
    for (let x = gridSize; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  const PRESETS = [
    { label: 'Custom', w: 0, h: 0 },
    { label: '1080\u00d71080', w: 1080, h: 1080 },
    { label: '1920\u00d71080', w: 1920, h: 1080 },
    { label: '1280\u00d7720', w: 1280, h: 720 },
    { label: '800\u00d7600', w: 800, h: 600 },
    { label: '500\u00d7500', w: 500, h: 500 },
    { label: 'A4 (2480\u00d73508)', w: 2480, h: 3508 },
    { label: 'A4 Landscape', w: 3508, h: 2480 },
  ];

  // ── ExportPill ─────────────────────────────────────────
  const _drawExportPill = new ExportPill($('draw-export-pill'), {
    formats: ['png', 'jpeg', 'webp'],
    showCopy: true,
    disabled: true,
    onExport(state) {
      if (!drawCanvas.width) return;
      if (drawObjLayer) drawObjLayer.flatten();
      const quality = state.format === 'png' ? undefined : 0.92;
      drawCanvas.toBlob((blob) => {
        if (!blob) return;
        directDownload(blob, `gazo-drawing.${state.ext}`);
        showToast('Drawing exported', 'success');
      }, state.mime, quality);
    },
    onCopy: async () => {
      if (!drawCanvas.width) return;
      if (drawObjLayer) drawObjLayer.flatten();
      try {
        const blob = await new Promise(r => drawCanvas.toBlob(r, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Copied to clipboard', 'success');
      } catch { showToast('Failed to copy', 'info'); }
    },
  });

  const setupPanel = $('draw-setup');
  const workPanel = $('draw-work');

  // Preset selector
  $('draw-preset')?.addEventListener('change', (e) => {
    const p = PRESETS.find(p => p.label === e.target.value);
    if (p && p.w > 0) { $('draw-w').value = p.w; $('draw-h').value = p.h; }
  });

  // Create canvas
  $('btn-draw-create')?.addEventListener('click', () => {
    const w = +($('draw-w').value) || 800;
    const h = +($('draw-h').value) || 600;
    if (w < 10 || h < 10 || w > 10000 || h > 10000) { showToast('Size must be 10\u201310000 px', 'info'); return; }
    drawBgColor = $('draw-bg-transparent')?.checked ? 'transparent' : ($('draw-bg').value || '#ffffff');
    _createCanvas(w, h);
  });

  function _createCanvas(w, h) {
    drawCanvas.width = w; drawCanvas.height = h;
    _redrawBackground();
    setupPanel.style.display = 'none';
    workPanel.style.display = '';
    drawCanvas.style.display = 'block';

    if (drawObjLayer) { try { drawObjLayer.detach(); } catch {} }
    drawObjLayer = new ObjectLayer(drawCanvas, _saveUndoState);
    drawObjLayer.persistTool = true;
    drawObjLayer.attach($('draw-canvas-wrap'));

    // Hook into render to draw grid + background image
    const origRender = drawObjLayer.render.bind(drawObjLayer);
    drawObjLayer.render = function () {
      _redrawBackground();
      origRender();
      _drawGrid();
    };

    $('draw-dims').textContent = `${w}\u00d7${h}`;
    $$('#mode-draw .tool-btn, #mode-draw .btn-primary').forEach(b => b.disabled = false);
    _drawExportPill.enable();
    undoStack = []; redoStack = [];
    _updateUndoButtons();
  }

  function _redrawBackground() {
    if (drawBgColor !== 'transparent') {
      drawCtx.fillStyle = drawBgColor;
      drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    } else {
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
    if (drawBgImage) {
      const dx = (drawCanvas.width - drawBgImage.naturalWidth) / 2;
      const dy = (drawCanvas.height - drawBgImage.naturalHeight) / 2;
      drawCtx.globalAlpha = 0.3;
      drawCtx.drawImage(drawBgImage, dx, dy);
      drawCtx.globalAlpha = 1;
    }
  }

  // ── Drawing tools ──
  $$('#mode-draw [data-draw-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!drawObjLayer) return;
      const tool = btn.dataset.drawTool;
      if (tool === 'select') {
        if (drawObjLayer.active) drawObjLayer.stopTool();
        if (drawObjLayer.overlay) drawObjLayer.overlay.style.cursor = 'default';
      } else {
        if (!drawObjLayer.active) drawObjLayer.attach($('draw-canvas-wrap'));
        drawObjLayer.startTool(tool);
      }
      $$('#mode-draw [data-draw-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Color ──
  $('draw-color')?.addEventListener('input', (e) => {
    if (drawObjLayer) {
      drawObjLayer.color = e.target.value;
      if (drawObjLayer.selected) { drawObjLayer.selected.color = e.target.value; drawObjLayer.render(); }
    }
  });

  // ── Line width ──
  $('draw-line-width')?.addEventListener('input', (e) => {
    $('draw-line-width-val').textContent = e.target.value;
    if (drawObjLayer) {
      drawObjLayer.lineWidth = +e.target.value;
      if (drawObjLayer.selected) { drawObjLayer.selected.lineWidth = +e.target.value; drawObjLayer.render(); }
    }
  });

  // ── Line style ──
  $('draw-line-style')?.addEventListener('change', (e) => {
    if (drawObjLayer) {
      drawObjLayer.lineStyle = e.target.value;
      if (drawObjLayer.selected) { drawObjLayer.selected.lineStyle = e.target.value; drawObjLayer.render(); }
    }
  });

  // ── FontPill for Draw ──
  const drawPillContainer = $('draw-font-pill');
  if (drawPillContainer) {
    window._drawFontPill = new FontPill(drawPillContainer, {
      defaultFamily: 'Inter, system-ui, sans-serif',
      defaultSize: 24,
      showUnderline: true,
      onChange(s) {
        if (!drawObjLayer) return;
        drawObjLayer.fontFamily = s.family;
        drawObjLayer.fontSize = s.size;
        drawObjLayer.fontWeight = s.bold ? 'bold' : 'normal';
        drawObjLayer.fontStyle = s.italic ? 'italic' : 'normal';
        const sel = drawObjLayer.selected;
        if (sel?.type === 'text') {
          sel.fontFamily = s.family; sel.fontSize = s.size;
          sel.fontWeight = s.bold ? 'bold' : 'normal';
          sel.fontStyle = s.italic ? 'italic' : 'normal';
          sel.underline = s.underline;
          drawObjLayer.render();
        }
      }
    });
  }

  // ── Fill toggle ──
  $('draw-fill')?.addEventListener('change', (e) => {
    if (drawObjLayer?.selected?.type === 'rect' || drawObjLayer?.selected?.type === 'ellipse') {
      drawObjLayer.selected.bgColor = e.target.checked ? ($('draw-color')?.value || '#ef4444') : null;
      drawObjLayer.render();
    }
  });

  // ── Add image from file ──
  $('draw-add-image')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || !drawObjLayer) return;
    const img = await loadImg(file);
    if (!img) return;
    _addImageToCanvas(img);
    e.target.value = '';
  });

  // ── Add image from Library ──
  $('btn-draw-from-lib')?.addEventListener('click', () => {
    if (!drawObjLayer) return;
    if (typeof openLibraryPicker !== 'function') { showToast('Library not available', 'info'); return; }
    openLibraryPicker(async (items) => {
      for (const item of items) {
        const img = new Image();
        img.src = item.dataUrl;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        _addImageToCanvas(img);
      }
    });
  });

  function _addImageToCanvas(img) {
    const maxW = drawCanvas.width * 0.5, maxH = drawCanvas.height * 0.5;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const x = Math.round((drawCanvas.width - w) / 2);
    const y = Math.round((drawCanvas.height - h) / 2);
    _saveUndoState();
    drawObjLayer.addImage(img, x, y, w, h);
    drawObjLayer.render();
  }

  // ── Set background image (non-selectable backdrop) ──
  $('draw-bg-image')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    drawBgImage = await loadImg(file);
    if (drawObjLayer) drawObjLayer.render();
    e.target.value = '';
  });

  // ── Undo / Redo buttons ──
  $('btn-draw-undo')?.addEventListener('click', _drawUndo);
  $('btn-draw-redo')?.addEventListener('click', _drawRedo);

  // ── Duplicate selected ──
  $('btn-draw-duplicate')?.addEventListener('click', () => {
    if (!drawObjLayer?.selected) return;
    _saveUndoState();
    const orig = drawObjLayer.selected;
    const c = _cloneObj(orig);
    c.x += 20; c.y += 20;
    if (c.type === 'arrow' || c.type === 'curvedArrow') { c.x2 += 20; c.y2 += 20; }
    if (c.type === 'curvedArrow') { c.cx += 20; c.cy += 20; }
    if (c.points?.length) { c.points = c.points.map(p => ({ x: p.x + 20, y: p.y + 20 })); }
    drawObjLayer.objects.push(c);
    drawObjLayer.select(c);
    drawObjLayer.render();
  });

  // ── Layer order ──
  $('btn-draw-forward')?.addEventListener('click', () => {
    if (!drawObjLayer?.selected) return;
    _saveUndoState();
    drawObjLayer.bringForward();
  });
  $('btn-draw-backward')?.addEventListener('click', () => {
    if (!drawObjLayer?.selected) return;
    _saveUndoState();
    drawObjLayer.sendBackward();
  });

  // ── Grid toggle ──
  $('btn-draw-grid')?.addEventListener('click', (e) => {
    showGrid = !showGrid;
    e.currentTarget.classList.toggle('active', showGrid);
    if (drawObjLayer) drawObjLayer.render();
  });

  // ── Delete selected ──
  $('btn-draw-delete')?.addEventListener('click', () => {
    if (!drawObjLayer?.selected) return;
    _saveUndoState();
    drawObjLayer.objects = drawObjLayer.objects.filter(o => o !== drawObjLayer.selected);
    drawObjLayer.selected = null;
    drawObjLayer.render();
  });

  // ── Clear all objects ──
  $('btn-draw-clear-objects')?.addEventListener('click', async () => {
    if (!drawObjLayer?.objects.length) return;
    const ok = await pixDialog.confirm('Clear Drawing', 'Remove all objects?', { danger: true, okText: 'Clear' });
    if (!ok) return;
    _saveUndoState();
    drawObjLayer.objects = [];
    drawObjLayer.selected = null;
    drawBgImage = null;
    drawObjLayer.render();
  });

  // ── Reset ──
  $('btn-draw-reset')?.addEventListener('click', async () => {
    if (drawObjLayer?.objects.length) {
      const ok = await pixDialog.confirm('Reset', 'Discard drawing and start over?', { danger: true, okText: 'Reset' });
      if (!ok) return;
    }
    if (drawObjLayer) { try { drawObjLayer.detach(); } catch {} drawObjLayer = null; }
    drawCanvas.width = 0; drawCanvas.height = 0;
    drawCanvas.style.display = 'none';
    workPanel.style.display = 'none';
    setupPanel.style.display = '';
    $('draw-dims').textContent = '';
    _drawExportPill.disable();
    drawBgImage = null;
    undoStack = []; redoStack = [];
    showGrid = false;
    $('btn-draw-grid')?.classList.remove('active');
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', (e) => {
    if (currentMode !== 'draw' || !drawObjLayer) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && drawObjLayer.selected && !drawObjLayer.selected.editing) {
      _saveUndoState();
      drawObjLayer.objects = drawObjLayer.objects.filter(o => o !== drawObjLayer.selected);
      drawObjLayer.selected = null;
      drawObjLayer.render();
    }
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); _drawUndo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); _drawRedo(); }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); $('btn-draw-duplicate')?.click(); }
  });
}
