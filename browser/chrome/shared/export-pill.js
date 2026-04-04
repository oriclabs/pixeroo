// Gazo — ExportPill: compact export controls component
// Usage: new ExportPill(container, { formats, showQuality, showLibrary, showCopy, onExport, onLibrary })
// Shows: [PNG ▾ · Export] — click format to cycle, or open popover for quality/options

class ExportPill {
  static _popover = null;
  static _active = null;
  static _initialized = false;

  constructor(container, opts = {}) {
    this.formats = opts.formats || ['png', 'jpeg', 'webp'];
    this.format = opts.defaultFormat || this.formats[0];
    this.quality = opts.defaultQuality ?? 85;
    this.showQuality = opts.showQuality ?? false;
    this.showLibrary = opts.showLibrary ?? true;
    this.showCopy = opts.showCopy ?? false;
    this.showTrim = opts.showTrim ?? false;
    this.trim = false;
    this.disabled = opts.disabled ?? false;
    this.onExport = opts.onExport || null;   // (state) => {}
    this.onLibrary = opts.onLibrary || null; // (state) => {}
    this.onCopy = opts.onCopy || null;       // (state) => {}

    // Build pill
    this.el = document.createElement('span');
    this.el.className = 'export-pill';
    this.el.style.cssText = 'display:inline-flex;align-items:center;gap:0;';

    // Format button (cycles on click)
    this.fmtBtn = document.createElement('button');
    this.fmtBtn.className = 'ep-fmt';
    this.fmtBtn.type = 'button';
    this.fmtBtn.textContent = this.format.toUpperCase();
    this.fmtBtn.title = 'Click to change format, right-click for options';
    this.fmtBtn.addEventListener('click', (e) => { e.stopPropagation(); this._cycleFormat(); });
    this.fmtBtn.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); ExportPill._openFor(this); });

    // Export button
    this.expBtn = document.createElement('button');
    this.expBtn.className = 'ep-export';
    this.expBtn.type = 'button';
    this.expBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export';
    this.expBtn.addEventListener('click', (e) => { e.stopPropagation(); this._doExport(); });

    // Options button (gear)
    this.optBtn = document.createElement('button');
    this.optBtn.className = 'ep-opt';
    this.optBtn.type = 'button';
    this.optBtn.title = 'Export options';
    this.optBtn.innerHTML = '&#9662;';
    this.optBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ExportPill._active === this) { ExportPill._closePopover(); return; }
      ExportPill._openFor(this);
    });

    this.el.appendChild(this.fmtBtn);
    this.el.appendChild(this.expBtn);
    this.el.appendChild(this.optBtn);
    container.appendChild(this.el);

    if (this.disabled) this._setDisabled(true);
    if (!ExportPill._initialized) ExportPill._initGlobal();
  }

  get state() {
    return { format: this.format, quality: this.quality, trim: this.trim,
      mime: ({ png:'image/png', jpeg:'image/jpeg', webp:'image/webp', bmp:'image/bmp', svg:'image/svg+xml' })[this.format] || 'image/png',
      ext: this.format === 'jpeg' ? 'jpg' : this.format };
  }

  _setDisabled(v) {
    this.disabled = v;
    this.expBtn.disabled = v;
    this.el.style.opacity = v ? '0.4' : '';
    this.el.style.pointerEvents = v ? 'none' : '';
  }

  enable() { this._setDisabled(false); }
  disable() { this._setDisabled(true); }

  _cycleFormat() {
    const idx = this.formats.indexOf(this.format);
    this.format = this.formats[(idx + 1) % this.formats.length];
    this.fmtBtn.textContent = this.format.toUpperCase();
    // Show/hide quality based on format
    this.showQuality = ['jpeg', 'webp', 'avif'].includes(this.format);
  }

  _doExport() {
    if (this.disabled) return;
    if (this.onExport) this.onExport(this.state);
  }

  // ── Static: shared popover ──
  static _initGlobal() {
    ExportPill._initialized = true;
    document.addEventListener('mousedown', (e) => {
      if (ExportPill._popover && !ExportPill._popover.contains(e.target) && !ExportPill._active?.el.contains(e.target)) {
        ExportPill._closePopover();
      }
    });

    const style = document.createElement('style');
    style.textContent = `
      .ep-fmt{padding:3px 7px;background:var(--slate-800);border:1px solid var(--slate-700);border-radius:5px 0 0 5px;color:var(--slate-300);font-size:0.65rem;font-weight:600;cursor:pointer;transition:all 0.12s;letter-spacing:0.03em;}
      .ep-fmt:hover{border-color:var(--saffron-400);color:var(--saffron-400);}
      .ep-export{padding:3px 8px;background:var(--saffron-400);border:1px solid var(--saffron-400);border-left:none;color:var(--saffron-950);font-size:0.65rem;font-weight:700;cursor:pointer;transition:all 0.12s;}
      .ep-export:hover{background:var(--saffron-500);}
      .ep-export:disabled{opacity:0.4;cursor:not-allowed;}
      .ep-opt{padding:3px 4px;background:var(--slate-800);border:1px solid var(--slate-700);border-left:none;border-radius:0 5px 5px 0;color:var(--slate-400);font-size:0.55rem;cursor:pointer;transition:all 0.12s;line-height:1;}
      .ep-opt:hover{border-color:var(--saffron-400);color:var(--saffron-400);}
      .ep-popover{position:fixed;z-index:9000;background:var(--slate-900);border:1px solid var(--slate-700);border-radius:8px;padding:8px 10px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:flex;flex-direction:column;gap:6px;}
      .ep-row{display:flex;align-items:center;gap:6px;}
      .ep-label{color:var(--slate-500);font-size:0.6rem;font-weight:600;min-width:38px;}
      .ep-btn{padding:4px 10px;background:none;border:1px solid var(--slate-700);border-radius:4px;color:var(--slate-300);font-size:0.65rem;cursor:pointer;transition:all 0.1s;display:flex;align-items:center;gap:4px;}
      .ep-btn:hover{border-color:var(--saffron-400);color:var(--saffron-400);}
      .ep-btn svg{opacity:0.7;}
      .ep-btn:hover svg{opacity:1;}
    `;
    document.head.appendChild(style);
  }

  static _createPopover() {
    const pop = document.createElement('div');
    pop.className = 'ep-popover';
    pop.innerHTML = `
      <div class="ep-row">
        <span class="ep-label">Format</span>
        <select id="ep-format" class="fp-select" style="flex:1;"></select>
      </div>
      <div class="ep-row" id="ep-quality-row" style="display:none;">
        <span class="ep-label">Quality</span>
        <input type="range" id="ep-quality" min="1" max="100" value="85" style="flex:1;accent-color:var(--saffron-400);">
        <span id="ep-quality-val" style="color:var(--slate-200);font-size:0.65rem;min-width:24px;text-align:right;">85</span>
      </div>
      <div class="ep-row" id="ep-trim-row" style="display:none;">
        <label style="font-size:0.6rem;color:var(--slate-400);display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="ep-trim" style="accent-color:var(--saffron-400);">Trim to content</label>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="ep-btn" id="ep-btn-lib" style="display:none;" title="Save to Library"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>Library</button>
        <button class="ep-btn" id="ep-btn-copy" style="display:none;" title="Copy to clipboard"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>
      </div>
    `;
    document.body.appendChild(pop);

    pop.querySelector('#ep-format').addEventListener('change', () => ExportPill._onFormatChange());
    pop.querySelector('#ep-quality').addEventListener('input', () => ExportPill._onQualityChange());
    pop.querySelector('#ep-trim')?.addEventListener('change', () => {
      if (ExportPill._active) ExportPill._active.trim = pop.querySelector('#ep-trim').checked;
    });
    pop.querySelector('#ep-btn-lib').addEventListener('click', () => {
      if (ExportPill._active?.onLibrary) ExportPill._active.onLibrary(ExportPill._active.state);
      ExportPill._closePopover();
    });
    pop.querySelector('#ep-btn-copy').addEventListener('click', () => {
      if (ExportPill._active?.onCopy) ExportPill._active.onCopy(ExportPill._active.state);
      ExportPill._closePopover();
    });
    pop.addEventListener('mousedown', (e) => e.stopPropagation());
    return pop;
  }

  static _openFor(pill) {
    if (!ExportPill._popover) ExportPill._popover = ExportPill._createPopover();
    const pop = ExportPill._popover;
    ExportPill._active = pill;

    // Populate format options
    const sel = pop.querySelector('#ep-format');
    sel.innerHTML = '';
    const labels = { png: 'PNG', jpeg: 'JPEG', webp: 'WebP', bmp: 'BMP', svg: 'SVG', avif: 'AVIF' };
    for (const f of pill.formats) {
      const opt = document.createElement('option');
      opt.value = f; opt.textContent = labels[f] || f.toUpperCase();
      sel.appendChild(opt);
    }
    sel.value = pill.format;

    // Quality
    const hasQ = ['jpeg', 'webp', 'avif'].includes(pill.format);
    pop.querySelector('#ep-quality-row').style.display = hasQ ? 'flex' : 'none';
    pop.querySelector('#ep-quality').value = pill.quality;
    pop.querySelector('#ep-quality-val').textContent = pill.quality;

    // Trim
    pop.querySelector('#ep-trim-row').style.display = pill.showTrim ? 'flex' : 'none';
    pop.querySelector('#ep-trim').checked = pill.trim;

    // Buttons
    pop.querySelector('#ep-btn-lib').style.display = pill.showLibrary ? '' : 'none';
    pop.querySelector('#ep-btn-copy').style.display = pill.showCopy ? '' : 'none';

    // Position
    const rect = pill.el.getBoundingClientRect();
    pop.style.display = 'flex';
    pop.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    pop.style.top = (rect.bottom + 4) + 'px';
  }

  static _closePopover() {
    ExportPill._active = null;
    if (ExportPill._popover) ExportPill._popover.style.display = 'none';
  }

  static _onFormatChange() {
    const pill = ExportPill._active;
    if (!pill) return;
    const pop = ExportPill._popover;
    pill.format = pop.querySelector('#ep-format').value;
    pill.fmtBtn.textContent = pill.format.toUpperCase();
    const hasQ = ['jpeg', 'webp', 'avif'].includes(pill.format);
    pop.querySelector('#ep-quality-row').style.display = hasQ ? 'flex' : 'none';
  }

  static _onQualityChange() {
    const pill = ExportPill._active;
    if (!pill) return;
    const pop = ExportPill._popover;
    pill.quality = +pop.querySelector('#ep-quality').value;
    pop.querySelector('#ep-quality-val').textContent = pill.quality;
  }
}
