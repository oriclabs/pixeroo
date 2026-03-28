// Pixeroo Popup - QR + 2 launchers

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  document.getElementById('qr-url').textContent = url;
  generateQR(url);

  // Page Images -> open side panel
  document.getElementById('btn-page-images').addEventListener('click', () => {
    if (tab?.id) chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    window.close();
  });

  // Toolkit -> reuse existing editor tab or open new
  document.getElementById('btn-toolkit').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openEditor' });
    window.close();
  });

  // Settings
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    window.close();
  });

  // Help
  document.getElementById('btn-help').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html') });
    window.close();
  });
  document.getElementById('link-help').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html') });
    window.close();
  });

  // Copy QR
  document.getElementById('btn-copy-qr').addEventListener('click', () => {
    document.getElementById('qr-output').toBlob((blob) => {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
        const btn = document.getElementById('btn-copy-qr');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    });
  });
});

function generateQR(text) {
  const canvas = document.getElementById('qr-output');
  const ctx = canvas.getContext('2d');

  if (!text || text.startsWith('chrome://') || text.startsWith('chrome-extension://') || text.startsWith('about:')) {
    canvas.width = 180; canvas.height = 180;
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 180, 180);
    ctx.fillStyle = '#64748b'; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('No URL available', 90, 86);
    ctx.fillStyle = '#475569'; ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('Navigate to a page first', 90, 104);
    return;
  }

  try {
    const qr = QR.encode(text);
    const px = Math.max(1, Math.floor(170 / (qr.size + 8)));
    QR.renderToCanvas(canvas, qr, px, 4, '#000000', '#ffffff');
  } catch {
    canvas.width = 180; canvas.height = 180;
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 180, 180);
    ctx.fillStyle = '#ef4444'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('URL too long for QR', 90, 86);
    ctx.fillStyle = '#475569'; ctx.font = '10px sans-serif';
    ctx.fillText('Use QR Studio in Toolkit', 90, 104);
  }
}
