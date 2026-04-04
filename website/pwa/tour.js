// Gazo — Guided Tour System
// Shared engine. Each tool defines its own step array.
//
// Usage:
//   const tour = new GuidedTour(steps);
//   tour.start();
//
// Steps: [{ target: '#selector', title: 'Title', text: 'Description' }, ...]
// target: CSS selector for the element to highlight
// title: bold heading
// text: 1-2 sentence description

class GuidedTour {
  constructor(steps) {
    this.steps = steps || [];
    this.current = 0;
    this.overlay = null;
    this.tooltip = null;
    this.active = false;
  }

  start() {
    if (this.active || !this.steps.length) return;
    this.active = true;
    this.current = 0;
    this._createOverlay();
    this._showStep();
  }

  stop() {
    this.active = false;
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    if (this.tooltip) { this.tooltip.remove(); this.tooltip = null; }
    // Remove spotlight from any element
    document.querySelectorAll('._tour-spotlight').forEach(el => {
      el.classList.remove('_tour-spotlight');
      el.style.removeProperty('z-index');
      el.style.removeProperty('position');
      el.style.removeProperty('box-shadow');
    });
    if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
  }

  next() {
    if (this.current < this.steps.length - 1) { this.current++; this._showStep(); }
    else { this.stop(); }
  }

  prev() {
    if (this.current > 0) { this.current--; this._showStep(); }
  }

  _createOverlay() {
    // Semi-transparent backdrop
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.6);transition:opacity 0.2s;';
    this.overlay.addEventListener('click', () => this.stop());
    document.body.appendChild(this.overlay);

    // Tooltip container
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = 'position:fixed;z-index:10001;background:var(--slate-900,#0f172a);border:1px solid var(--saffron-400,#F4C430);border-radius:10px;padding:14px 18px;max-width:320px;box-shadow:0 12px 40px rgba(0,0,0,0.5);font-family:Inter,system-ui,sans-serif;';
    document.body.appendChild(this.tooltip);

    // Keyboard navigation
    this._keyHandler = (e) => {
      if (e.key === 'Escape') this.stop();
      if (e.key === 'ArrowRight' || e.key === 'Enter') this.next();
      if (e.key === 'ArrowLeft') this.prev();
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  _showStep() {
    if (!this.active || !this.tooltip) return;
    const step = this.steps[this.current];

    // Remove previous spotlight
    document.querySelectorAll('._tour-spotlight').forEach(el => {
      el.classList.remove('_tour-spotlight');
      el.style.removeProperty('z-index');
      el.style.removeProperty('position');
      el.style.removeProperty('box-shadow');
    });

    // Highlight target element (fall back to parent if target is hidden/zero-size)
    let target = step.target ? document.querySelector(step.target) : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0 && target.parentElement) target = target.parentElement;
    }
    if (target) {
      target.classList.add('_tour-spotlight');
      target.style.zIndex = '9999';
      target.style.position = 'relative';
      target.style.boxShadow = '0 0 0 4px var(--saffron-400, #F4C430), 0 0 20px rgba(244,196,48,0.3)';
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Build tooltip content
    const total = this.steps.length;
    const num = this.current + 1;
    this.tooltip.innerHTML = `
      <div style="font-size:0.625rem;color:var(--slate-500,#64748b);margin-bottom:4px;">Step ${num} of ${total}</div>
      <div style="font-size:0.875rem;font-weight:700;color:var(--saffron-400,#F4C430);margin-bottom:6px;">${step.title || ''}</div>
      <div style="font-size:0.8125rem;color:var(--slate-300,#cbd5e1);line-height:1.5;margin-bottom:12px;">${step.text || ''}</div>
      <div style="display:flex;gap:6px;justify-content:space-between;align-items:center;">
        <button id="_tour-skip" style="background:none;border:none;color:var(--slate-500,#64748b);font-size:0.6875rem;cursor:pointer;padding:4px 8px;">Skip tour</button>
        <div style="display:flex;gap:6px;">
          ${num > 1 ? '<button id="_tour-prev" style="background:var(--slate-800,#1e293b);color:var(--slate-300,#cbd5e1);border:1px solid var(--slate-700,#334155);border-radius:6px;padding:5px 14px;font-size:0.75rem;cursor:pointer;">Prev</button>' : ''}
          <button id="_tour-next" style="background:var(--saffron-400,#F4C430);color:#1e293b;border:none;border-radius:6px;padding:5px 14px;font-size:0.75rem;font-weight:600;cursor:pointer;">${num === total ? 'Finish' : 'Next'}</button>
        </div>
      </div>
      <div style="display:flex;gap:3px;justify-content:center;margin-top:8px;">
        ${this.steps.map((_, i) => `<div style="width:${i === this.current ? '16px' : '6px'};height:4px;border-radius:2px;background:${i === this.current ? 'var(--saffron-400,#F4C430)' : 'var(--slate-700,#334155)'};transition:width 0.2s;"></div>`).join('')}
      </div>
    `;

    // Wire buttons
    this.tooltip.querySelector('#_tour-skip')?.addEventListener('click', () => this.stop());
    this.tooltip.querySelector('#_tour-prev')?.addEventListener('click', () => this.prev());
    this.tooltip.querySelector('#_tour-next')?.addEventListener('click', () => this.next());

    // Position tooltip near target
    this._positionTooltip(target);
  }

