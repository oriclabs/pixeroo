// ============================================================
// Page Colors Tab — Eyedropper, Favorites, Palette, Contrast Checker
// ============================================================

// ============================================================
// Eyedropper (captureVisibleTab + canvas overlay)
// ============================================================

function initEyedropper() {
  $('btn-eyedropper').addEventListener('click', startEyedropper);
  // Escape in side panel cancels eyedropper
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && eyedropperActive) {
      startEyedropper(); // toggles off
    }
  });
}

async function startEyedropper() {
  const btn = $('btn-eyedropper');

  // Toggle off — cancel active eyedropper
  if (eyedropperActive) {
    eyedropperActive = false;
    btn.style.color = '';
    // Tell content script to close the overlay
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'cancelEyedropper' }).catch(() => {});
    } catch {}
    return;
  }

  eyedropperActive = true;
  btn.style.color = '#F4C430';

  try {
    // Step 1: Capture visible tab
    const capture = await chrome.runtime.sendMessage({ action: 'captureTab' });
    if (!capture?.dataUrl) {
      btn.style.color = '';
      eyedropperActive = false;
      return;
    }

    // Step 2: Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      btn.style.color = '';
      eyedropperActive = false;
      return;
    }

    // Step 3: Ensure content script is injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/detector.js']
      });
    } catch {
      // Already injected or can't inject -- try anyway
    }

    // Step 4: Small delay for script init, then send eyedropper command
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'startEyedropper',
        screenshot: capture.dataUrl
      }, (result) => {
        btn.style.color = '';
        eyedropperActive = false;
        if (chrome.runtime.lastError) return;
        if (result?.color) showPickedColor(result.color);
      });
    }, 150);

  } catch (e) {
    btn.style.color = '';
    eyedropperActive = false;
  }
}

function showPickedColor(color) {
  if (!color?.hex) return;

  // Add to picked list
  recentPicks = recentPicks.filter(c => c.hex !== color.hex);
  recentPicks.unshift(color);
  if (recentPicks.length > 30) recentPicks.pop();

  saveSession();
  renderPickedColors();

  // Switch to Colors tab
  $$('.main-tab').forEach(t => t.classList.remove('active'));
  $$('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-main-tab="colors"]')?.classList.add('active');
  $('tab-colors')?.classList.add('active');
}

// ============================================================
// Color Favorites (permanent, synced)
// ============================================================

function initColorFavorites() {
  chrome.storage.sync.get({ favColors: [] }, (result) => {
    favColors = result.favColors || [];
    renderFavoritesFull();
  });
}

function addFavoriteColor(hex) {
  if (favColors.includes(hex)) return;
  favColors.unshift(hex);
  if (favColors.length > 30) favColors.pop();
  chrome.storage.sync.set({ favColors });
  renderFavoritesFull();
}

function removeFavoriteColor(hex) {
  favColors = favColors.filter(c => c !== hex);
  chrome.storage.sync.set({ favColors });
  renderFavoritesFull();
}

// ============================================================
// Colors Tab
// ============================================================

function initColorsTab() {
  renderPickedColors();
  renderFavoritesFull();

  // Clear picked
  $('btn-colors-clear').addEventListener('click', () => {
    recentPicks = [];
    saveSession();
    renderPickedColors();
  });

  // Extract page palette
  $('btn-extract-palette').addEventListener('click', extractPagePalette);

  // Export
  $('colors-export').addEventListener('change', (e) => {
    const fmt = e.target.value;
    const allColors = [...recentPicks.map(c => c.hex), ...favColors];
    const unique = [...new Set(allColors)];
    let output = '';

    if (fmt === 'css') {
      output = unique.map((hex, i) => `  --color-${i + 1}: ${hex};`).join('\n');
      output = `:root {\n${output}\n}`;
    } else if (fmt === 'json') {
      output = JSON.stringify(unique, null, 2);
    } else if (fmt === 'text') {
      output = unique.join('\n');
    }

    if (output) navigator.clipboard.writeText(output);
    e.target.selectedIndex = 0; // reset dropdown
  });

  // Close color detail popover on click outside
  document.addEventListener('click', (e) => {
    const popover = document.querySelector('.color-detail');
    if (popover && !popover.contains(e.target) && !e.target.classList.contains('color-swatch')) {
      popover.remove();
    }
  });
}

// ---- Swatch creation helper ----

