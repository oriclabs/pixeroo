// Snaproo — Platform Abstraction Layer
// Provides unified API that works in both Chrome Extension and PWA/standalone contexts.
// Extension uses chrome.* APIs, PWA uses standard web APIs.

const Platform = (function () {
  'use strict';

  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

  // ── Download ───────────────────────────────────────────
  function download(urlOrBlob, filename, saveAs) {
    if (isExtension) {
      const url = urlOrBlob instanceof Blob ? URL.createObjectURL(urlOrBlob) : urlOrBlob;
      chrome.runtime.sendMessage({
        action: 'download',
        url,
        filename: filename || 'snaproo-image',
        saveAs: saveAs !== false,
      });
    } else {
      // PWA/standalone: use <a download> trick
      const url = urlOrBlob instanceof Blob ? URL.createObjectURL(urlOrBlob) : urlOrBlob;
      const a = document.createElement('a');
      a.href = url;
      a.download = (filename || 'snaproo-image').replace(/^snaproo\//, '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  // ── Settings (sync) ────────────────────────────────────
  async function saveSetting(key, value) {
    if (isExtension) {
      return new Promise(r => chrome.storage.sync.set({ [key]: value }, r));
    } else {
      localStorage.setItem('snaproo_' + key, JSON.stringify(value));
    }
  }

  async function loadSettings(defaults) {
    if (isExtension) {
      return new Promise(r => chrome.storage.sync.get(defaults, r));
    } else {
      const result = {};
      for (const [key, def] of Object.entries(defaults)) {
        const stored = localStorage.getItem('snaproo_' + key);
        result[key] = stored !== null ? JSON.parse(stored) : def;
      }
      return result;
    }
  }

  // ── Local Storage (session/temp) ───────────────────────
  async function saveLocal(key, value) {
    if (isExtension) {
      return new Promise(r => chrome.storage.local.set({ [key]: value }, r));
    } else {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
  }

  async function loadLocal(key, defaultVal) {
    if (isExtension) {
      return new Promise(r => chrome.storage.local.get({ [key]: defaultVal }, data => r(data[key])));
    } else {
      try {
        const stored = localStorage.getItem(key);
        return stored !== null ? JSON.parse(stored) : defaultVal;
      } catch { return defaultVal; }
    }
  }

  async function removeLocal(key) {
    if (isExtension) {
      return new Promise(r => chrome.storage.local.remove(key, r));
    } else {
      localStorage.removeItem(key);
    }
  }

  // ── Open Editor (from popup/sidepanel) ─────────────────
  function openEditor(params) {
    if (isExtension) {
      chrome.runtime.sendMessage({ action: 'openEditor', ...params });
    } else {
      // PWA: already in the editor, just navigate
      const qs = [];
      if (params?.mode) qs.push('mode=' + params.mode);
      if (params?.params) qs.push(params.params);
      if (qs.length) window.location.search = '?' + qs.join('&');
    }
  }

  // ── Screenshot Capture ─────────────────────────────────
  async function captureTab() {
    if (isExtension) {
      return new Promise(r => chrome.runtime.sendMessage({ action: 'captureTab' }, r));
    }
    return { error: 'Not supported in PWA' };
  }

  function startRegionCapture(tabId) {
    if (isExtension) {
      chrome.runtime.sendMessage({ action: 'startRegionOnTab', tabId });
    }
    // Not available in PWA
  }

  // ── Message passing (extension only) ───────────────────
  function sendMessage(msg) {
    if (isExtension) {
      return chrome.runtime.sendMessage(msg);
    }
    return Promise.resolve(null);
  }

  function onMessage(handler) {
    if (isExtension && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handler);
    }
  }

  // ── Side Panel (extension only) ────────────────────────
  function openSidePanel(tabId) {
    if (isExtension && chrome.sidePanel) {
      chrome.sidePanel.open({ tabId }).catch(() => {});
    }
  }

  // ── Scripting (extension only) ─────────────────────────
  async function executeScript(tabId, files) {
    if (isExtension && chrome.scripting) {
      return chrome.scripting.executeScript({ target: { tabId }, files });
    }
    return null;
  }

  // ── Tabs (extension only) ──────────────────────────────
  async function getActiveTab() {
    if (isExtension) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    }
    return null;
  }

  // ── Feature Detection ──────────────────────────────────
  function supports(feature) {
    switch (feature) {
      case 'screenshot': return isExtension;
      case 'regionCapture': return isExtension;
      case 'sidePanel': return isExtension && !!chrome.sidePanel;
      case 'pageImages': return isExtension;
      case 'eyedropper': return isExtension;
      case 'contextMenu': return isExtension;
      case 'downloads': return true; // both support via different methods
      case 'storage': return true;
      case 'library': return typeof indexedDB !== 'undefined';
      default: return false;
    }
  }

  // ── Chrome API Shims (for PWA compatibility) ───────────
  // Provides chrome.storage and chrome.runtime stubs when running outside extension
  if (!isExtension) {
    window.chrome = window.chrome || {};
    chrome.storage = chrome.storage || {
      sync: {
        get: (defaults, cb) => { loadSettings(defaults).then(r => cb(r)); },
        set: (obj, cb) => { for (const [k,v] of Object.entries(obj)) saveSetting(k,v); if (cb) cb(); },
        clear: (cb) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('snaproo_')); keys.forEach(k => localStorage.removeItem(k)); if (cb) cb(); },
      },
      local: {
        get: (keyOrObj, cb) => {
          if (typeof keyOrObj === 'string') {
            loadLocal(keyOrObj, undefined).then(v => cb({ [keyOrObj]: v }));
          } else {
            const result = {};
            for (const [k, def] of Object.entries(keyOrObj)) {
              const stored = localStorage.getItem(k);
              result[k] = stored !== null ? JSON.parse(stored) : def;
            }
            cb(result);
          }
        },
        set: (obj, cb) => { for (const [k,v] of Object.entries(obj)) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } if (cb) cb(); },
        remove: (key, cb) => { localStorage.removeItem(key); if (cb) cb(); },
      },
    };
    chrome.runtime = chrome.runtime || {
      id: null,
      getURL: (path) => path,
      sendMessage: () => Promise.resolve(null),
      onMessage: { addListener: () => {} },
    };
    chrome.tabs = chrome.tabs || {
      query: () => Promise.resolve([]),
      create: (opts) => { if (opts.url) window.open(opts.url); },
    };
  }

  // ── Apply platform visibility classes ────────────────
  // Add CSS class to body so CSS can hide extension-only elements
  document.addEventListener('DOMContentLoaded', () => {
    if (!isExtension) {
      document.body.classList.add('pwa-mode');
    }
  });

  return {
    isExtension,
    download,
    saveSetting,
    loadSettings,
    saveLocal,
    loadLocal,
    removeLocal,
    openEditor,
    captureTab,
    startRegionCapture,
    sendMessage,
    onMessage,
    openSidePanel,
    executeScript,
    getActiveTab,
    supports,
  };
})();
