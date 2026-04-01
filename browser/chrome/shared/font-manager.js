// Gazo — Centralized Font Manager
// Three tiers: built-in web-safe, system fonts (queryLocalFonts), custom uploads (IndexedDB)
// All font <select> elements across tools are populated from this single source.

const PixFontManager = {
  DB_NAME: 'gazo-fonts',
  STORE: 'custom-fonts',
  DB_VERSION: 1,
  MAX_CUSTOM: 10,

  // Tier 1: Built-in web-safe fonts (always available)
  BUILTIN: [
    { name: 'Inter',            value: 'Inter, system-ui, sans-serif' },
    { name: 'Arial',            value: 'Arial, sans-serif' },
    { name: 'Arial Black',      value: 'Arial Black, sans-serif' },
    { name: 'Georgia',          value: 'Georgia, serif' },
    { name: 'Times New Roman',  value: 'Times New Roman, serif' },
    { name: 'Courier New',      value: 'Courier New, monospace' },
    { name: 'Verdana',          value: 'Verdana, sans-serif' },
    { name: 'Trebuchet MS',     value: 'Trebuchet MS, sans-serif' },
    { name: 'Impact',           value: 'Impact, sans-serif' },
    { name: 'Comic Sans MS',    value: 'Comic Sans MS, cursive' },
    { name: 'Lucida Console',   value: 'Lucida Console, monospace' },
    { name: 'Tahoma',           value: 'Tahoma, sans-serif' },
    { name: 'Palatino',         value: 'Palatino Linotype, Book Antiqua, Palatino, serif' },
    { name: 'Garamond',         value: 'Garamond, serif' },
    { name: 'Brush Script MT',  value: 'Brush Script MT, cursive' },
  ],

  _db: null,
  _systemFonts: [],
  _customFonts: [],
  _selects: [],       // registered select elements
  _ready: false,

  // ── IndexedDB ──
  _open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          db.createObjectStore(this.STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  // ── Init: load custom fonts + detect system fonts ──
  async init() {
    // Load custom fonts from IndexedDB and register them via FontFace
    try {
      const db = await this._open();
      const tx = db.transaction(this.STORE, 'readonly');
      const store = tx.objectStore(this.STORE);
      const all = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      this._customFonts = all;
      for (const entry of all) {
        await this._loadFontFace(entry);
      }
    } catch (e) {
      console.warn('Font Manager: failed to load custom fonts', e);
    }

    // Try to load cached system fonts
    try {
      const cached = await new Promise(r => chrome.storage?.local?.get({ systemFonts: [] }, r));
      if (cached?.systemFonts?.length) {
        this._systemFonts = cached.systemFonts;
      }
    } catch {}

    this._ready = true;
    this._notify();
  },

  // ── Load a custom font via FontFace API ──
  async _loadFontFace(entry) {
    try {
      const face = new FontFace(entry.name, entry.data);
      await face.load();
      document.fonts.add(face);
    } catch (e) {
      console.warn('Font Manager: failed to load font', entry.name, e);
    }
  },

  // ── Add custom font (from File) ──
  async addCustomFont(file) {
    if (this._customFonts.length >= this.MAX_CUSTOM) {
      return { error: `Maximum ${this.MAX_CUSTOM} custom fonts allowed` };
    }
    const allowed = ['.ttf', '.otf', '.woff', '.woff2'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      return { error: 'Only .ttf, .otf, .woff, .woff2 files supported' };
    }

    const buffer = await file.arrayBuffer();
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    // Check for duplicate name
    if (this._customFonts.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      return { error: `Font "${name}" already exists` };
    }

    const entry = { name, data: buffer, filename: file.name, added: Date.now() };

    // Store in IndexedDB
    const db = await this._open();
    const id = await new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      const req = tx.objectStore(this.STORE).add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    entry.id = id;
    this._customFonts.push(entry);

    // Load into document
    await this._loadFontFace(entry);
    this._notify();
    return { ok: true, name };
  },

  // ── Remove custom font ──
  async removeCustomFont(id) {
    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      const req = tx.objectStore(this.STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    this._customFonts = this._customFonts.filter(f => f.id !== id);
    this._notify();
  },

  // ── Detect system fonts (Tier 2) ──
  async detectSystemFonts() {
    if (!('queryLocalFonts' in window)) {
      return { error: 'System font detection not supported in this browser' };
    }
    try {
      const fonts = await window.queryLocalFonts();
      // Deduplicate by family name
      const seen = new Set();
      const families = [];
      for (const f of fonts) {
        const fam = f.family;
        if (!seen.has(fam) && !this.BUILTIN.some(b => b.name === fam)) {
          seen.add(fam);
          families.push({ name: fam, value: fam });
        }
      }
      families.sort((a, b) => a.name.localeCompare(b.name));
      this._systemFonts = families;
      // Cache in storage
      try {
        chrome.storage?.local?.set({ systemFonts: families });
      } catch {}
      this._notify();
      return { ok: true, count: families.length };
    } catch (e) {
      return { error: 'Permission denied or failed: ' + e.message };
    }
  },

  // ── Clear system fonts cache ──
  clearSystemFonts() {
    this._systemFonts = [];
    try { chrome.storage?.local?.remove('systemFonts'); } catch {}
    this._notify();
  },

  // ── Get all fonts (merged, grouped) ──
  getAllFonts() {
    return {
      builtin: this.BUILTIN,
      system: this._systemFonts,
      custom: this._customFonts.map(f => ({ name: f.name, value: f.name, id: f.id })),
    };
  },

  // ── Register a <select> for auto-population ──
  registerSelect(el, opts = {}) {
    this._selects.push({ el, opts });
    if (this._ready) this._populateSelect(el, opts);
  },

  // ── Populate a single select ──
  _populateSelect(el, opts = {}) {
    const current = el.value;
    el.innerHTML = '';

    const fonts = this.getAllFonts();

    // Built-in group
    const builtinGroup = document.createElement('optgroup');
    builtinGroup.label = 'Web Safe';
    for (const f of fonts.builtin) {
      const opt = document.createElement('option');
      opt.value = f.value;
      opt.textContent = f.name;
      opt.style.fontFamily = f.value;
      builtinGroup.appendChild(opt);
    }
    el.appendChild(builtinGroup);

    // System fonts group
    if (fonts.system.length) {
      const sysGroup = document.createElement('optgroup');
      sysGroup.label = `System (${fonts.system.length})`;
      for (const f of fonts.system) {
        const opt = document.createElement('option');
        opt.value = f.value;
        opt.textContent = f.name;
        opt.style.fontFamily = f.value;
        sysGroup.appendChild(opt);
      }
      el.appendChild(sysGroup);
    }

    // Custom fonts group
    if (fonts.custom.length) {
      const customGroup = document.createElement('optgroup');
      customGroup.label = `Custom (${fonts.custom.length}/${this.MAX_CUSTOM})`;
      for (const f of fonts.custom) {
        const opt = document.createElement('option');
        opt.value = f.value;
        opt.textContent = f.name;
        opt.style.fontFamily = f.value;
        customGroup.appendChild(opt);
      }
      el.appendChild(customGroup);
    }

    // Restore previous value or apply default
    if (current && el.querySelector(`option[value="${CSS.escape(current)}"]`)) {
      el.value = current;
    } else if (opts.defaultValue) {
      el.value = opts.defaultValue;
    }
  },

  // ── Populate all registered selects ──
  populateAll() {
    for (const { el, opts } of this._selects) {
      if (el && el.isConnected) this._populateSelect(el, opts);
    }
    // Clean up disconnected selects
    this._selects = this._selects.filter(s => s.el?.isConnected);
  },

  // ── Notify all listeners ──
  _notify() {
    this.populateAll();
    // Update custom font count badge (hide when 0)
    const badge = document.getElementById('font-custom-count');
    if (badge) {
      const count = this._customFonts.length;
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
  },
};