function createColorSwatch(hex, opts = {}) {
  const swatch = document.createElement('div');
  swatch.className = 'color-swatch';
  swatch.style.background = hex;
  swatch.title = opts.tooltip || hex;
  swatch.dataset.hex = hex;

  // Heart icon (show on hover to add to favorites)
  if (opts.showHeart !== false) {
    const heart = document.createElement('div');
    heart.className = 'swatch-heart';
    const isFav = favColors.includes(hex);
    heart.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="${isFav ? '#ef4444' : 'none'}" stroke="${isFav ? '#ef4444' : '#94a3b8'}" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    heart.addEventListener('click', (e) => {
      e.stopPropagation();
      if (favColors.includes(hex)) {
        removeFavoriteColor(hex);
      } else {
        addFavoriteColor(hex);
      }
      // Re-render to update heart state
      renderPickedColors();
      renderPagePalette();
    });
    swatch.appendChild(heart);
  }

  // Usage count badge
  if (opts.count) {
    const badge = document.createElement('span');
    badge.className = 'swatch-count';
    badge.textContent = opts.count;
    swatch.appendChild(badge);
  }

  // Click: assign to contrast checker if active, otherwise show detail popover
  swatch.addEventListener('click', (e) => {
    e.stopPropagation();
    if (contrastTarget) {
      if (contrastTarget === 'fg') {
        contrastFg = hex;
        $('contrast-fg').style.background = hex;
        $('contrast-fg').textContent = '';
      } else {
        contrastBg = hex;
        $('contrast-bg').style.background = hex;
        $('contrast-bg').textContent = '';
      }
      contrastTarget = null;
      $('contrast-fg').classList.remove('active');
      $('contrast-bg').classList.remove('active');
      const hint = $('contrast-hint');
      if (hint) hint.textContent = '';
      updateContrastResult();
      return;
    }
    showColorDetail(hex, swatch);
  });

  // Right-click context menu on all swatches
  swatch.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rgb = hexToRgb(hex);
    const hsl = rgbToHslObj(rgb.r, rgb.g, rgb.b);
    const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    const isFav = favColors.includes(hex);
    const items = [
      { label: 'Copy HEX', icon: _ctxIcons.copy, action: () => navigator.clipboard.writeText(hex) },
      { label: 'Copy RGB', icon: _ctxIcons.copy, action: () => navigator.clipboard.writeText(rgbStr) },
      { label: 'Copy HSL', icon: _ctxIcons.copy, action: () => navigator.clipboard.writeText(hslStr) },
      'sep',
      isFav
        ? { label: 'Remove from Favorites', icon: _ctxIcons.trash, action: () => { removeFavoriteColor(hex); renderPickedColors(); renderPagePalette(); } }
        : { label: 'Add to Favorites', icon: _ctxIcons.bookmark, action: () => { addFavoriteColor(hex); renderPickedColors(); renderPagePalette(); } },
      'sep',
      { label: 'Save to Library', icon: _ctxIcons.bookmark, action: async () => {
        const collection = await pickCollectionDialog('Save color to:');
        if (collection) saveColorToLibrary(hex, rgbStr, hslStr, collection);
      }},
      'sep',
      { label: 'Set as Contrast FG', action: () => { contrastFg = hex; $('contrast-fg').style.background = hex; $('contrast-fg').textContent = ''; updateContrastResult(); }},
      { label: 'Set as Contrast BG', action: () => { contrastBg = hex; $('contrast-bg').style.background = hex; $('contrast-bg').textContent = ''; updateContrastResult(); }},
    ];
    _showCtxMenu(e.clientX, e.clientY, items);
  });

  return swatch;
}

// ---- Color detail popover ----

