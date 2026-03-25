// Pixeroo - Firefox Background Script
// Firefox uses sidebar_action instead of sidePanel, and event pages instead of service workers

// --- Context Menu Setup ---
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'pixeroo',
    title: 'Pixeroo',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'pixeroo-info',
    parentId: 'pixeroo',
    title: 'View Image Info',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'pixeroo-saveas',
    parentId: 'pixeroo',
    title: 'Save As...',
    contexts: ['image']
  });

  const formats = ['PNG', 'JPEG', 'WebP', 'AVIF', 'BMP', 'ICO'];
  formats.forEach(fmt => {
    browser.contextMenus.create({
      id: `pixeroo-save-${fmt.toLowerCase()}`,
      parentId: 'pixeroo-saveas',
      title: fmt,
      contexts: ['image']
    });
  });

  browser.contextMenus.create({
    id: 'pixeroo-copy-png',
    parentId: 'pixeroo',
    title: 'Copy as PNG',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'pixeroo-read-qr',
    parentId: 'pixeroo',
    title: 'Read QR Code',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'pixeroo-edit',
    parentId: 'pixeroo',
    title: 'Open in Editor',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'pixeroo-separator',
    parentId: 'pixeroo',
    type: 'separator',
    contexts: ['image']
  });

  browser.contextMenus.create({
    id: 'pixeroo-extract-colors',
    parentId: 'pixeroo',
    title: 'Extract Colors',
    contexts: ['image']
  });
});

// --- Context Menu Click Handler ---
browser.contextMenus.onClicked.addListener((info, tab) => {
  const { menuItemId, srcUrl } = info;

  if (menuItemId === 'pixeroo-info') {
    browser.tabs.sendMessage(tab.id, { action: 'showImageInfo', src: srcUrl });
  } else if (menuItemId.startsWith('pixeroo-save-')) {
    const format = menuItemId.replace('pixeroo-save-', '');
    browser.tabs.sendMessage(tab.id, { action: 'convertAndSave', src: srcUrl, format });
  } else if (menuItemId === 'pixeroo-copy-png') {
    browser.tabs.sendMessage(tab.id, { action: 'copyAsPng', src: srcUrl });
  } else if (menuItemId === 'pixeroo-read-qr') {
    browser.tabs.sendMessage(tab.id, { action: 'readQR', src: srcUrl });
  } else if (menuItemId === 'pixeroo-edit') {
    const editorUrl = browser.runtime.getURL(`editor/editor.html?src=${encodeURIComponent(srcUrl)}`);
    browser.tabs.create({ url: editorUrl });
  } else if (menuItemId === 'pixeroo-extract-colors') {
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
      filename: message.filename || 'pixeroo-image',
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
