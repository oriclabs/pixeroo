// Pixeroo - Shared Theme System
// Include this script in every HTML page (popup, sidepanel, editor, settings, help)

(function () {
  const LIGHT_VARS = {
    '--slate-950': '#ffffff',
    '--slate-900': '#f8fafc',
    '--slate-800': '#e2e8f0',
    '--slate-700': '#cbd5e1',
    '--slate-600': '#94a3b8',
    '--slate-500': '#64748b',
    '--slate-400': '#475569',
    '--slate-300': '#334155',
    '--slate-200': '#1e293b',
    '--slate-100': '#0f172a',
    '--slate-50': '#020617',
  };

  const DARK_VARS = {
    '--slate-50': '#f8fafc',
    '--slate-100': '#f1f5f9',
    '--slate-200': '#e2e8f0',
    '--slate-300': '#cbd5e1',
    '--slate-400': '#94a3b8',
    '--slate-500': '#64748b',
    '--slate-600': '#475569',
    '--slate-700': '#334155',
    '--slate-800': '#1e293b',
    '--slate-900': '#0f172a',
    '--slate-950': '#020617',
  };

  function applyTheme(theme) {
    const vars = theme === 'light' ? LIGHT_VARS : DARK_VARS;
    const root = document.documentElement;

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    // Toggle body class for pages using hardcoded colors
    document.body?.classList.toggle('theme-light', theme === 'light');
    document.body?.classList.toggle('theme-dark', theme === 'dark');

    // Update hardcoded bg/text on body (for popup which uses inline styles)
    if (document.body) {
      if (theme === 'light') {
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#1e293b';
      } else {
        document.body.style.backgroundColor = '#020617';
        document.body.style.color = '#f3f4f6';
      }
    }
  }

  // Load and apply on page load
  async function init() {
    try {
      const result = await chrome.storage.sync.get({ theme: 'dark' });
      applyTheme(result.theme);
    } catch {
      applyTheme('dark');
    }
  }

  // Listen for theme changes from settings page
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.theme) {
      applyTheme(changes.theme.newValue);
    }
  });

  // Apply as early as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
