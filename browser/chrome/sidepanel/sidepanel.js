// Pixeroo Side Panel - Unified Gallery with Overlay

let allImages = [];
let selectedSet = new Set();
let currentView = 'tiles';
let currentFilter = 'all';
let currentSort = 'position';
let overlayImage = null;

let favColors = [];
let recentPicks = [];

document.addEventListener('DOMContentLoaded', () => {
  restoreSession().then(() => {
    initMainTabs();
    initViewModes();
    initFilters();
    initSort();
    initSelection();
    initOverlay();
    initDownload();
    initEyedropper();
    initScreenshot();
    initColorFavorites();
    initColorsTab();
    scanPageImages();
  });

  document.getElementById('btn-refresh').addEventListener('click', scanPageImages);

  // Delegated click-to-copy for .copyable elements
  document.addEventListener('click', (e) => {
    if (e.target.classList?.contains('copyable')) {
      navigator.clipboard.writeText(e.target.textContent);
    }
  });

  document.getElementById('btn-sp-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'tabChanged') scanPageImages();
  });
});

// ============================================================
// Main Tabs (Images / Colors)
// ============================================================

function initMainTabs() {
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.mainTab}`)?.classList.add('active');
    });
  });
}

// ============================================================
// View Modes
// ============================================================

function initViewModes() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderGallery();
      saveSession();
    });
  });
}

// ============================================================
// Filters
// ============================================================

function initFilters() {
  document.getElementById('filter-type').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderGallery();
    updateToggleIcon();
    saveSession();
  });
}

function getFilteredImages() {
  let images = currentFilter === 'all'
    ? [...allImages]
    : allImages.filter(img => img.type === currentFilter);
  return applySorting(images);
}

// ============================================================
// Sorting
// ============================================================

function initSort() {
  document.getElementById('sort-by').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderGallery();
    saveSession();
  });
}

function applySorting(images) {
  switch (currentSort) {
    case 'position':
      return images; // original page order (already in order from scanner)

    case 'size-desc':
      return images.sort((a, b) => (b.size || 0) - (a.size || 0));

    case 'size-asc':
      return images.sort((a, b) => (a.size || 0) - (b.size || 0));

    case 'dims-desc':
      return images.sort((a, b) => {
        const aArea = (b.naturalWidth || b.width || 0) * (b.naturalHeight || b.height || 0);
        const bArea = (a.naturalWidth || a.width || 0) * (a.naturalHeight || a.height || 0);
        return aArea - bArea;
      });

    case 'dims-asc':
      return images.sort((a, b) => {
        const aArea = (a.naturalWidth || a.width || 0) * (a.naturalHeight || a.height || 0);
        const bArea = (b.naturalWidth || b.width || 0) * (b.naturalHeight || b.height || 0);
        return aArea - bArea;
      });

    case 'type':
      return images.sort((a, b) => (a.type || '').localeCompare(b.type || ''));

    case 'name':
      return images.sort((a, b) => {
        const nameA = a.filename || extractFilename(a.src);
        const nameB = b.filename || extractFilename(b.src);
        return nameA.localeCompare(nameB);
      });

    default:
      return images;
  }
}

// ============================================================
// Selection
// ============================================================

function initSelection() {
  document.getElementById('btn-toggle-select').addEventListener('click', () => {
    const filtered = getFilteredImages();
    const allSelected = filtered.every(img => selectedSet.has(img.src));

    if (allSelected) {
      filtered.forEach(img => selectedSet.delete(img.src));
    } else {
      filtered.forEach(img => selectedSet.add(img.src));
    }

    renderGallery();
    updateSelectionCount();
    updateToggleIcon();
  });
}

function updateToggleIcon() {
  const filtered = getFilteredImages();
  const allSelected = filtered.length > 0 && filtered.every(img => selectedSet.has(img.src));
  document.getElementById('icon-select').style.display = allSelected ? 'none' : '';
  document.getElementById('icon-deselect').style.display = allSelected ? '' : 'none';
}

function toggleSelection(src) {
  if (selectedSet.has(src)) {
    selectedSet.delete(src);
  } else {
    selectedSet.add(src);
  }
  updateSelectionCount();
  updateToggleIcon();
}

function updateSelectionCount() {
  const count = selectedSet.size;
  document.getElementById('sel-count-num').textContent = count;
  document.getElementById('btn-dl-selected').disabled = count === 0;

  document.querySelectorAll('.img-card').forEach(card => {
    const src = card.dataset.src;
    const cb = card.querySelector('.card-check input');
    card.classList.toggle('selected', selectedSet.has(src));
    if (cb) cb.checked = selectedSet.has(src);
  });
}

// ============================================================
// Page Scanner
// ============================================================

async function scanPageImages() {
  const gallery = document.getElementById('gallery');
  const extMsg = document.getElementById('extension-tab-msg');

  gallery.style.display = '';
  extMsg.style.display = 'none';
  gallery.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;font-size:0.8125rem;">Scanning page images...</div>';

  let tab;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  } catch (e) {
    showScanError('Could not access tabs');
    return;
  }

  if (!tab?.id) {
    showScanError('No active tab found');
    return;
  }

  // Try to message content script, inject if not present
  let response;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageImages' });
  } catch (e) {
    // Content script not injected yet -- try injecting it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/detector.js']
      });
      // Wait briefly for script to initialize
      await new Promise(r => setTimeout(r, 200));
      response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageImages' });
    } catch (e2) {
      const msg = (e2.message || '') + (e.message || '');
      if (msg.includes('establish connection') || msg.includes('Receiving end') || msg.includes('Cannot access')) {
        gallery.style.display = 'none';
        extMsg.style.display = 'block';
        document.getElementById('image-count').textContent = '';
      } else {
        showScanError('Could not scan this page. Try refreshing the webpage.');
      }
      return;
    }
  }

  if (response?.images) {
    allImages = response.images.map((img, i) => ({ ...img, _index: i }));
    document.getElementById('image-count').textContent = `${allImages.length} img`;
    renderGallery();
  } else {
    showScanError('No images found on this page');
  }
}

function showScanError(text) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = `<div style="text-align:center;padding:2rem 1rem;max-width:100%;">
    <div style="color:#94a3b8;font-size:0.8125rem;margin-bottom:0.5rem;word-wrap:break-word;">${escapeHtml(text)}</div>
    <div style="font-size:0.6875rem;color:#475569;line-height:1.5;">Make sure you are on a website and the page has fully loaded. Try clicking Refresh.</div>
  </div>`;
}

// ============================================================
// Type Badge
// ============================================================

function typeBadgeClass(type) {
  const t = (type || 'unknown').toLowerCase();
  const map = {
    jpeg: 'jpeg', jpg: 'jpeg', png: 'png', webp: 'webp',
    svg: 'svg', gif: 'gif', avif: 'avif', bmp: 'bmp',
    ico: 'ico', tiff: 'tiff', tif: 'tiff',
  };
  return `type-badge type-badge-${map[t] || 'unknown'}`;
}

function typeBadgeLabel(type) {
  const t = (type || '').toUpperCase();
  // Shorten for tiny badges
  if (t === 'JPEG') return 'JPG';
  if (t === 'TIFF') return 'TIF';
  return t || '?';
}

// ============================================================
// Gallery Renderer
// ============================================================

function renderGallery() {
  const gallery = document.getElementById('gallery');
  const images = getFilteredImages();

  gallery.className = `gallery view-${currentView}`;
  gallery.innerHTML = '';

  if (images.length === 0) {
    gallery.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--slate-500);font-size:0.8125rem;">No images found</div>';
    return;
  }

  images.forEach((img) => {
    const card = document.createElement('div');
    card.className = 'img-card' + (selectedSet.has(img.src) ? ' selected' : '');
    card.dataset.src = img.src;

    const filename = img.filename || extractFilename(img.src);
    const dims = img.naturalWidth && img.naturalHeight
      ? `${img.naturalWidth}x${img.naturalHeight}`
      : (img.width && img.height ? `${img.width}x${img.height}` : '');
    const meta = [dims, img.size ? formatBytes(img.size) : ''].filter(Boolean).join(' | ');

    card.innerHTML = `
      <span class="card-check">
        <input type="checkbox" ${selectedSet.has(img.src) ? 'checked' : ''} data-src="${escapeAttr(img.src)}">
      </span>
      <img src="${escapeAttr(img.src)}" alt="${escapeAttr(filename)}" loading="lazy" draggable="false">
      <span class="${typeBadgeClass(img.type)}">${typeBadgeLabel(img.type)}</span>
      <div class="card-label">
        <div class="card-name" title="${escapeAttr(filename)}">${escapeHtml(filename)}</div>
        <div class="card-meta">${escapeHtml(meta)}</div>
      </div>
    `;

    const cb = card.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', () => toggleSelection(img.src));

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-check')) return;
      openOverlay(img);
    });

    gallery.appendChild(card);
  });
}

// ============================================================
// Overlay
// ============================================================

function initOverlay() {
  const backdrop = document.getElementById('overlay-backdrop');
  if (!backdrop) return;

  document.getElementById('overlay-close')?.addEventListener('click', closeOverlay);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeOverlay();
  });

  // Overlay tabs
  document.querySelectorAll('.overlay-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.overlay-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`overlay-${tab.dataset.overlayTab}`)?.classList.add('active');
    });
  });

  // Save As format buttons
  document.querySelectorAll('[data-save-fmt]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!overlayImage) return;
      sendToContent('convertAndSave', { src: overlayImage.src, format: btn.dataset.saveFmt });
    });
  });

  // Action buttons
  document.getElementById('overlay-copy-png').addEventListener('click', () => {
    if (overlayImage) sendToContent('copyAsPng', { src: overlayImage.src });
  });

  document.getElementById('overlay-download').addEventListener('click', () => {
    if (overlayImage) {
      const filename = overlayImage.filename || extractFilename(overlayImage.src) || 'image';
      chrome.runtime.sendMessage({
        action: 'download',
        url: overlayImage.src,
        filename: `pixeroo/${filename}`,
        saveAs: true
      });
    }
  });

  document.getElementById('overlay-extract-colors').addEventListener('click', () => {
    if (overlayImage) sendToContent('extractColors', { src: overlayImage.src });
  });

  document.getElementById('overlay-read-qr').addEventListener('click', () => {
    if (overlayImage) sendToContent('readQR', { src: overlayImage.src });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!overlayImage) return;
    if (e.key === 'Escape') closeOverlay();
    if (e.key === 'ArrowLeft') navigateOverlay(-1);
    if (e.key === 'ArrowRight') navigateOverlay(1);
  });
}

function openOverlay(img) {
  overlayImage = img;
  const filename = img.filename || extractFilename(img.src);

  document.getElementById('overlay-title').textContent = filename;
  document.getElementById('overlay-img').src = img.src;

  // Build info rows
  const infoPanel = document.getElementById('overlay-info');
  const rows = [
    ['Filename', filename],
    ['Type', img.type || 'Unknown'],
    ['Dimensions', img.naturalWidth && img.naturalHeight
      ? `${img.naturalWidth} x ${img.naturalHeight} px`
      : (img.width && img.height ? `${img.width} x ${img.height} px` : 'Unknown')],
    ['Displayed', img.width && img.height && (img.width !== img.naturalWidth || img.height !== img.naturalHeight)
      ? `${img.width} x ${img.height} px`
      : null],
    ['File Size', img.size ? formatBytes(img.size) : 'Unknown'],
    ['Alt Text', img.alt || '(none)'],
    ['Title', img.title || null],
    ['Source', img.isBgImage ? 'CSS background-image' : null],
    ['URL', img.src],
  ].filter(([, v]) => v !== null);

  infoPanel.innerHTML = rows.map(([label, value]) => `
    <div class="info-row">
      <span class="info-label">${label}</span>
      <span class="info-value copyable" title="Click to copy">${escapeHtml(truncate(String(value), 50))}</span>
    </div>
  `).join('');

  // Reset to info tab
  document.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.overlay-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-overlay-tab="info"]')?.classList.add('active');
  document.getElementById('overlay-info')?.classList.add('active');

  document.getElementById('overlay-backdrop')?.classList.add('visible');

  // Load EXIF asynchronously
  loadExifData(img.src);
}

function closeOverlay() {
  document.getElementById('overlay-backdrop')?.classList.remove('visible');
  overlayImage = null;
}

function navigateOverlay(direction) {
  const images = getFilteredImages();
  if (images.length === 0 || !overlayImage) return;
  const currentIdx = images.findIndex(img => img.src === overlayImage.src);
  if (currentIdx === -1) return;
  const nextIdx = (currentIdx + direction + images.length) % images.length;
  openOverlay(images[nextIdx]);
}

// ============================================================
// EXIF Reader (lightweight, pure JS, JPEG only for now)
// ============================================================

async function loadExifData(src) {
  const content = document.getElementById('exif-content');
  const loading = document.getElementById('exif-loading');
  content.innerHTML = '';
  loading.style.display = 'block';
  loading.textContent = 'Loading EXIF data...';

  try {
    const resp = await fetch(src);
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const exif = parseExifFromJpeg(bytes);

    loading.style.display = 'none';

    if (exif.length === 0) {
      content.innerHTML = '<div style="color:var(--slate-500);font-size:0.75rem;text-align:center;padding:0.5rem;">No EXIF data found in this image</div>';
      return;
    }

    content.innerHTML = exif.map(([tag, value]) => `
      <div class="info-row">
        <span class="info-label">${escapeHtml(tag)}</span>
        <span class="info-value copyable" title="Click to copy">${escapeHtml(truncate(String(value), 40))}</span>
      </div>
    `).join('');
  } catch (e) {
    loading.textContent = 'Could not load EXIF data';
  }
}

function parseExifFromJpeg(bytes) {
  const entries = [];
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return entries; // Not JPEG

  let offset = 2;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];

    if (marker === 0xD9) break; // EOI
    if (marker === 0xDA) break; // SOS - start of scan, no more metadata

    const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];

    // APP1 = EXIF
    if (marker === 0xE1) {
      const exifHeader = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (exifHeader === 'Exif') {
        const tiffStart = offset + 10; // skip marker(2) + length(2) + "Exif\0\0"(6)
        parseTiffIFD(bytes, tiffStart, entries);
      }
    }

    offset += 2 + segLen;
  }

  return entries;
}

function parseTiffIFD(bytes, tiffStart, entries) {
  if (tiffStart + 8 > bytes.length) return;

  const le = bytes[tiffStart] === 0x49; // II = little-endian
  const r16 = (o) => le ? (bytes[o] | (bytes[o+1] << 8)) : ((bytes[o] << 8) | bytes[o+1]);
  const r32 = (o) => le
    ? (bytes[o] | (bytes[o+1] << 8) | (bytes[o+2] << 16) | (bytes[o+3] << 24)) >>> 0
    : ((bytes[o] << 24) | (bytes[o+1] << 16) | (bytes[o+2] << 8) | bytes[o+3]) >>> 0;

  const ifdOffset = r32(tiffStart + 4);
  const ifdStart = tiffStart + ifdOffset;
  if (ifdStart + 2 > bytes.length) return;

  const count = r16(ifdStart);
  const TAGS = {
    0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation',
    0x011A: 'XResolution', 0x011B: 'YResolution', 0x0128: 'ResolutionUnit',
    0x0131: 'Software', 0x0132: 'DateTime',
    0x829A: 'ExposureTime', 0x829D: 'FNumber',
    0x8827: 'ISO', 0x9003: 'DateTimeOriginal', 0x9004: 'DateTimeDigitized',
    0x920A: 'FocalLength', 0xA405: 'FocalLengthIn35mm',
    0xA001: 'ColorSpace', 0xA002: 'PixelXDimension', 0xA003: 'PixelYDimension',
    0x8769: 'ExifIFD', 0x8825: 'GPSIFD',
  };

  for (let i = 0; i < count && ifdStart + 2 + i * 12 + 12 <= bytes.length; i++) {
    const entryOff = ifdStart + 2 + i * 12;
    const tag = r16(entryOff);
    const type = r16(entryOff + 2);
    const cnt = r32(entryOff + 4);
    const valOff = entryOff + 8;

    const tagName = TAGS[tag];
    if (!tagName) continue;

    // Follow sub-IFDs
    if (tag === 0x8769 || tag === 0x8825) {
      const subOffset = r32(valOff);
      parseTiffIFDAt(bytes, tiffStart, tiffStart + subOffset, entries, le, TAGS);
      continue;
    }

    const value = readTagValue(bytes, tiffStart, type, cnt, valOff, le);
    if (value !== null) entries.push([tagName, value]);
  }
}

function parseTiffIFDAt(bytes, tiffStart, ifdStart, entries, le, TAGS) {
  if (ifdStart + 2 > bytes.length) return;

  const r16 = (o) => le ? (bytes[o] | (bytes[o+1] << 8)) : ((bytes[o] << 8) | bytes[o+1]);
  const r32 = (o) => le
    ? (bytes[o] | (bytes[o+1] << 8) | (bytes[o+2] << 16) | (bytes[o+3] << 24)) >>> 0
    : ((bytes[o] << 24) | (bytes[o+1] << 16) | (bytes[o+2] << 8) | bytes[o+3]) >>> 0;

  const count = r16(ifdStart);

  for (let i = 0; i < count && ifdStart + 2 + i * 12 + 12 <= bytes.length; i++) {
    const entryOff = ifdStart + 2 + i * 12;
    const tag = r16(entryOff);
    const type = r16(entryOff + 2);
    const cnt = r32(entryOff + 4);
    const valOff = entryOff + 8;

    const tagName = TAGS[tag];
    if (!tagName || tag === 0x8769 || tag === 0x8825) continue;

    const value = readTagValue(bytes, tiffStart, type, cnt, valOff, le);
    if (value !== null) entries.push([tagName, value]);
  }
}

function readTagValue(bytes, tiffStart, type, count, valOff, le) {
  const r16 = (o) => le ? (bytes[o] | (bytes[o+1] << 8)) : ((bytes[o] << 8) | bytes[o+1]);
  const r32 = (o) => le
    ? (bytes[o] | (bytes[o+1] << 8) | (bytes[o+2] << 16) | (bytes[o+3] << 24)) >>> 0
    : ((bytes[o] << 24) | (bytes[o+1] << 16) | (bytes[o+2] << 8) | bytes[o+3]) >>> 0;

  try {
    // ASCII string
    if (type === 2) {
      const dataOff = count > 4 ? tiffStart + r32(valOff) : valOff;
      let str = '';
      for (let i = 0; i < count - 1 && dataOff + i < bytes.length; i++) {
        str += String.fromCharCode(bytes[dataOff + i]);
      }
      return str.trim();
    }

    // SHORT (uint16)
    if (type === 3) return r16(valOff);

    // LONG (uint32)
    if (type === 4) return r32(valOff);

    // RATIONAL (two uint32: numerator/denominator)
    if (type === 5) {
      const dataOff = tiffStart + r32(valOff);
      if (dataOff + 8 > bytes.length) return null;
      const num = r32(dataOff);
      const den = r32(dataOff + 4);
      if (den === 0) return num;
      if (num % den === 0) return num / den;
      return `${num}/${den}`;
    }
  } catch {
    return null;
  }
  return null;
}

// ============================================================
// Download
// ============================================================

function initDownload() {
  document.getElementById('btn-dl-selected').addEventListener('click', () => {
    const images = allImages.filter(img => selectedSet.has(img.src));
    if (images.length > 0) downloadImages(images);
  });

  document.getElementById('btn-dl-all').addEventListener('click', () => {
    const images = getFilteredImages();
    if (images.length > 0) downloadImages(images);
  });
}

function downloadImages(images) {
  images.forEach((img, idx) => {
    const filename = img.filename || extractFilename(img.src) || `image-${idx + 1}`;
    chrome.runtime.sendMessage({
      action: 'download',
      url: img.src,
      filename: `pixeroo/${filename}`,
      saveAs: images.length === 1
    });
  });
}

// ============================================================
// Helpers
// ============================================================

async function sendToContent(action, data) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { action, ...data });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
}

function extractFilename(url) {
  try { return new URL(url).pathname.split('/').pop() || 'image'; }
  catch { return 'image'; }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h, s, l = (mx + mn) / 2;
  if (mx === mn) { h = s = 0; }
  else {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// ============================================================
// Eyedropper (captureVisibleTab + canvas overlay)
// ============================================================

let eyedropperActive = false;

function initEyedropper() {
  document.getElementById('btn-eyedropper').addEventListener('click', startEyedropper);
}

async function startEyedropper() {
  if (eyedropperActive) return;
  eyedropperActive = true;

  const btn = document.getElementById('btn-eyedropper');
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
  document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-main-tab="colors"]')?.classList.add('active');
  document.getElementById('tab-colors')?.classList.add('active');
}

// ============================================================
// Screenshot
// ============================================================

function initScreenshot() {
  document.getElementById('btn-screenshot').addEventListener('click', captureScreenshot);
  document.getElementById('btn-screenshot-close').addEventListener('click', () => {
    document.getElementById('screenshot-result').style.display = 'none';
  });
  document.getElementById('btn-ss-copy').addEventListener('click', copyScreenshot);
  document.getElementById('btn-ss-download').addEventListener('click', downloadScreenshot);
}

let lastScreenshotDataUrl = null;

async function captureScreenshot() {
  const response = await chrome.runtime.sendMessage({ action: 'captureTab' });
  if (response?.error || !response?.dataUrl) return;

  lastScreenshotDataUrl = response.dataUrl;
  const resultEl = document.getElementById('screenshot-result');
  resultEl.style.display = 'block';
  document.getElementById('screenshot-img').src = response.dataUrl;
}

async function copyScreenshot() {
  if (!lastScreenshotDataUrl) return;
  const resp = await fetch(lastScreenshotDataUrl);
  const blob = await resp.blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

function downloadScreenshot() {
  if (!lastScreenshotDataUrl) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  chrome.runtime.sendMessage({
    action: 'download',
    url: lastScreenshotDataUrl,
    filename: `pixeroo/screenshot-${timestamp}.png`,
    saveAs: true
  });
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
  document.getElementById('btn-colors-clear').addEventListener('click', () => {
    recentPicks = [];
    saveSession();
    renderPickedColors();
  });

  // Export
  document.getElementById('colors-export').addEventListener('change', (e) => {
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
}

function renderPickedColors() {
  const list = document.getElementById('picked-colors-list');
  if (!list) return;
  list.innerHTML = '';

  if (recentPicks.length === 0) {
    list.innerHTML = '<div style="padding:1rem 0.75rem;text-align:center;color:var(--slate-600);font-size:0.75rem;">Click "Pick Color" to start</div>';
    return;
  }

  recentPicks.forEach(c => {
    const item = document.createElement('div');
    item.className = 'color-item';

    const swatch = document.createElement('div');
    swatch.className = 'color-item-swatch';
    swatch.style.background = c.hex;
    swatch.title = 'Click to copy';
    swatch.addEventListener('click', () => navigator.clipboard.writeText(c.hex));

    const info = document.createElement('div');
    info.className = 'color-item-info';
    const hex = document.createElement('div');
    hex.className = 'color-item-hex';
    hex.textContent = c.hex;
    hex.addEventListener('click', () => navigator.clipboard.writeText(c.hex));
    const secondary = document.createElement('div');
    secondary.className = 'color-item-secondary';
    secondary.textContent = `rgb(${c.r}, ${c.g}, ${c.b})`;
    info.appendChild(hex);
    info.appendChild(secondary);

    const actions = document.createElement('div');
    actions.className = 'color-item-actions';
    const favBtn = document.createElement('button');
    favBtn.className = 'tool-btn';
    favBtn.title = 'Add to favorites';
    const isFav = favColors.includes(c.hex);
    favBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="${isFav ? '#ef4444' : 'none'}" stroke="${isFav ? '#ef4444' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    favBtn.addEventListener('click', () => addFavoriteColor(c.hex));
    actions.appendChild(favBtn);

    item.appendChild(swatch);
    item.appendChild(info);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

function renderFavoritesFull() {
  const list = document.getElementById('fav-colors-list-full');
  if (!list) return;
  list.innerHTML = '';

  if (favColors.length === 0) {
    list.innerHTML = '<div style="padding:0.75rem;text-align:center;color:var(--slate-600);font-size:0.75rem;">Add colors with the heart icon</div>';
    return;
  }

  favColors.forEach(hex => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);

    const item = document.createElement('div');
    item.className = 'color-item';

    const swatch = document.createElement('div');
    swatch.className = 'color-item-swatch';
    swatch.style.background = hex;
    swatch.title = 'Click to copy';
    swatch.addEventListener('click', () => navigator.clipboard.writeText(hex));

    const info = document.createElement('div');
    info.className = 'color-item-info';
    const hexEl = document.createElement('div');
    hexEl.className = 'color-item-hex';
    hexEl.textContent = hex;
    hexEl.addEventListener('click', () => navigator.clipboard.writeText(hex));
    const secondary = document.createElement('div');
    secondary.className = 'color-item-secondary';
    secondary.textContent = `rgb(${r}, ${g}, ${b})`;
    info.appendChild(hexEl);
    info.appendChild(secondary);

    const actions = document.createElement('div');
    actions.className = 'color-item-actions';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'tool-btn';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    removeBtn.addEventListener('click', () => removeFavoriteColor(hex));
    actions.appendChild(removeBtn);

    item.appendChild(swatch);
    item.appendChild(info);
    item.appendChild(actions);
    list.appendChild(item);
  });

  renderPickedColors();
}

// ============================================================
// Session Storage
// ============================================================

async function restoreSession() {
  try {
    const session = await chrome.storage.session.get({
      sessionView: 'tiles',
      sessionFilter: 'all',
      sessionSort: 'position',
      recentPicks: [],
    });

    currentView = session.sessionView;
    currentFilter = session.sessionFilter;
    currentSort = session.sessionSort;
    recentPicks = session.recentPicks || [];

    // Apply restored view
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
    document.getElementById('filter-type').value = currentFilter;
    document.getElementById('sort-by').value = currentSort;
  } catch {
    // session storage not available (Firefox MV2 fallback)
  }
}

function saveSession() {
  try {
    chrome.storage.session.set({
      sessionView: currentView,
      sessionFilter: currentFilter,
      sessionSort: currentSort,
      recentPicks: recentPicks,
    });
  } catch {}
}

