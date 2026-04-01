// Gazo - Firefox Background Script
// Firefox uses sidebar_action instead of sidePanel, and event pages instead of service workers

// --- Context Menu Setup ---
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'gazo',
    title: 'Gazo',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'gazo-info',
    parentId: 'gazo',
    title: 'View Image Info',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'gazo-saveas',
    parentId: 'gazo',
    title: 'Save As...',
    contexts: ['image']
  });

  const formats = ['PNG', 'JPEG', 'WebP', 'AVIF', 'BMP', 'ICO'];
  formats.forEach(fmt => {
    browser.contextMenus.create({
      id: `gazo-save-${fmt.toLowerCase()}`,
      parentId: 'gazo-saveas',
      title: fmt,
      contexts: ['image']
    });
  });

  browser.contextMenus.create({
    id: 'gazo-copy-png',
    parentId: 'gazo',
    title: 'Copy as PNG',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'gazo-read-qr',
    parentId: 'gazo',
    title: 'Read QR Code',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'gazo-edit',
    parentId: 'gazo',
    title: 'Open in Editor',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'gazo-separator',
    parentId: 'gazo',
    type: 'separator',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'gazo-extract-colors',
    parentId: 'gazo',
    title: 'Extract Colors',
    contexts: ['image']
  });
});

// --- Context Menu Click Handler ---
browser.contextMenus.onClicked.addListener((info, tab) => {
  const { menuItemId, srcUrl } = info;

  if (menuItemId === 'gazo-info') {
    browser.tabs.sendMessage(tab.id, { action: 'showImageInfo', src: srcUrl });
  } else if (menuItemId.startsWith('gazo-save-')) {
    const format = menuItemId.replace('gazo-save-', '');
    browser.tabs.sendMessage(tab.id, { action: 'convertAndSave', src: srcUrl, format });
  } else if (menuItemId === 'gazo-copy-png') {
    browser.tabs.sendMessage(tab.id, { action: 'copyAsPng', src: srcUrl });
  } else if (menuItemId === 'gazo-read-qr') {
    browser.tabs.sendMessage(tab.id, { action: 'readQR', src: srcUrl });
  } else if (menuItemId === 'gazo-edit') {
    const editorUrl = browser.runtime.getURL(`editor/editor.html?src=${encodeURIComponent(srcUrl)}`);
    browser.tabs.create({ url: editorUrl });
  } else if (menuItemId === 'gazo-extract-colors') {
    browser.tabs.sendMessage(tab.id, { action: 'extractColors', src: srcUrl });
  }
});

// --- Keyboard Commands ---
browser.commands.onCommand.addListener((command) => {
  if (command === 'quick-qr') {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      browser.tabs.sendMessage(tab.id, { action: 'quickQR', url: tab.url });
    });
  }
  // sidebar_action is handled natively by Firefox via _execute_sidebar_action
});

// --- Message Router ---
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'download') {
    return browser.downloads.download({
      url: message.url,
      filename: message.filename || 'gazo-image',
      saveAs: message.saveAs !== false
    }).then(downloadId => ({ success: true, downloadId }));
  }

  if (message.action === 'openEditor') {
    const editorUrl = browser.runtime.getURL(`editor/editor.html?src=${encodeURIComponent(message.src)}`);
    browser.tabs.create({ url: editorUrl });
    return Promise.resolve({ success: true });
  }

  if (message.action === 'openSidePanel') {
    browser.sidebarAction.open();
    return Promise.resolve({ success: true });
  }
});