function showColorDetail(hex, anchorEl) {
  // Remove existing popover
  document.querySelector('.color-detail')?.remove();

  const rgb = hexToRgb(hex);
  const hsl = rgbToHslObj(rgb.r, rgb.g, rgb.b);
  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const popover = document.createElement('div');
  popover.className = 'color-detail';

  popover.innerHTML = `
    <div class="color-detail-preview" style="background:${hex};"></div>
    <div class="color-detail-values">
      <div class="color-detail-row"><span>HEX</span><span class="copyable" data-copy="${hex}">${hex}</span></div>
      <div class="color-detail-row"><span>RGB</span><span class="copyable" data-copy="${rgbStr}">${rgbStr}</span></div>
      <div class="color-detail-row"><span>HSL</span><span class="copyable" data-copy="${hslStr}">${hslStr}</span></div>
    </div>
    <div class="color-detail-actions">
      <button class="cd-copy-hex">Copy HEX</button>
      <button class="cd-save-lib">Save to Library</button>
    </div>
  `;

  // Copy on click for .copyable spans
  popover.querySelectorAll('.copyable').forEach(el => {
    el.addEventListener('click', () => navigator.clipboard.writeText(el.dataset.copy));
  });

  // Copy HEX button
  popover.querySelector('.cd-copy-hex').addEventListener('click', () => {
    navigator.clipboard.writeText(hex);
  });

  // Save to Library button
  popover.querySelector('.cd-save-lib').addEventListener('click', async () => {
    const collection = await pickCollectionDialog('Save color to:');
    if (!collection) return;
    await saveColorToLibrary(hex, rgbStr, hslStr, collection);
    popover.remove();
  });

  document.body.appendChild(popover);

  // Position near anchor
  const rect = anchorEl.getBoundingClientRect();
  let top = rect.bottom + 4;
  let left = rect.left;

  // Keep within viewport
  if (top + 200 > window.innerHeight) top = rect.top - 210;
  if (left + 220 > window.innerWidth) left = window.innerWidth - 228;
  if (left < 4) left = 4;

  popover.style.top = top + 'px';
  popover.style.left = left + 'px';

  // If contrast target is active, also assign to contrast checker
  if (contrastTarget) {
    if (contrastTarget === 'fg') {
      contrastFg = hex;
      $('contrast-fg').style.background = hex;
    } else {
      contrastBg = hex;
      $('contrast-bg').style.background = hex;
    }
    contrastTarget = null;
    $('contrast-fg').classList.remove('active');
    $('contrast-bg').classList.remove('active');
    updateContrastResult();
  }
}

// ---- Extract page palette ----

async function extractPagePalette() {
  const btn = $('btn-extract-palette');
  btn.style.color = '#F4C430';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      btn.style.color = '';
      return;
    }

    // Ensure content script is injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/detector.js']
      });
    } catch {}

    chrome.tabs.sendMessage(tab.id, { action: 'extractPageColors' }, (result) => {
      btn.style.color = '';
      if (chrome.runtime.lastError || !result?.colors) {
        pixDialog.alert('Extract Failed', 'Could not extract colors from this page. Some pages (chrome://, new tab) are restricted.');
        return;
      }
      pagePalette = result.colors;
      renderPagePalette();
    });
  } catch (e) {
    btn.style.color = '';
  }
}

function renderPagePalette() {
  const list = $('page-palette-list');
  if (!list) return;
  list.innerHTML = '';

  if (pagePalette.length === 0) {
    list.innerHTML = '<div style="grid-column:1/-1;padding:0.5rem;text-align:center;color:var(--slate-500);">Click "Extract Palette" to scan page CSS</div>';
    return;
  }

  pagePalette.forEach(c => {
    const swatch = createColorSwatch(c.hex, {
      tooltip: `${c.hex} (used ${c.count}x)`,
      count: c.count > 1 ? c.count : null
    });
    list.appendChild(swatch);
  });
}

// ---- Render picked colors as swatch grid ----

function renderPickedColors() {
  const list = $('picked-colors-list');
  if (!list) return;
  list.innerHTML = '';

  if (recentPicks.length === 0) {
    list.innerHTML = '<div style="grid-column:1/-1;padding:0.5rem;text-align:center;color:var(--slate-500);">Click "Pick Color" to start</div>';
    return;
  }

  recentPicks.forEach(c => {
    const swatch = createColorSwatch(c.hex, { tooltip: c.hex });
    list.appendChild(swatch);
  });
}

// ---- Render favorites as swatch grid ----

function renderFavoritesFull() {
  const list = $('fav-colors-list-full');
  if (!list) return;
  list.innerHTML = '';

  if (favColors.length === 0) {
    list.innerHTML = '<div style="grid-column:1/-1;padding:0.5rem;text-align:center;color:var(--slate-500);">Add colors with the heart icon</div>';
    return;
  }

  favColors.forEach(hex => {
    const swatch = createColorSwatch(hex, { tooltip: hex, showHeart: false });
    // Delete button (×) on hover
    const del = document.createElement('span');
    del.textContent = '\u00d7';
    del.style.cssText = 'position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:var(--slate-800);color:#ef4444;border:1px solid var(--slate-700);border-radius:50%;font-size:10px;line-height:12px;text-align:center;cursor:pointer;display:none;z-index:2;';
    del.addEventListener('click', (e) => { e.stopPropagation(); removeFavoriteColor(hex); });
    swatch.appendChild(del);
    swatch.addEventListener('mouseenter', () => { del.style.display = 'block'; });
    swatch.addEventListener('mouseleave', () => { del.style.display = 'none'; });
    list.appendChild(swatch);
  });

  renderPickedColors();
}