  _positionTooltip(target) {
    if (!this.tooltip) return;
    const tip = this.tooltip;

    if (!target) {
      // Center on screen
      tip.style.top = '50%'; tip.style.left = '50%'; tip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    tip.style.transform = '';
    const tr = target.getBoundingClientRect();
    const tw = tip.offsetWidth || 320;
    const th = tip.offsetHeight || 200;
    const pad = 12;

    // Try below target
    if (tr.bottom + pad + th < window.innerHeight) {
      tip.style.top = (tr.bottom + pad) + 'px';
      tip.style.left = Math.max(pad, Math.min(tr.left, window.innerWidth - tw - pad)) + 'px';
    }
    // Try above
    else if (tr.top - pad - th > 0) {
      tip.style.top = (tr.top - pad - th) + 'px';
      tip.style.left = Math.max(pad, Math.min(tr.left, window.innerWidth - tw - pad)) + 'px';
    }
    // Try right
    else if (tr.right + pad + tw < window.innerWidth) {
      tip.style.top = Math.max(pad, tr.top) + 'px';
      tip.style.left = (tr.right + pad) + 'px';
    }
    // Fallback: left
    else {
      tip.style.top = Math.max(pad, tr.top) + 'px';
      tip.style.left = Math.max(pad, tr.left - tw - pad) + 'px';
    }
  }
}

// --- Per-tool step definitions ---
const tourSteps = {
  edit: [
    { target: '#edit-dropzone', title: 'Drop Zone', text: 'Drop an image file here, click to browse, or paste from clipboard (Ctrl+V).' },
    { target: '#edit-ribbon', title: 'Ribbon Toolbar', text: 'All editing tools organized in groups. Disabled until you load an image.' },
    { target: '#btn-undo', title: 'Undo / Redo', text: 'Ctrl+Z to undo, Ctrl+Y to redo. Every operation is non-destructive — your original is always preserved.' },
    { target: '#btn-crop-free', title: 'Crop & Transform', text: 'Crop (free or ratio), rotate, flip. Smart crop auto-detects the subject.' },
    { target: '#adj-brightness', title: 'Adjustments', text: 'Brightness, Contrast, Saturation, Hue — drag sliders for live preview.' },
    { target: '#btn-ann-rect', title: 'Drawing Tools', text: 'Rectangle, arrow, text, freehand pen, highlighter. Objects are selectable and movable.' },
    { target: '#export-format', title: 'Export', text: 'PNG, JPEG, WebP, BMP, or traced SVG. Quality slider for lossy formats.' },
    { target: '#btn-history', title: 'History Panel', text: 'Press H to see all operations. Click any step to revert to that state.' },
    { target: '#btn-reset-all', title: 'Reset All', text: 'Reverts all edits back to the original image. The image stays loaded.' },
    { target: '#btn-edit-clear', title: 'Clear / New', text: 'Unloads the image entirely and returns to the drop zone. Use this to start fresh with a different image.' },
  ],
  collage: [
    { target: '#collage-drop', title: 'Add Images', text: 'Drop images to start. Each becomes a freeform object you can drag, resize, and layer.' },
    { target: '#btn-arrange-grid', title: 'Quick Arrange', text: 'Grid, Row, Column, Stack — auto-position images. Then adjust manually.' },
    { target: '#btn-coll-rot-left', title: 'Transform', text: 'Rotate, flip, reorder layers. Drag the circle handle above an image for free rotation.' },
    { target: '#coll-item-border', title: 'Per-Image Effects', text: 'Border, shadow, corner radius, filter, opacity, blend mode — applied to the selected image.' },
    { target: '#coll-edge-left', title: 'Edge Fades', text: 'Independent fade on each edge (L/R/T/B). Use to blend images at seams.' },
    { target: '#btn-coll-join', title: 'Join Blend', text: 'Select 2 images, click Join. Auto-detects which edges meet and applies fades.' },
    { target: '#btn-align-left', title: 'Alignment', text: 'Align edges, centers, distribute spacing. Select 2+ images first.' },
    { target: '#btn-collage-export', title: 'Export', text: 'PNG, JPEG, WebP. Trim to content crops empty canvas. Save/Load preserves your project.' },
  ],
  batch: [
    { target: '#batch-drop', title: 'Drop Images', text: 'Drop multiple images for batch processing. Click thumbnails to preview, checkboxes to select.' },
    { target: '#batch-w', title: 'Resize', text: 'Set target width/height. Lock ratio preserves proportions. Multi-size exports at multiple widths.' },
    { target: '#btn-batch-import-pipeline', title: 'Import Pipeline', text: 'Go to Edit mode first, load an image, apply operations (filter, adjust, rotate, etc.). Then come back here and click Import Edit to apply those same operations to all batch images.' },
    { target: '#batch-wm-mode', title: 'Watermark', text: '5 modes: text, diagonal, grid, stamp, image logo. Position, color, font, opacity.' },
    { target: '#batch-rename', title: 'Smart Rename', text: 'Pattern-based: {name}, {index}, {date}, {w}, {h}. Click token buttons to insert.' },
    { target: '#btn-batch-preview', title: 'Preview', text: 'See the result before processing all. Click any thumbnail to preview that specific image.' },
    { target: '#batch-zip-label', title: 'Zip Export', text: 'Bundle all processed files into a single ZIP download. No more 50 individual save dialogs.' },
    { target: '#btn-batch-save-preset', title: 'Presets', text: 'Save all current settings as a named preset. Load it later for repeatable workflows.' },
  ],
  convert: [
    { target: '#convert-table-wrap', title: 'File Table', text: 'Drop images here or click Add. Each file gets its own row with format, size, and warnings.' },
    { target: '#btn-convert-add2', title: 'Add Files', text: 'Click to browse for images, or import from your Library. Drop files directly onto the table.' },
    { target: '#convert-table th:nth-child(7)', title: 'Target Format', text: 'Pick a different output format per file. The source format is excluded automatically.' },
    { target: '#convert-table th:nth-child(10)', title: 'Preview & Settings', text: 'Click the eye icon to open a live preview with format-specific settings (quality, SVG trace options).' },
    { target: '#btn-convert-rename', title: 'Rename Pattern', text: 'Set output filename pattern. Use {name}, {index}, {fmt} placeholders. Live preview shows the result.' },
    { target: '#convert-strip-meta', title: 'Strip EXIF', text: 'Toggle to remove EXIF, GPS, and camera metadata from output files.' },
    { target: '#btn-convert-go', title: 'Convert & Download', text: 'Converts all checked files. Multiple files are bundled into a ZIP. Progress bar shows at the bottom.' },
  ],
  generate: [
    { target: '#gen-w', title: 'Canvas Size', text: 'Set width and height for the generated image.' },
    { target: '#btn-gen-gradient', title: 'Generators', text: 'Gradient, pattern, placeholder, social banner, avatar, noise, favicon, color swatch.' },
    { target: '#btn-gen-export', title: 'Export', text: 'Download the generated image as PNG, JPEG, or WebP.' },
  ],
  info: [
    { target: '#info-drop', title: 'Drop Image', text: 'Drop any image to inspect its metadata — EXIF, DPI, JPEG structure, hash.' },
    { target: '#btn-copy-base64', title: 'Copy Data URI', text: 'Copy the image as a base64 data URI for embedding in HTML/CSS.' },
  ],
  qr: [
    { target: '#qr-text', title: 'Enter Content', text: 'Type a URL, text, or structured data. QR generates live as you type \u2014 no need to click Generate.' },
    { target: '[data-qr-preset="url"]', title: 'Quick Presets', text: 'Click a preset to fill a template: URL, WiFi, email, phone, vCard, SMS, location, or calendar event.' },
    { target: '#qr-style', title: 'Style', text: 'Dot shape (square, rounded, dots), error correction, pixel size, margin, and compact mode.' },
    { target: '#qr-fg', title: 'Colors & Logo', text: 'FG/BG colors, gradient option, center logo, and background image. All in one row.' },
    { target: '#btn-qr-generate', title: 'Generate & Export', text: 'Generate, Bulk (multiple URLs as ZIP), Reset. Export as PNG, SVG, copy to clipboard, 4 sizes ZIP, or save to Library.' },
    { target: '.qr-mode-tab[data-qr-mode="read"]', title: 'Read QR', text: 'Switch to the Read tab to drop an image and decode its QR content. Clear to scan another.' },
  ],
  svg: [
    { target: '.svg-mode-tab[data-svg-mode="inspect"]', title: 'Inspect Tab', text: 'Drop an SVG to view formatted source with syntax highlighting, element breakdown, and color palette.' },
    { target: '#btn-svg-export', title: 'Export Raster', text: 'Render the SVG as PNG, JPEG, or WebP at custom dimensions (defaults to 2\u00d7).' },
    { target: '#btn-svg-toggle-source', title: 'Source Controls', text: 'Copy, wrap, or collapse the formatted SVG source code.' },
    { target: '.svg-mode-tab[data-svg-mode="trace"]', title: 'Trace Tab', text: 'Drop a raster image (PNG, JPEG, WebP, BMP) to vectorize into SVG. SVG files are not accepted.' },
    { target: '#trace-preset-inline', title: 'Trace Settings', text: 'Choose a preset (Logo, Photo, Artistic, etc.) and color count. Controls appear after dropping an image.' },
    { target: '#btn-trace-fit', title: 'Fit / 1:1', text: 'Toggle between fitted preview and actual-size with scrolling.' },
  ],
  draw: [
    { target: '#draw-preset', title: 'Canvas Size', text: 'Pick a preset size or enter custom dimensions. Background color is configurable.' },
    { target: '[data-draw-tool="rect"]', title: 'Drawing Tools', text: 'Rectangle, arrow, text, freehand pen, highlighter. Click to create, drag to place.' },
    { target: '#draw-color', title: 'Style', text: 'Color picker, line width, fill toggle. Changes apply to the next object or the selected one.' },
    { target: '#draw-font', title: 'Text', text: 'Custom fonts from the Font Manager. Set size before clicking the text tool.' },
    { target: '#btn-draw-export', title: 'Export', text: 'Download as PNG, JPEG, or WebP. Copy to clipboard. Objects are flattened into the canvas on export.' },
  ],
  compress: [
    { target: '#compress-drop', title: 'Drop Image', text: 'Drop a raster image to compress. SVG files are not supported.' },
    { target: '#compress-format', title: 'Output Format', text: 'JPEG and WebP are lossy (smaller files). PNG is lossless (larger but pixel-perfect).' },
    { target: '#compress-quality', title: 'Quality Slider', text: 'Lower quality = smaller file. The live preview updates so you can see artifacts before downloading.' },
    { target: '#compress-resize', title: 'Resize Option', text: 'Cap the maximum dimension. A 4000px photo resized to 1920px before compression saves the most space.' },
    { target: '#compress-target', title: 'Target Size', text: 'Set a KB limit and the tool will binary-search for the right quality to hit it.' },
    { target: '#btn-compress-compare', title: 'Compare Formats', text: 'See a full table of every format at 7 quality levels, with file sizes and savings percentages.' },
    { target: '#compress-output-canvas', title: 'Live Preview', text: 'Side-by-side comparison. The compressed preview updates in real-time as you adjust settings.' },
    { target: '#btn-compress-go', title: 'Download', text: 'Saves with quality in the filename (e.g. photo-compressed-80q.jpg) so you know what settings were used.' },
  ],
  compare: [
    { target: '#compare-drop-a', title: 'Image A', text: 'Drop the first image (before).' },
    { target: '#compare-drop-b', title: 'Image B', text: 'Drop the second image (after).' },
    { target: '#btn-compare-diff', title: 'Diff', text: 'Highlights pixel differences in red.' },
    { target: '#btn-compare-slider', title: 'Slider', text: 'Drag to reveal before/after side by side.' },
  ],
  colors: [
    { target: '#colors-drop', title: 'Drop Image', text: 'Drop an image and click any pixel to pick its color.' },
    { target: '#palette-count', title: 'Palette', text: 'Dominant colors extracted automatically. Adjust count with the slider.' },
  ],
  social: [
    { target: '#social-dropzone', title: 'Drop Image', text: 'Drop a source image to resize for social media platforms.' },
    { target: '#social-platform', title: 'Platform Preset', text: 'Choose a social platform and size — Twitter, Instagram, Facebook, LinkedIn, YouTube, Pinterest, TikTok, Discord.' },
    { target: '#social-fit', title: 'Fit Mode', text: 'Cover fills the frame and crops. Contain fits inside with a background color. Stretch distorts to fill.' },
    { target: '#social-text', title: 'Text Overlay', text: 'Add optional text with color and position (top, center, bottom). Expand the Text group to access.' },
    { target: '#btn-social-generate', title: 'Generate', text: 'Renders the image at the selected platform dimensions with your chosen fit and text.' },
    { target: '#btn-social-download', title: 'Export', text: 'Download the result as PNG, or copy it to the clipboard.' },
  ],
  watermark: [
    { target: '#wm-dropzone', title: 'Load Images', text: 'Drop images or click to browse. You can add multiple images for batch watermarking.' },
    { target: '#wm-type-text', title: 'Watermark Type', text: 'Choose Text or Logo watermark.' },
    { target: '#wm-pos-grid', title: 'Position', text: 'Click where to place the watermark on your images.' },
    { target: '#wm-opacity', title: 'Opacity & Size', text: 'Adjust opacity, size, and rotation of the watermark.' },
    { target: '#wm-mode', title: 'Tiling Mode', text: 'Single places one watermark. Tile repeats in a grid. Diagonal creates angled repeating text.' },
    { target: '#btn-wm-apply', title: 'Apply & Export', text: 'Preview first, then Apply All to batch process. Download as ZIP.' },
  ],
  callout: [
    { target: '.callout-tpl', title: 'Templates', text: 'Quick presets: speech bubbles, info boxes, warnings, numbered steps.' },
    { target: '#co-shape', title: 'Customize', text: 'Choose shape, tail direction, icon, colors, and font.' },
    { target: '#btn-co-add', title: 'Add & Export', text: 'Add callout to canvas. Export or save to library when done.' },
  ],
};

// Start tour for current mode
function startTour(mode) {
  const steps = tourSteps[mode];
  if (!steps || !steps.length) return;
  const tour = new GuidedTour(steps);
  tour.start();
}
