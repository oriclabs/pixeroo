/* ──────────────────────────────────────────────────
   Guided Tour — Side Panel
   ────────────────────────────────────────────────── */

const SP_TOUR_STEPS = [
  // General
  { target: '.main-tabs', title: 'Navigation', text: 'Switch between Page (images from current webpage), Page Colors (color picker & palette), and My Library (saved images).' },

  // Page tab
  { target: '#btn-refresh', title: 'Refresh', text: 'Rescan the current page for images. Auto-refreshes when you switch tabs or scroll (lazy-loaded images detected).' },
  { target: '[data-view="tiles"]', title: 'View Modes', text: '5 view modes: Tiles, Medium, Large, Details, Names. Pick your preferred layout.' },
  { target: '#btn-type-filter', title: 'Type Filter', text: 'Filter by image type \u2014 select multiple formats like PNG + SVG together.' },
  { target: '#btn-toggle-select', title: 'Select & Save', text: 'Select All/None, Save to Library (with collection picker), or Remove from Library. Works on selected or all images.' },
  { target: '#btn-screenshot', title: 'Screenshots', text: 'Capture the viewport or drag to select a region. Screenshots save to My Library automatically.' },
  { target: '#page-bottom-bar', title: 'Download', text: 'Download selected or all images as a ZIP file. Right-click any image for individual download or format conversion.' },

  // Colors tab
  { target: '[data-main-tab="colors"]', title: 'Page Colors', text: 'Pick colors from any webpage, extract the page CSS palette, save favorites, and check WCAG contrast ratios.', switchTab: 'colors' },
  { target: '#btn-eyedropper', title: 'Color Picker', text: 'Click to activate, then click any pixel on the page. Press Escape or click again to cancel.' },
  { target: '.contrast-checker', title: 'Contrast Check', text: 'Click FG, pick a color. Click BG, pick another. Shows WCAG accessibility rating (AAA/AA/Fail).' },

  // Library tab
  { target: '[data-main-tab="library"]', title: 'My Library', text: 'All saved images, screenshots, and colors. Organized by collections. Persistent across sessions.', switchTab: 'library' },
  { target: '[data-lib-filter="all"]', title: 'Filter & Collections', text: 'Filter by type (Images/Screenshots/Colors) and collection. Select items with checkboxes.' },
  { target: '#lib-bottom-bar', title: 'Library Actions', text: 'Select All, export selected/all as ZIP. Send images to Edit, Collage, or Batch tools in the Toolkit.' },

  // Settings
  { target: '#btn-sp-settings', title: 'Quick Settings', text: 'Change theme (dark/light), font family, font size, and toggle hover tooltips.' },
];

let spTourStep = -1;
let spTourOverlay = null;

function startSPTour() {
  spTourStep = 0;
  showSPTourStep();
}

function showSPTourStep() {
  // Remove existing overlay
  document.querySelector('.sp-tour-overlay')?.remove();

  if (spTourStep < 0 || spTourStep >= SP_TOUR_STEPS.length) {
    endSPTour();
    return;
  }

  const step = SP_TOUR_STEPS[spTourStep];

  // Switch tab if needed
  if (step.switchTab) {
    const tabBtn = document.querySelector(`[data-main-tab="${step.switchTab}"]`);
    if (tabBtn) tabBtn.click();
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sp-tour-overlay';

  // Highlight target element
  const targetEl = document.querySelector(step.target);
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.className = 'sp-tour-highlight';
    highlight.style.top = (rect.top - 4) + 'px';
    highlight.style.left = (rect.left - 4) + 'px';
    highlight.style.width = (rect.width + 8) + 'px';
    highlight.style.height = (rect.height + 8) + 'px';
    overlay.appendChild(highlight);

    // Scroll into view if needed
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Banner at bottom
  const banner = document.createElement('div');
  banner.className = 'sp-tour-banner';

  // Progress dots
  const dots = SP_TOUR_STEPS.map((_, i) =>
    `<div class="sp-tour-dot${i === spTourStep ? ' active' : ''}"></div>`
  ).join('');

  banner.innerHTML = `
    <div class="sp-tour-title">${step.title}</div>
    <div class="sp-tour-text">${step.text}</div>
    <div class="sp-tour-nav">
      <div class="sp-tour-dots">${dots}</div>
      <div class="sp-tour-btns">
        <button class="tool-btn sp-tour-skip" style="padding:3px 10px;border:1px solid var(--slate-700);border-radius:4px;">Skip</button>
        ${spTourStep > 0 ? '<button class="tool-btn sp-tour-prev" style="padding:3px 10px;border:1px solid var(--slate-700);border-radius:4px;">Prev</button>' : ''}
        <button class="btn-primary sp-tour-next" style="padding:3px 12px;">${spTourStep === SP_TOUR_STEPS.length - 1 ? 'Done' : 'Next'}</button>
      </div>
    </div>
  `;

  overlay.appendChild(banner);
  document.body.appendChild(overlay);
  spTourOverlay = overlay;

  // Wire buttons
  banner.querySelector('.sp-tour-skip')?.addEventListener('click', endSPTour);
  banner.querySelector('.sp-tour-prev')?.addEventListener('click', () => { spTourStep--; showSPTourStep(); });
  banner.querySelector('.sp-tour-next')?.addEventListener('click', () => { spTourStep++; showSPTourStep(); });
}

function endSPTour() {
  document.querySelector('.sp-tour-overlay')?.remove();
  spTourOverlay = null;
  spTourStep = -1;
  // Switch back to Page tab
  document.querySelector('[data-main-tab="images"]')?.click();
}

// Keyboard navigation during tour
document.addEventListener('keydown', (e) => {
  if (spTourStep < 0) return;
  if (e.key === 'Escape') endSPTour();
  if (e.key === 'ArrowRight' || e.key === 'Enter') { spTourStep++; showSPTourStep(); }
  if (e.key === 'ArrowLeft') { spTourStep--; showSPTourStep(); }
});

// Wire tour button
$('btn-sp-tour')?.addEventListener('click', startSPTour);

// Help button — opens full help page
$('btn-sp-help')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html') });
});

// FAQ button — opens help page at FAQ section
$('btn-sp-faq')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html#faq') });
});

// Show tour hint on first use — points to the ? button
chrome.storage.sync.get({ spTourSeen: false }, (r) => {
  if (!r.spTourSeen) {
    setTimeout(() => {
      const btn = $('btn-sp-tour');
      if (!btn) return;
      const hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;z-index:2000;background:var(--saffron-400);color:#1e293b;font-weight:600;padding:6px 12px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;white-space:nowrap;';
      const rect = btn.getBoundingClientRect();
      hint.style.top = (rect.bottom + 8) + 'px';
      hint.style.right = '12px';
      hint.innerHTML = 'New here? Click <b>?</b> for a quick tour &rarr;';
      // Arrow
      const arrow = document.createElement('div');
      arrow.style.cssText = 'position:absolute;top:-6px;right:14px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:6px solid var(--saffron-400);';
      hint.appendChild(arrow);
      hint.addEventListener('click', () => { hint.remove(); startSPTour(); });
      // Auto-dismiss after 8 seconds
      setTimeout(() => hint.remove(), 8000);
      document.body.appendChild(hint);
      chrome.storage.sync.set({ spTourSeen: true });
    }, 1500);
  }
});
