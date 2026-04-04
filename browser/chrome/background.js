// Gazo - Background Service Worker
// Handles context menus, commands, message routing, QR reading

// Load jsQR locally (bundled, no CDN)
importScripts('lib/jsQR.min.js');

// --- Context Menu Setup ---
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: 'gazo',
    title: 'Gazo',
    contexts: ['image']
  });

  // Image info
  chrome.contextMenus.create({
    id: 'gazo-info',
    parentId: 'gazo',
    title: 'View Image Info',
    contexts: ['image']
  });

  // Save As submenu
  chrome.contextMenus.create({
    id: 'gazo-saveas',
    parentId: 'gazo',
    title: 'Save As...',
    contexts: ['image']
  });

  const formats = ['PNG', 'JPEG', 'WebP', 'AVIF', 'BMP', 'ICO'];
  formats.forEach(fmt => {
    chrome.contextMenus.create({
      id: `gazo-save-${fmt.toLowerCase()}`,
      parentId: 'gazo-saveas',
      title: fmt,
      contexts: ['image']
    });
  });

  // Copy as PNG
  chrome.contextMenus.create({
    id: 'gazo-copy-png',
    parentId: 'gazo',
    title: 'Copy as PNG',
    contexts: ['image']
  });

  // Read QR
  chrome.contextMenus.create({
    id: 'gazo-read-qr',
    parentId: 'gazo',
    title: 'Read QR Code',
    contexts: ['image']
  });

  // Separator + page-level actions
  chrome.contextMenus.create({
    id: 'gazo-separator',
    parentId: 'gazo',
    type: 'separator',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: 'gazo-extract-colors',
    parentId: 'gazo',
    title: 'Extract Colors',
    contexts: ['image']
  });
});

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const { menuItemId, srcUrl } = info;

  if (menuItemId === 'gazo-info') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showImageInfo',
      src: srcUrl
    });
  } else if (menuItemId.startsWith('gazo-save-')) {
    const format = menuItemId.replace('gazo-save-', '');
    chrome.tabs.sendMessage(tab.id, {
      action: 'convertAndSave',
      src: srcUrl,
      format: format
    });
  } else if (menuItemId === 'gazo-copy-png') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'copyAsPng',
      src: srcUrl
    });
  } else if (menuItemId === 'gazo-read-qr') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'readQR',
      src: srcUrl
    });
  } else if (menuItemId === 'gazo-extract-colors') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'extractColors',
      src: srcUrl
    });
  }
});

