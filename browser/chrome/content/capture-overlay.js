// Gazo — Post-capture overlay
// Shows captured screenshot with quick actions: Copy, Download, Edit, Dismiss
// Reads capture data from chrome.storage.local['gazo-capture']

(() => {
  'use strict';

  const OVERLAY_ID = 'gazo-capture-overlay';
  document.getElementById(OVERLAY_ID)?.remove();

  chrome.storage.local.get('gazo-capture', (result) => {
    const data = result['gazo-capture'];
    if (!data?.dataUrl) return;

    const { dataUrl, name } = data;

    // --- Build overlay ---
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,0.82);display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Inter,system-ui,-apple-system,sans-serif;';

    const preview = document.createElement('img');
    preview.src = dataUrl;
    preview.style.cssText = 'max-width:80vw;max-height:60vh;object-fit:contain;border-radius:10px;border:2px solid rgba(244,196,48,0.3);box-shadow:0 20px 60px rgba(0,0,0,0.6);';

    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;background:rgba(15,23,42,0.95);border:1px solid #334155;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);';

    const BS = 'display:flex;align-items:center;gap:6px;padding:8px 16px;border:1px solid #334155;border-radius:8px;background:rgba(30,41,59,0.8);color:#e2e8f0;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap;';

    function makeBtn(html, hoverColor) {
      const btn = document.createElement('button');
      btn.style.cssText = BS;
      btn.innerHTML = html;
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = hoverColor; btn.style.color = hoverColor; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#334155'; btn.style.color = '#e2e8f0'; });
      return btn;
    }

    const btnCopy = makeBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy', '#38bdf8');
    const btnDl = makeBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download', '#4ade80');
    const btnEdit = makeBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>Edit', '#F4C430');

    const sep = document.createElement('div');
    sep.style.cssText = 'width:1px;height:24px;background:#334155;';

    const btnX = makeBtn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', '#f87171');
    btnX.title = 'Dismiss (Esc)';

    bar.append(btnCopy, btnDl, btnEdit, sep, btnX);

    const hint = document.createElement('div');
    hint.textContent = 'Esc to dismiss';
    hint.style.cssText = 'color:#64748b;font-size:11px;margin-top:10px;';

    overlay.append(preview, bar, hint);
    document.body.appendChild(overlay);

    // --- Actions ---
    function dismiss() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }

    function feedback(btn, text, err) {
      const orig = btn.innerHTML;
      btn.innerHTML = `<span style="color:${err ? '#f87171' : '#4ade80'}">${text}</span>`;
      btn.style.pointerEvents = 'none';
      setTimeout(() => { btn.innerHTML = orig; btn.style.pointerEvents = ''; }, 1500);
    }

    btnCopy.addEventListener('click', async () => {
      try {
        const resp = await fetch(dataUrl);
        const blob = await resp.blob();
        if (blob.type === 'image/png') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } else {
          const img = new Image();
          img.src = dataUrl;
          await new Promise(r => { img.onload = r; });
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          const pb = await new Promise(r => c.toBlob(r, 'image/png'));
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pb })]);
        }
        feedback(btnCopy, 'Copied!');
        setTimeout(dismiss, 600);
      } catch {
        feedback(btnCopy, 'Failed', true);
      }
    });

    btnDl.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({
          action: 'download',
          url: dataUrl,
          filename: 'gazo/' + (name || 'screenshot') + '.png',
          saveAs: true
        });
        feedback(btnDl, 'Downloading...');
        setTimeout(dismiss, 800);
      } catch {
        feedback(btnDl, 'Failed', true);
      }
    });

    btnEdit.addEventListener('click', () => {
      // gazo-screenshot already in storage (set by popup before injection)
      // Just rename the key from gazo-capture to gazo-screenshot for editor
      chrome.storage.local.set(
        { 'gazo-screenshot': { dataUrl, name: name || 'screenshot' } },
        () => {
          chrome.runtime.sendMessage({ action: 'openEditor', params: 'fromScreenshot=1' });
          dismiss();
        }
      );
    });

    btnX.addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismiss(); }
    };
    document.addEventListener('keydown', onKey);
  });
})();
