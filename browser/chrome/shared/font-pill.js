// Gazo — FontPill: compact font selector component
// Usage: const pill = new FontPill(container, { defaultFamily, defaultSize, ... })
// Shows: [Inter · 24 · B] — click opens popover with full controls
// Integrates with PixFontManager for font family options.

class FontPill {
  static _popover = null;     // shared popover element (only one open at a time)
  static _active = null;      // currently active FontPill instance
  static _initialized = false;

  constructor(container, opts = {}) {
    this.family = opts.defaultFamily || 'Inter, system-ui, sans-serif';
    this.size = opts.defaultSize ?? 24;
    this.autoSize = opts.autoSize || false; // if true, size=0 means auto
    this.bold = opts.defaultBold || false;
    this.italic = opts.defaultItalic || false;
    this.underline = opts.defaultUnderline || false;
    this.color = opts.defaultColor || null; // null = no color picker
    this.showColor = opts.showColor || false;
    this.showUnderline = opts.showUnderline || false;
    this.minSize = opts.minSize ?? 8;
    this.maxSize = opts.maxSize ?? 200;
    this.onChange = opts.onChange || null; // callback({ family, size, bold, italic, underline, color })

    // Create pill button
    this.el = document.createElement('button');
    this.el.className = 'font-pill';
    this.el.type = 'button';
    this.el.title = 'Font settings';
    container.appendChild(this.el);
    this._updateLabel();

    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (FontPill._active === this) { FontPill._closePopover(); return; }
      FontPill._openFor(this);
    });

    // Register internal select for PixFontManager
    this._selectEl = null;

    if (!FontPill._initialized) FontPill._initGlobal();
  }

  // ── Get current state ──
  get state() {
    return {
      family: this.family,
      size: this.size,
      bold: this.bold,
      italic: this.italic,
      underline: this.underline,
      color: this.color,
    };
  }

  // ── Set state programmatically (e.g. when selecting an object) ──
  set state(s) {
    if (s.family !== undefined) this.family = s.family;
    if (s.size !== undefined) this.size = s.size;
    if (s.bold !== undefined) this.bold = s.bold;
    if (s.italic !== undefined) this.italic = s.italic;
    if (s.underline !== undefined) this.underline = s.underline;
    if (s.color !== undefined) this.color = s.color;
    this._updateLabel();
    if (FontPill._active === this) FontPill._syncPopover(this);
  }

  _updateLabel() {
    const fname = this.family.split(',')[0].trim();
    const sizeStr = (this.autoSize && this.size === 0) ? 'Auto' : this.size;
    const styles = [];
    if (this.bold) styles.push('B');
    if (this.italic) styles.push('I');
    if (this.underline) styles.push('U');
    const styleStr = styles.length ? ' · ' + styles.join('') : '';
    this.el.textContent = '';
    if (this.showColor && this.color) {
      const swatch = document.createElement('span');
      swatch.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:2px;background:${this.color};border:1px solid rgba(255,255,255,0.2);margin-right:4px;vertical-align:middle;`;
      this.el.appendChild(swatch);
    }
    this.el.appendChild(document.createTextNode(`${fname} · ${sizeStr}${styleStr}`));
  }

  _fireChange() {
    this._updateLabel();
    if (this.onChange) this.onChange(this.state);
  }

  // Register the internal select with PixFontManager
  _registerSelect(selectEl) {
    this._selectEl = selectEl;
    if (typeof PixFontManager !== 'undefined' && PixFontManager._ready) {
      PixFontManager.registerSelect(selectEl, { defaultValue: this.family });
    }
  }

  // ── Static: shared popover ──

  static _initGlobal() {
    FontPill._initialized = true;

    // Close popover on outside click
    document.addEventListener('mousedown', (e) => {
      if (FontPill._popover && !FontPill._popover.contains(e.target) && !FontPill._active?.el.contains(e.target)) {
        FontPill._closePopover();
      }
    });

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      .font-pill{display:inline-flex;align-items:center;gap:2px;padding:3px 8px;background:var(--slate-800);border:1px solid var(--slate-700);border-radius:5px;color:var(--slate-300);font-size:0.65rem;font-weight:500;cursor:pointer;white-space:nowrap;transition:all 0.12s;max-width:180px;overflow:hidden;text-overflow:ellipsis;}
      .font-pill:hover{border-color:var(--saffron-400);color:var(--saffron-400);}
      .font-pill.active{border-color:var(--saffron-400);background:rgba(244,196,48,0.08);}
      .fp-popover{position:fixed;z-index:9000;background:var(--slate-900);border:1px solid var(--slate-700);border-radius:10px;padding:10px;min-width:220px;box-shadow:0 8px 30px rgba(0,0,0,0.4);display:flex;flex-direction:column;gap:6px;}
      .fp-row{display:flex;align-items:center;gap:6px;}
      .fp-label{color:var(--slate-500);font-size:0.6rem;font-weight:600;min-width:32px;text-transform:uppercase;}
      .fp-select{flex:1;background:var(--slate-800);color:var(--slate-200);border:1px solid var(--slate-700);border-radius:5px;padding:4px 20px 4px 6px;font-size:0.7rem;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;cursor:pointer;}
      .fp-select:focus{outline:none;border-color:var(--saffron-400);}
      .fp-num{width:52px;background:var(--slate-800);color:var(--slate-200);border:1px solid var(--slate-700);border-radius:5px;padding:4px 6px;font-size:0.7rem;text-align:center;}
      .fp-num:focus{outline:none;border-color:var(--saffron-400);}
      .fp-toggle{padding:3px 8px;background:none;border:1px solid var(--slate-700);border-radius:4px;color:var(--slate-400);font-size:0.7rem;font-weight:700;cursor:pointer;transition:all 0.1s;min-width:28px;text-align:center;}
      .fp-toggle:hover{border-color:var(--slate-500);color:var(--slate-200);}
      .fp-toggle.on{background:rgba(244,196,48,0.12);border-color:var(--saffron-400);color:var(--saffron-400);}
    `;
    document.head.appendChild(style);
  }

  static _createPopover() {
    const pop = document.createElement('div');
    pop.className = 'fp-popover';
    pop.innerHTML = `
      <div class="fp-row">
        <span class="fp-label">Font</span>
        <select id="fp-family" class="fp-select"></select>
      </div>
      <div class="fp-row">
        <span class="fp-label">Size</span>
        <input type="number" id="fp-size" class="fp-num" value="24" min="0" max="300">
        <span class="fp-label" style="min-width:auto;">px</span>
        <button id="fp-bold" class="fp-toggle" title="Bold">B</button>
        <button id="fp-italic" class="fp-toggle" title="Italic" style="font-style:italic;">I</button>
        <button id="fp-underline" class="fp-toggle" title="Underline" style="text-decoration:underline;">U</button>
      </div>
      <div class="fp-row" id="fp-color-row" style="display:none;">
        <span class="fp-label">Color</span>
        <input type="color" id="fp-color" value="#ffffff" style="width:28px;height:24px;border:none;cursor:pointer;border-radius:4px;">
        <input type="text" id="fp-color-hex" class="fp-num" value="#ffffff" style="width:72px;font-family:monospace;">
      </div>
    `;
    document.body.appendChild(pop);

    // Wire events
    pop.querySelector('#fp-family').addEventListener('change', () => FontPill._onInput('family'));
    pop.querySelector('#fp-size').addEventListener('input', () => FontPill._onInput('size'));
    pop.querySelector('#fp-bold').addEventListener('click', () => FontPill._onToggle('bold'));
    pop.querySelector('#fp-italic').addEventListener('click', () => FontPill._onToggle('italic'));
    pop.querySelector('#fp-underline').addEventListener('click', () => FontPill._onToggle('underline'));
    pop.querySelector('#fp-color').addEventListener('input', () => FontPill._onInput('color'));
    pop.querySelector('#fp-color-hex').addEventListener('change', function() {
      if (/^#[0-9a-f]{6}$/i.test(this.value)) {
        pop.querySelector('#fp-color').value = this.value;
        FontPill._onInput('color');
      }
    });

    // Prevent popover clicks from closing it
    pop.addEventListener('mousedown', (e) => e.stopPropagation());

    return pop;
  }

  static _openFor(pill) {
    if (!FontPill._popover) FontPill._popover = FontPill._createPopover();
    const pop = FontPill._popover;

    // Close previous
    if (FontPill._active) FontPill._active.el.classList.remove('active');
    FontPill._active = pill;
    pill.el.classList.add('active');

    // Register select with PixFontManager if not done
    const selEl = pop.querySelector('#fp-family');
    if (!pill._selectEl) {
      pill._registerSelect(selEl);
    } else {
      // Re-populate from font manager
      if (typeof PixFontManager !== 'undefined' && PixFontManager._ready) {
        PixFontManager._populateSelect(selEl, { defaultValue: pill.family });
      }
    }

    // Sync popover to pill state
    FontPill._syncPopover(pill);

    // Show/hide optional controls
    pop.querySelector('#fp-underline').style.display = pill.showUnderline ? '' : 'none';
    pop.querySelector('#fp-color-row').style.display = pill.showColor ? 'flex' : 'none';
    pop.querySelector('#fp-size').min = pill.autoSize ? 0 : pill.minSize;
    pop.querySelector('#fp-size').max = pill.maxSize;

    // Position below pill
    const rect = pill.el.getBoundingClientRect();
    pop.style.display = 'flex';
    pop.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
    pop.style.top = (rect.bottom + 4) + 'px';
  }

  static _syncPopover(pill) {
    const pop = FontPill._popover;
    if (!pop) return;
    pop.querySelector('#fp-family').value = pill.family;
    pop.querySelector('#fp-size').value = pill.size;
    pop.querySelector('#fp-bold').classList.toggle('on', pill.bold);
    pop.querySelector('#fp-italic').classList.toggle('on', pill.italic);
    pop.querySelector('#fp-underline').classList.toggle('on', pill.underline);
    if (pill.showColor && pill.color) {
      pop.querySelector('#fp-color').value = pill.color;
      pop.querySelector('#fp-color-hex').value = pill.color;
    }
  }

  static _closePopover() {
    if (FontPill._active) FontPill._active.el.classList.remove('active');
    FontPill._active = null;
    if (FontPill._popover) FontPill._popover.style.display = 'none';
  }

  static _onInput(field) {
    const pill = FontPill._active;
    if (!pill) return;
    const pop = FontPill._popover;
    if (field === 'family') pill.family = pop.querySelector('#fp-family').value;
    else if (field === 'size') pill.size = +(pop.querySelector('#fp-size').value) || 0;
    else if (field === 'color') {
      pill.color = pop.querySelector('#fp-color').value;
      pop.querySelector('#fp-color-hex').value = pill.color;
    }
    pill._fireChange();
  }

  static _onToggle(field) {
    const pill = FontPill._active;
    if (!pill) return;
    pill[field] = !pill[field];
    FontPill._popover.querySelector(`#fp-${field}`).classList.toggle('on', pill[field]);
    pill._fireChange();
  }
}