// --- Keyboard Commands ---
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'quick-qr') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'quickQR',
      url: tab.url
    });
  } else if (command === 'open-toolkit') {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// --- Message Router ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || 'gazo-image',
      saveAs: message.saveAs !== false
    }, (downloadId) => {
      sendResponse({ success: true, downloadId });
    });
    return true; // async response
  }

  if (message.action === 'readQR') {
    try {
      const data = new Uint8ClampedArray(message.data);
      const result = jsQR(data, message.width, message.height);
      sendResponse({ text: result?.data || null });
    } catch (e) {
      sendResponse({ text: null, error: e.message });
    }
    return true;
  }

  if (message.action === 'openEditor') {
    (async () => {
      const mode = message.mode || '';
      const fromLib = message.fromLib || false;
      const extraParams = message.params || '';
      const editorUrl = chrome.runtime.getURL('editor/editor.html');
      let qs = [];
      if (mode) qs.push('mode=' + mode);
      if (fromLib) qs.push('fromLib=1');
      if (extraParams) qs.push(extraParams);
      const url = qs.length ? `${editorUrl}?${qs.join('&')}` : editorUrl;

      // Find existing editor tab — from tracked IDs or by searching all tabs
      let existingId = editorTabIds.size > 0 ? [...editorTabIds][0] : null;

      if (!existingId) {
        try {
          const tabs = await chrome.tabs.query({});
          const editorTab = tabs.find(t => t.url?.includes('editor/editor.html'));
          if (editorTab) {
            existingId = editorTab.id;
            editorTabIds.add(existingId);
          }
        } catch {}
      }

      if (existingId) {
        try {
          await chrome.tabs.update(existingId, { url, active: true });
        } catch {
          chrome.tabs.create({ url });
        }
      } else {
        chrome.tabs.create({ url });
      }
      sendResponse({ success: true });
    })();
    return true; // async sendResponse
  }

  if (message.action === 'captureTab') {
    (async () => {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        sendResponse({ dataUrl });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  // Full screenshot — tell content script to trigger captureRegion with full viewport
  if (message.action === 'startFullScreenCapture') {
    (async () => {
      try {
        const tabId = message.tabId;
        try {
          await chrome.scripting.executeScript({ target: { tabId }, files: ['content/detector.js'] });
        } catch {}
        await new Promise(r => setTimeout(r, 200));
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'captureFullScreen' });
        } catch {
          await new Promise(r => setTimeout(r, 300));
          try { await chrome.tabs.sendMessage(tabId, { action: 'captureFullScreen' }); } catch {}
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  // Full page scroll-stitch capture
  if (message.action === 'startFullPageOnTab') {
    (async () => {
      try {
        const tabId = message.tabId;
        try {
          await chrome.scripting.executeScript({ target: { tabId }, files: ['content/detector.js'] });
        } catch {}
        await new Promise(r => setTimeout(r, 200));
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'startFullPageCapture' });
        } catch {
          await new Promise(r => setTimeout(r, 300));
          try { await chrome.tabs.sendMessage(tabId, { action: 'startFullPageCapture' }); } catch {}
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  // Full page capture completed — show overlay
  if (message.action === 'fullPageCaptured') {
    (async () => {
      try {
        const tabId = sender.tab?.id;
        const name = 'fullpage-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        await chrome.storage.local.set({ 'gazo-capture': { dataUrl: message.dataUrl, name } });
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'showCaptureOverlay' }).catch(() => {});
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  if (message.action === 'startRegionOnTab') {
    (async () => {
      try {
        const tabId = message.tabId;
        // Inject content script if not already present
        try {
          await chrome.scripting.executeScript({ target: { tabId }, files: ['content/detector.js'] });
        } catch {} // may already be injected
        await new Promise(r => setTimeout(r, 200));
        // Try sending message, retry once if fails
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'startRegionCapture' });
        } catch {
          await new Promise(r => setTimeout(r, 300));
          try { await chrome.tabs.sendMessage(tabId, { action: 'startRegionCapture' }); } catch {}
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  if (message.action === 'captureRegion') {
    (async () => {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        const region = message.region;
        const name = 'screenshot-region-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const tabId = sender.tab?.id;

        // Crop to selected region
        const croppedUrl = tabId ? await _cropRegion(dataUrl, region, tabId) : null;
        const finalUrl = croppedUrl || dataUrl;

        // Store and trigger overlay via detector.js
        if (tabId) {
          await chrome.storage.local.set({ 'gazo-capture': { dataUrl: finalUrl, name } });
          chrome.tabs.sendMessage(tabId, { action: 'showCaptureOverlay' }).catch(() => {});
        }

        // Also relay for sidepanel listeners
        chrome.runtime.sendMessage({ action: 'regionCaptured', dataUrl, region }).catch(() => {});
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  if (message.action === 'openSidePanel') {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.sidePanel.open({ tabId });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id) chrome.sidePanel.open({ tabId: tab.id });
      });
    }
    sendResponse({ success: true });
  }
});

// --- Side Panel Behavior ---
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  .catch(() => {});

// --- Auto-rescan: notify side panel on tab change / page load ---
let rescanTimer = null;
const editorTabIds = new Set();

function notifySidePanelRescan() {
  clearTimeout(rescanTimer);
  rescanTimer = setTimeout(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && editorTabIds.has(tab.id)) {
        chrome.runtime.sendMessage({ action: 'editorOpened' }).catch(() => {});
      } else {
        chrome.runtime.sendMessage({ action: 'tabChanged' }).catch(() => {});
      }
    } catch {
      chrome.runtime.sendMessage({ action: 'tabChanged' }).catch(() => {});
    }
  }, 300);
}

// Track editor tabs
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'editorOpened' && sender.tab?.id) {
    editorTabIds.add(sender.tab.id);
  }
  if (message.action === 'editorClosed' && sender.tab?.id) {
    editorTabIds.delete(sender.tab.id);
  }
});

// User switches tabs
chrome.tabs.onActivated.addListener(() => notifySidePanelRescan());

// Page finishes loading (navigation, refresh)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') notifySidePanelRescan();
});

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  if (editorTabIds.has(tabId)) {
    editorTabIds.delete(tabId);
    // If the closed tab was active, notify side panel
    notifySidePanelRescan();
  }
});

// --- Capture Helpers ---
// Crop a full-tab screenshot to a region using content script canvas
async function _cropRegion(dataUrl, region, tabId) {
  if (!tabId) return null;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (dataUrl, region) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            const c = document.createElement('canvas');
            c.width = Math.round(region.w * dpr);
            c.height = Math.round(region.h * dpr);
            c.getContext('2d').drawImage(img,
              region.x * dpr, region.y * dpr, region.w * dpr, region.h * dpr,
              0, 0, c.width, c.height
            );
            resolve(c.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
      },
      args: [dataUrl, region]
    });
    return results?.[0]?.result || null;
  } catch {
    return null;
  }
}