// ---- Contrast checker ----

function initContrastChecker() {
  const fgEl = $('contrast-fg');
  const bgEl = $('contrast-bg');
  if (!fgEl || !bgEl) return;

  function setContrastTarget(target) {
    contrastTarget = contrastTarget === target ? null : target;
    fgEl.classList.toggle('active', contrastTarget === 'fg');
    bgEl.classList.toggle('active', contrastTarget === 'bg');
    // Show instruction
    const hint = $('contrast-hint');
    if (hint) hint.textContent = contrastTarget ? `Click any color swatch to set ${contrastTarget === 'fg' ? 'foreground' : 'background'}` : '';
  }

  fgEl.addEventListener('click', () => setContrastTarget('fg'));
  bgEl.addEventListener('click', () => setContrastTarget('bg'));

  updateContrastResult();
}

function updateContrastResult() {
  const ratio = getContrastRatio(contrastFg, contrastBg);
  const ratioStr = ratio.toFixed(1) + ':1';
  $('contrast-ratio').textContent = ratioStr;

  const wcagEl = $('contrast-wcag');
  if (ratio >= 7) {
    wcagEl.textContent = 'AAA';
    wcagEl.style.color = '#4ade80';
  } else if (ratio >= 4.5) {
    wcagEl.textContent = 'AA';
    wcagEl.style.color = '#4ade80';
  } else if (ratio >= 3) {
    wcagEl.textContent = 'AA Large';
    wcagEl.style.color = '#facc15';
  } else {
    wcagEl.textContent = 'Fail';
    wcagEl.style.color = '#f87171';
  }
}

// ---- Save color to library ----

async function saveColorToLibrary(hex, rgb, hsl, collection) {
  try {
    await PixLibrary.add({
      dataUrl: '',
      type: 'color',
      source: 'Color pick',
      name: hex,
      color: hex,
      width: 0, height: 0,
      collection: collection || 'General',
    });
    await renderLibrary();
    $('lib-count').textContent = `(${(await PixLibrary.getUsage()).count})`;
  } catch {}
}

// ============================================================
// Color Item Context Menu
// ============================================================

function _attachColorCtxMenu(container, getColorData) {
  container?.addEventListener('contextmenu', (e) => {
    const colorItem = e.target.closest('.color-item');
    if (!colorItem) return;
    e.preventDefault();
    e.stopPropagation();

    const colorData = getColorData(colorItem);
    if (!colorData) return;

    const hex = colorData.hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const hsl = rgbToHsl(r, g, b);
    const rgb = `rgb(${r}, ${g}, ${b})`;

    const items = [
      {
        label: 'Copy HEX',
        icon: _ctxIcons.palette,
        action: () => navigator.clipboard.writeText(hex)
      },
      {
        label: 'Copy RGB',
        icon: _ctxIcons.palette,
        action: () => navigator.clipboard.writeText(rgb)
      },
      {
        label: 'Copy HSL',
        icon: _ctxIcons.palette,
        action: () => navigator.clipboard.writeText(hsl)
      },
    ];

    // "Save to Library" only for picked colors (not favorites, which are already saved differently)
    if (colorData.canSaveToLib) {
      items.push('sep');
      items.push({
        label: 'Save to Library',
        icon: _ctxIcons.bookmark,
        action: async () => {
          const collection = await pickCollectionDialog('Save color to:');
          if (collection) saveColorToLibrary(hex, rgb, hsl, collection);
        }
      });
    }

    _showCtxMenu(e.clientX, e.clientY, items);
  });
}

// Attach to picked colors list
_attachColorCtxMenu($('picked-colors-list'), (item) => {
  const hexEl = item.querySelector('.color-item-hex');
  if (!hexEl) return null;
  return { hex: hexEl.textContent.trim(), canSaveToLib: true };
});

// Attach to favorites list
_attachColorCtxMenu($('fav-colors-list-full'), (item) => {
  const hexEl = item.querySelector('.color-item-hex');
  if (!hexEl) return null;
  return { hex: hexEl.textContent.trim(), canSaveToLib: false };
});
