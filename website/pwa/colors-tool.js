// Gazo — Colors Tool
function initColors() {
  let cImg = null;
  const cc = $('colors-canvas'), cx = cc.getContext('2d', { willReadFrequently: true });

  setupDropzone($('colors-drop'), $('colors-file'), async (file) => {
    cImg = await loadImg(file); if (!cImg) return;
    $('colors-drop').style.display = 'none';
    $('colors-preview').style.display = 'block';
    cc.width = cImg.naturalWidth; cc.height = cImg.naturalHeight; cx.drawImage(cImg, 0, 0);
    extractPal();
  });

  cc.addEventListener('click', (e) => {
    const r = cc.getBoundingClientRect(), x = Math.floor((e.clientX-r.left)*cc.width/r.width), y = Math.floor((e.clientY-r.top)*cc.height/r.height);
    const [rv,gv,bv] = cx.getImageData(x,y,1,1).data, hex = rgbHex(rv,gv,bv);
    const hsl = rgbHsl(rv,gv,bv);
    $('picked-color').innerHTML = `<span style="display:inline-block;width:18px;height:18px;background:${hex};border-radius:4px;border:1px solid var(--slate-600);vertical-align:middle;margin-right:4px;"></span><span style="color:var(--slate-200);font-weight:600;cursor:pointer;" title="rgb(${rv},${gv},${bv}) | ${hsl} — click to copy" data-copy="${hex}">${hex}</span>`;
    $('picked-color').querySelector('[data-copy]')?.addEventListener('click', () => { navigator.clipboard.writeText(hex); showToast('Copied ' + hex, 'success'); });
  });

  $('palette-count').addEventListener('input', e => { $('palette-count-val').textContent = e.target.value; });
  $('btn-reextract').addEventListener('click', extractPal);

  let lastPalette = [];

  function extractPal() {
    if (!cImg) return;
    const k = +$('palette-count').value, data = cx.getImageData(0,0,cc.width,cc.height), px = [];
    for (let i = 0; i < data.data.length; i += 16) { if (data.data[i+3] < 128) continue; px.push([data.data[i],data.data[i+1],data.data[i+2]]); }
    lastPalette = kMeans(px, k);
    $('palette-colors').innerHTML = lastPalette.map(c => `<div class="color-row"><div class="color-preview" style="background:${c.hex};"></div><div style="flex:1;"><div class="color-hex" data-copy="${c.hex}">${c.hex}</div><div class="color-secondary">rgb(${c.r},${c.g},${c.b}) | ${c.pct}%</div></div></div>`).join('');
    const copyBtn = $('btn-copy-palette');
    if (copyBtn) copyBtn.disabled = !lastPalette.length;
  }

  $('btn-copy-palette')?.addEventListener('click', () => {
    if (!lastPalette.length) return;
    const fmt = $('palette-export-fmt')?.value || 'hex';
    let text = '';
    switch (fmt) {
      case 'hex':
        text = lastPalette.map(c => c.hex).join('\n');
        break;
      case 'css':
        text = ':root {\n' + lastPalette.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n') + '\n}';
        break;
      case 'tailwind':
        text = 'colors: {\n' + lastPalette.map((c, i) => `  'color-${i + 1}': '${c.hex}',`).join('\n') + '\n}';
        break;
      case 'scss':
        text = lastPalette.map((c, i) => `$color-${i + 1}: ${c.hex};`).join('\n');
        break;
      case 'json':
        text = JSON.stringify(lastPalette.map(c => ({ hex: c.hex, rgb: `rgb(${c.r},${c.g},${c.b})`, pct: c.pct })), null, 2);
        break;
    }
    navigator.clipboard.writeText(text);
    showToast(`Palette copied as ${fmt.toUpperCase()}`, 'success');
  });
  // ── WCAG Contrast Checker ─────────────────────────────
  function _luminance(hex) {
    const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    const toL = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4;
    return 0.2126*toL(r) + 0.7152*toL(g) + 0.0722*toL(b);
  }
  function _contrastRatio(fg, bg) {
    const l1 = _luminance(fg), l2 = _luminance(bg);
    const lighter = Math.max(l1,l2), darker = Math.min(l1,l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  function updateContrast() {
    const fg = $('contrast-fg')?.value || '#ffffff';
    const bg = $('contrast-bg')?.value || '#000000';
    $('contrast-fg-hex').value = fg;
    $('contrast-bg-hex').value = bg;
    const ratio = _contrastRatio(fg, bg);
    const ratioStr = ratio.toFixed(2) + ':1';
    $('contrast-ratio').textContent = ratioStr;
    const pass = (min) => ratio >= min;
    const badge = (el, ok) => { el.style.background = ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'; el.style.color = ok ? '#22c55e' : '#ef4444'; el.textContent = el.textContent.replace(/ .+/, '') + (ok ? ' Pass' : ' Fail'); };
    badge($('contrast-aa'), pass(4.5));
    badge($('contrast-aaa'), pass(7));
    badge($('contrast-aa-large'), pass(3));
    $('contrast-aa').textContent = 'AA ' + (pass(4.5) ? 'Pass' : 'Fail');
    $('contrast-aaa').textContent = 'AAA ' + (pass(7) ? 'Pass' : 'Fail');
    $('contrast-aa-large').textContent = 'AA Large ' + (pass(3) ? 'Pass' : 'Fail');
    $('contrast-preview').style.background = bg;
    $('contrast-preview').style.color = fg;
  }
  $('contrast-fg')?.addEventListener('input', updateContrast);
  $('contrast-bg')?.addEventListener('input', updateContrast);
  $('contrast-fg-hex')?.addEventListener('change', function() { if (/^#[0-9a-f]{6}$/i.test(this.value)) { $('contrast-fg').value = this.value; updateContrast(); } });
  $('contrast-bg-hex')?.addEventListener('change', function() { if (/^#[0-9a-f]{6}$/i.test(this.value)) { $('contrast-bg').value = this.value; updateContrast(); } });
  $('btn-contrast-swap')?.addEventListener('click', () => {
    const fg = $('contrast-fg').value, bg = $('contrast-bg').value;
    $('contrast-fg').value = bg; $('contrast-bg').value = fg; updateContrast();
  });
  // Click palette color → set as FG or BG (click = FG, shift+click = BG)
  $('palette-colors')?.addEventListener('click', (e) => {
    const hex = e.target.closest('[data-copy]')?.dataset.copy;
    if (!hex || !hex.startsWith('#')) return;
    if (e.shiftKey) { $('contrast-bg').value = hex; } else { $('contrast-fg').value = hex; }
    updateContrast();
  });
  updateContrast();
}

function kMeans(px, k) {
  if (!px.length) return [];
  let cen = px.slice(0, Math.min(k, px.length)).map(p=>[...p]);
  const asg = new Array(px.length).fill(0);
  for (let it=0;it<15;it++) {
    for (let i=0;i<px.length;i++) { let mn=Infinity; for (let j=0;j<cen.length;j++) { const d=(px[i][0]-cen[j][0])**2+(px[i][1]-cen[j][1])**2+(px[i][2]-cen[j][2])**2; if (d<mn){mn=d;asg[i]=j;} } }
    const s=cen.map(()=>[0,0,0]),ct=new Array(cen.length).fill(0);
    for (let i=0;i<px.length;i++){const c=asg[i];s[c][0]+=px[i][0];s[c][1]+=px[i][1];s[c][2]+=px[i][2];ct[c]++;}
    for (let j=0;j<cen.length;j++) if(ct[j]) cen[j]=[Math.round(s[j][0]/ct[j]),Math.round(s[j][1]/ct[j]),Math.round(s[j][2]/ct[j])];
  }
  const ct=new Array(cen.length).fill(0); for(const c of asg)ct[c]++;
  return cen.map((c,i)=>({r:c[0],g:c[1],b:c[2],hex:rgbHex(c[0],c[1],c[2]),pct:Math.round(ct[i]/px.length*100)})).sort((a,b)=>b.pct-a.pct);
}
