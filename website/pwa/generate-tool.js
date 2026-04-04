// Gazo — Generate Tool
function initGenerate() {
  const genCanvas = $('gen-canvas');
  if (!genCanvas) return;
  const genCtx = genCanvas.getContext('2d');
  let genGuides = null;
  let ratioLocked = false, lastRatio = 800/600;

  // ── ExportPill ─────────────────────────────────────────
  const _genExportPill = new ExportPill($('gen-export-pill'), {
    formats: ['png', 'jpeg', 'webp', 'svg'],
    showLibrary: false,
    onExport(state) {
      if (!genCanvas.width) return;
      genCanvas.toBlob(blob => {
        Platform.download(URL.createObjectURL(blob), `gazo/generated.${state.ext}`, true);
      }, state.mime, 0.92);
    },
  });

  // ── Type selector: show/hide option panels ────────────
  // FontPill for placeholder
  if ($('gen-ph-font-pill')) window._genPhFontPill = new FontPill($('gen-ph-font-pill'), { defaultFamily: 'Inter, system-ui, sans-serif', defaultSize: 0, autoSize: true, maxSize: 200, defaultBold: true });
  const typeSelect = $('gen-type');
  function updateGenOpts() {
    document.querySelectorAll('.gen-opts').forEach(el => el.style.display = 'none');
    const opts = $('gen-opts-' + typeSelect.value);
    if (opts) opts.style.display = 'flex';
    // Reset sprite state when switching away
    if (typeSelect.value !== 'sprite') {
      spriteImages = []; spritePositions = [];
      if ($('gen-sprite-count')) $('gen-sprite-count').textContent = '0 images';
      if ($('btn-gen-sprite-copy-css')) $('btn-gen-sprite-copy-css').disabled = true;
    }
    // Auto-set square for avatar/favicon
    if (typeSelect.value === 'avatar' || typeSelect.value === 'favicon') {
      const s = typeSelect.value === 'favicon' ? 512 : 400;
      $('gen-w').value = s; $('gen-h').value = s;
    }
    // Social banner: auto-set size from preset
    if (typeSelect.value === 'social') {
      const idx = +($('gen-social-preset')?.value);
      const preset = typeof socialBannerPresets !== 'undefined' ? socialBannerPresets[idx] : null;
      if (preset) { $('gen-w').value = preset.w; $('gen-h').value = preset.h; }
    }
    // Show/hide angle guide
    const ag = $('gen-angle-guide');
    if (ag) ag.style.display = (typeSelect.value === 'gradient' || typeSelect.value === 'mesh') ? '' : 'none';
    // Hide global text overlay for types with built-in text
    const hasOwnText = ['placeholder','social','avatar','favicon','swatch','sprite'].includes(typeSelect.value);
    const textOverlay = $('gen-text-overlay');
    if (textOverlay) textOverlay.style.display = hasOwnText ? 'none' : 'flex';
    updateSizeGuide();
    drawAngleDial();
    autoGenerate();
  }
  typeSelect?.addEventListener('change', updateGenOpts);

  // ── Aspect ratio lock ────────────────────────────────
  $('gen-lock-ratio')?.addEventListener('click', () => {
    ratioLocked = !ratioLocked;
    $('gen-lock-ratio').style.color = ratioLocked ? 'var(--saffron-400)' : 'var(--slate-500)';
    if (ratioLocked) lastRatio = (+$('gen-w').value || 800) / (+$('gen-h').value || 600);
  });
  $('gen-w')?.addEventListener('input', () => {
    if (ratioLocked) $('gen-h').value = Math.round((+$('gen-w').value) / lastRatio);
    updateSizeGuide(); autoGenerate();
  });
  $('gen-h')?.addEventListener('input', () => {
    if (ratioLocked) $('gen-w').value = Math.round((+$('gen-h').value) * lastRatio);
    updateSizeGuide(); autoGenerate();
  });

  // ── Size presets ──────────────────────────────────────
  $('gen-size-preset')?.addEventListener('change', function() {
    if (!this.value) return;
    const [w, h] = this.value.split(',').map(Number);
    $('gen-w').value = w; $('gen-h').value = h;
    if (ratioLocked) lastRatio = w / h;
    this.value = '';
    updateSizeGuide(); autoGenerate();
  });

  // Social preset updates size
  $('gen-social-preset')?.addEventListener('change', () => {
    const idx = +($('gen-social-preset')?.value);
    const preset = typeof socialBannerPresets !== 'undefined' ? socialBannerPresets[idx] : null;
    if (preset) { $('gen-w').value = preset.w; $('gen-h').value = preset.h; updateSizeGuide(); autoGenerate(); }
  });

  // ── Live preview: auto-generate on input change ──────
  let autoTimer = null;
  function autoGenerate() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { $('btn-gen-go')?.click(); }, 250);
  }
  // Attach live preview to all gen inputs
  function _liveInputs() {
    const ids = [
      'gen-grad-type','gen-grad-c1','gen-grad-c2','gen-grad-angle',
      'gen-pat-type','gen-pat-c1','gen-pat-c2','gen-pat-cell',
      'gen-ph-bg','gen-ph-text-color','gen-ph-pattern','gen-ph-font','gen-ph-bold','gen-ph-border','gen-ph-rounded',
      'gen-mesh-c1','gen-mesh-c2','gen-mesh-c3','gen-mesh-c4',
      'gen-wave-type','gen-wave-c1','gen-wave-c2','gen-wave-complexity',
      'gen-texture-type','gen-texture-c1','gen-texture-c2','gen-texture-scale',
      'gen-grid-type','gen-grid-bg','gen-grid-line','gen-grid-cell',
      'gen-noise-type','gen-avatar-bg','gen-fav-bg','gen-fav-round',
    ];
    ids.forEach(id => { const el = $(id); if (el) el.addEventListener('input', autoGenerate); });
  }
  _liveInputs();

  // ── Randomize ────────────────────────────────────────
  function randHex() { return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'); }
  $('btn-gen-random')?.addEventListener('click', () => {
    const type = typeSelect.value;
    // Randomize colors for current type
    if (type === 'gradient') {
      $('gen-grad-c1').value = randHex(); $('gen-grad-c2').value = randHex();
      $('gen-grad-angle').value = Math.floor(Math.random()*360);
      drawAngleDial();
    } else if (type === 'pattern') {
      $('gen-pat-c1').value = randHex(); $('gen-pat-c2').value = randHex();
      $('gen-pat-cell').value = 10 + Math.floor(Math.random()*60);
    } else if (type === 'mesh') {
      $('gen-mesh-c1').value = randHex(); $('gen-mesh-c2').value = randHex();
      $('gen-mesh-c3').value = randHex(); $('gen-mesh-c4').value = randHex();
    } else if (type === 'wave') {
      $('gen-wave-c1').value = randHex(); $('gen-wave-c2').value = randHex();
    } else if (type === 'texture') {
      $('gen-texture-c1').value = randHex(); $('gen-texture-c2').value = randHex();
    } else if (type === 'placeholder') {
      $('gen-ph-bg').value = randHex(); $('gen-ph-text-color').value = randHex();
    } else if (type === 'avatar') {
      $('gen-avatar-bg').value = randHex();
    } else if (type === 'swatch') {
      $('gen-swatch-colors').value = Array.from({length:6}, randHex).join(',');
    }
    autoGenerate();
  });

  // ── Text overlay toggle ───────────────────────────────
  $('gen-text-on')?.addEventListener('change', function() {
    const fields = $('gen-text-fields');
    if (fields) fields.style.display = this.checked ? 'flex' : 'none';
    autoGenerate();
  });
  // Live preview on text inputs
  ['gen-text-value','gen-text-color','gen-text-pos','gen-text-size'].forEach(id => {
    $(id)?.addEventListener('input', autoGenerate);
  });

  function _applyTextOverlay(canvas) {
    if (!$('gen-text-on')?.checked) return;
    const text = $('gen-text-value')?.value;
    if (!text) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const color = $('gen-text-color')?.value || '#ffffff';
    const pos = $('gen-text-pos')?.value || 'center';
    const sizeOpt = $('gen-text-size')?.value || 'auto';

    let fontSize;
    if (sizeOpt === 'small') fontSize = Math.max(12, Math.min(w, h) * 0.04);
    else if (sizeOpt === 'medium') fontSize = Math.max(14, Math.min(w, h) * 0.07);
    else if (sizeOpt === 'large') fontSize = Math.max(16, Math.min(w, h) * 0.12);
    else fontSize = Math.max(12, Math.min(w * 0.8 / (text.length * 0.55), h * 0.2));

    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';

    let x, y;
    const pad = fontSize * 0.6;
    switch (pos) {
      case 'top':        ctx.textAlign = 'center'; x = w/2; y = pad + fontSize/2; break;
      case 'bottom':     ctx.textAlign = 'center'; x = w/2; y = h - pad - fontSize/2; break;
      case 'top-left':   ctx.textAlign = 'left';   x = pad; y = pad + fontSize/2; break;
      case 'bottom-right': ctx.textAlign = 'right'; x = w - pad; y = h - pad - fontSize/2; break;
      default:           ctx.textAlign = 'center'; x = w/2; y = h/2; break;
    }

    // Drop shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = fontSize * 0.15;
    ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
    ctx.fillText(text, x, y);
    ctx.shadowColor = 'transparent';
  }

  // ── Visual size guide ────────────────────────────────
  function updateSizeGuide() {
    const guide = $('gen-size-guide');
    const label = $('gen-size-guide-label');
    if (!guide) return;
    const w = +($('gen-w')?.value) || 0, h = +($('gen-h')?.value) || 0;
    if (!w || !h) { guide.style.display = 'none'; return; }
    const workArea = genCanvas.parentElement;
    const areaW = workArea.clientWidth - 40, areaH = workArea.clientHeight - 40;
    if (areaW <= 0 || areaH <= 0) { guide.style.display = 'none'; return; }
    const scale = Math.min(areaW / w, areaH / h, 1);
    guide.style.display = 'block';
    guide.style.width = Math.round(w * scale) + 'px';
    guide.style.height = Math.round(h * scale) + 'px';
    guide.style.left = '50%'; guide.style.top = '50%';
    guide.style.transform = 'translate(-50%, -50%)';
    label.textContent = w + ' × ' + h;
    const g = _gcd(w, h);
    if (g > 1 && w/g <= 32 && h/g <= 32) label.textContent += '  (' + (w/g) + ':' + (h/g) + ')';
  }
  function _gcd(a, b) { return b ? _gcd(b, a % b) : a; }

  // ── Draggable angle guide ────────────────────────────
  const angleCanvas = $('gen-angle-canvas');
  const angleLabel = $('gen-angle-label');
  function drawAngleDial() {
    if (!angleCanvas) return;
    const ctx = angleCanvas.getContext('2d');
    const s = 72, cx = s/2, cy = s/2, r = 28;
    const angle = +($('gen-grad-angle')?.value) || 0;
    ctx.clearRect(0, 0, s, s);
    // Ring
    ctx.strokeStyle = 'rgba(100,116,139,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
    // Handle
    const rad = (angle - 90) * Math.PI / 180;
    const hx = cx + r * Math.cos(rad), hy = cy + r * Math.sin(rad);
    ctx.strokeStyle = '#F4C430'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#F4C430';
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill();
    // Center dot
    ctx.fillStyle = 'rgba(100,116,139,0.6)';
    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();
    if (angleLabel) angleLabel.textContent = angle + '°';
  }
  function angleDragHandler(e) {
    const rect = angleCanvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left - 36;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top - 36;
    let deg = Math.round(Math.atan2(y, x) * 180 / Math.PI + 90);
    if (deg < 0) deg += 360;
    $('gen-grad-angle').value = deg;
    drawAngleDial();
    autoGenerate();
  }
  let angleDragging = false;
  angleCanvas?.addEventListener('mousedown', (e) => { angleDragging = true; angleDragHandler(e); });
  angleCanvas?.addEventListener('touchstart', (e) => { angleDragging = true; angleDragHandler(e); }, { passive: true });
  window.addEventListener('mousemove', (e) => { if (angleDragging) angleDragHandler(e); });
  window.addEventListener('touchmove', (e) => { if (angleDragging) angleDragHandler(e); }, { passive: true });
  window.addEventListener('mouseup', () => { angleDragging = false; });
  window.addEventListener('touchend', () => { angleDragging = false; });

  // ── Show result on canvas ────────────────────────────
  function showGen(c, name) {
    genCanvas.style.display = '';
    genCanvas.width = c.width; genCanvas.height = c.height;
    genCtx.drawImage(c, 0, 0);
    // Apply global text overlay (for types that don't have built-in text)
    const noOwnText = ['gradient','pattern','mesh','wave','texture','grid','noise'];
    if (noOwnText.includes(name)) _applyTextOverlay(genCanvas);
    $('gen-dims').textContent = c.width + ' × ' + c.height;
    const guide = $('gen-size-guide');
    if (guide) guide.style.display = 'none';
    if (!genGuides) {
      genGuides = new CanvasGuides(genCanvas.parentElement, genCanvas, { showRuler: true, showGrid: true });
    }
    setTimeout(() => { genGuides.show(); genGuides.update(); }, 50);
  }

  // ── Unified Generate button ──────────────────────────
  $('btn-gen-go')?.addEventListener('click', () => {
    const type = typeSelect?.value || 'gradient';
    const w = +($('gen-w')?.value) || 800, h = +($('gen-h')?.value) || 600;
    switch (type) {
      case 'gradient': {
        const gradType = $('gen-grad-type')?.value || 'linear';
        const c1 = $('gen-grad-c1')?.value || '#F4C430';
        const c2 = $('gen-grad-c2')?.value || '#B8860B';
        const angle = +($('gen-grad-angle')?.value) || 135;
        showGen(_genGradientEx(w, h, gradType, c1, c2, angle), 'gradient');
        break;
      }
      case 'pattern':
        showGen(generatePattern(w, h, $('gen-pat-type')?.value||'checkerboard', $('gen-pat-c1')?.value||'#e2e8f0', $('gen-pat-c2')?.value||'#fff', +($('gen-pat-cell')?.value)||40), 'pattern');
        break;
      case 'placeholder':
        showGen(_genPlaceholder(w, h), 'placeholder');
        break;
      case 'social': {
        const idx = +($('gen-social-preset')?.value);
        const preset = typeof socialBannerPresets !== 'undefined' ? socialBannerPresets[idx] : null;
        if (!preset) { showToast?.('Select a banner preset first', 'warn'); return; }
        showGen(generateSocialBanner(preset, $('gen-grad-c1')?.value||'#F4C430', $('gen-grad-c2')?.value||'#B8860B', $('gen-grad-type')?.value||'linear', $('gen-social-text')?.value||'', '#fff'), 'social');
        break;
      }
      case 'avatar':
        showGen(generateAvatar(w, $('gen-avatar-initials')?.value||'AB', $('gen-avatar-bg')?.value||'#6366f1', '#fff'), 'avatar');
        break;
      case 'noise':
        showGen(generateNoise(w, h, $('gen-noise-type')?.value||'white', 1), 'noise');
        break;
      case 'favicon':
        showGen(generateLetterFavicon($('gen-fav-letter')?.value||'G', 512, $('gen-fav-bg')?.value||'#F4C430', '#1e293b', $('gen-fav-round')?.checked), 'favicon');
        break;
      case 'swatch': {
        const colors = ($('gen-swatch-colors')?.value||'#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6').split(',').map(c=>c.trim()).filter(c=>c);
        if (colors.length) showGen(generateColorSwatch(colors), 'swatch');
        break;
      }
      case 'mesh':
        showGen(_genMeshGradient(w, h), 'mesh');
        break;
      case 'wave':
        showGen(_genWave(w, h), 'wave');
        break;
      case 'texture':
        showGen(_genTexture(w, h), 'texture');
        break;
      case 'grid':
        showGen(_genGrid(w, h), 'grid');
        break;
      case 'sprite':
        generateSpriteSheet();
        break;
    }
  });

  // ── Gradient with angle + conic ──────────────────────
  function _genGradientEx(w, h, type, c1, c2, angle) {
    if (type === 'conic') {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const grad = ctx.createConicGradient((angle||0)*Math.PI/180, w/2, h/2);
      grad.addColorStop(0, c1); grad.addColorStop(0.5, c2); grad.addColorStop(1, c1);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      return c;
    }
    return generateGradient(w, h, type, [{pos:0,color:c1},{pos:1,color:c2}]);
  }

  // ── Mesh Gradient (4-corner bilinear interpolation) ──
  function _genMeshGradient(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const colors = ['gen-mesh-c1','gen-mesh-c2','gen-mesh-c3','gen-mesh-c4'].map(id => {
      const hex = $(id)?.value || '#000000';
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    });
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let y = 0; y < h; y++) {
      const ty = y / (h - 1 || 1);
      for (let x = 0; x < w; x++) {
        const tx = x / (w - 1 || 1);
        const i = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const top = colors[0][ch] * (1-tx) + colors[1][ch] * tx;
          const bot = colors[2][ch] * (1-tx) + colors[3][ch] * tx;
          d[i+ch] = Math.round(top * (1-ty) + bot * ty);
        }
        d[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  // ── Wave / Blob generator ────────────────────────────
  function _genWave(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const type = $('gen-wave-type')?.value || 'wave';
    const c1 = $('gen-wave-c1')?.value || '#F4C430';
    const c2 = $('gen-wave-c2')?.value || '#020617';
    const complexity = +($('gen-wave-complexity')?.value) || 4;

    ctx.fillStyle = c2; ctx.fillRect(0, 0, w, h);

    if (type === 'blob') {
      ctx.fillStyle = c1;
      ctx.beginPath();
      const cx = w/2, cy = h/2, r = Math.min(w,h)*0.35;
      const pts = complexity * 2 + 3;
      for (let i = 0; i <= pts; i++) {
        const angle = (i/pts) * Math.PI * 2;
        const wobble = r * (0.7 + Math.sin(angle*complexity)*0.3 + Math.cos(angle*(complexity+1))*0.15);
        const px = cx + wobble * Math.cos(angle), py = cy + wobble * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else if (type === 'layered') {
      for (let layer = 0; layer < 3; layer++) {
        const opacity = 1 - layer * 0.25;
        ctx.fillStyle = c1; ctx.globalAlpha = opacity;
        ctx.beginPath(); ctx.moveTo(0, h);
        const baseY = h * (0.4 + layer * 0.15);
        for (let x = 0; x <= w; x += 4) {
          let y = baseY;
          for (let f = 1; f <= complexity; f++) y += Math.sin(x*f*0.005 + layer*2 + f) * (h*0.06/f);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      // Single wave divider
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) {
        let y = h * 0.5;
        for (let f = 1; f <= complexity; f++) y += Math.sin(x*f*0.006 + f*1.3) * (h*0.08/f);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    return c;
  }

  // ── Texture generator (procedural) ───────────────────
  function _genTexture(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const type = $('gen-texture-type')?.value || 'marble';
    const hex1 = $('gen-texture-c1')?.value || '#c8b08a';
    const hex2 = $('gen-texture-c2')?.value || '#8b7355';
    const scale = +($('gen-texture-scale')?.value) || 5;
    const c1 = [parseInt(hex1.slice(1,3),16),parseInt(hex1.slice(3,5),16),parseInt(hex1.slice(5,7),16)];
    const c2 = [parseInt(hex2.slice(1,3),16),parseInt(hex2.slice(3,5),16),parseInt(hex2.slice(5,7),16)];
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    const freq = scale * 0.01;

    // Simple noise function (value noise with interpolation)
    const _seed = new Array(256).fill(0).map(() => Math.random());
    const _noise = (x, y) => {
      const ix = Math.floor(x) & 255, iy = Math.floor(y) & 255;
      const fx = x - Math.floor(x), fy = y - Math.floor(y);
      const sx = fx*fx*(3-2*fx), sy = fy*fy*(3-2*fy);
      const a = _seed[(ix+_seed[iy&255]*256)&255], b = _seed[(ix+1+_seed[iy&255]*256)&255];
      const c = _seed[(ix+_seed[(iy+1)&255]*256)&255], dd = _seed[(ix+1+_seed[(iy+1)&255]*256)&255];
      return a*(1-sx)*(1-sy) + b*sx*(1-sy) + c*(1-sx)*sy + dd*sx*sy;
    };
    const fbm = (x, y, oct) => { let v=0, amp=1, f=1, max=0; for(let i=0;i<oct;i++){v+=_noise(x*f,y*f)*amp;max+=amp;amp*=0.5;f*=2;} return v/max; };

    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2++) {
        const i = (y2 * w + x2) * 4;
        let t = 0;
        if (type === 'marble') {
          t = Math.sin(x2*freq + fbm(x2*freq, y2*freq, 5)*8) * 0.5 + 0.5;
        } else if (type === 'wood') {
          const dist = Math.sqrt((x2-w/2)**2 + (y2-h/2)**2) * freq;
          t = Math.sin(dist + fbm(x2*freq*0.5, y2*freq*0.5, 4)*4) * 0.5 + 0.5;
        } else if (type === 'fabric') {
          const warp = Math.sin(x2*freq*3) * Math.sin(y2*freq*3);
          t = (warp + fbm(x2*freq, y2*freq, 3)) * 0.5 + 0.25;
        } else if (type === 'concrete') {
          t = fbm(x2*freq*2, y2*freq*2, 6);
        } else if (type === 'paper') {
          t = 0.85 + fbm(x2*freq*3, y2*freq*3, 4) * 0.15;
        } else if (type === 'canvas-tex') {
          const weave = (Math.sin(x2*freq*5) + Math.sin(y2*freq*5)) * 0.25;
          t = 0.5 + weave + fbm(x2*freq, y2*freq, 3) * 0.15;
        }
        t = Math.max(0, Math.min(1, t));
        d[i]   = Math.round(c1[0]*(1-t) + c2[0]*t);
        d[i+1] = Math.round(c1[1]*(1-t) + c2[1]*t);
        d[i+2] = Math.round(c1[2]*(1-t) + c2[2]*t);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  // ── Grid / Paper generator ───────────────────────────
  function _genGrid(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const type = $('gen-grid-type')?.value || 'graph';
    const bg = $('gen-grid-bg')?.value || '#ffffff';
    const lineColor = $('gen-grid-line')?.value || '#d1d5db';
    const cell = +($('gen-grid-cell')?.value) || 24;

    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = lineColor; ctx.lineWidth = 1;

    if (type === 'graph') {
      ctx.beginPath();
      for (let x = cell; x < w; x += cell) { ctx.moveTo(x+0.5, 0); ctx.lineTo(x+0.5, h); }
      for (let y = cell; y < h; y += cell) { ctx.moveTo(0, y+0.5); ctx.lineTo(w, y+0.5); }
      ctx.stroke();
      // Major grid every 5 cells
      ctx.strokeStyle = lineColor; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (let x = cell*5; x < w; x += cell*5) { ctx.moveTo(x+0.5, 0); ctx.lineTo(x+0.5, h); }
      for (let y = cell*5; y < h; y += cell*5) { ctx.moveTo(0, y+0.5); ctx.lineTo(w, y+0.5); }
      ctx.stroke(); ctx.globalAlpha = 1;
    } else if (type === 'dot') {
      ctx.fillStyle = lineColor;
      const r = Math.max(1, cell * 0.06);
      for (let x = cell; x < w; x += cell) for (let y = cell; y < h; y += cell) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      }
    } else if (type === 'isometric') {
      ctx.beginPath();
      const rowH = cell * Math.sin(Math.PI/3);
      for (let y = 0; y < h + rowH; y += rowH) {
        const row = Math.round(y / rowH);
        const offset = (row % 2) * (cell / 2);
        // Horizontal zigzag
        for (let x = -cell + offset; x < w + cell; x += cell) {
          ctx.moveTo(x, y); ctx.lineTo(x + cell/2, y + rowH);
          ctx.moveTo(x + cell, y); ctx.lineTo(x + cell/2, y + rowH);
        }
      }
      ctx.stroke();
    } else if (type === 'lined') {
      ctx.beginPath();
      for (let y = cell; y < h; y += cell) { ctx.moveTo(0, y+0.5); ctx.lineTo(w, y+0.5); }
      ctx.stroke();
      // Red margin line
      ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cell*3+0.5, 0); ctx.lineTo(cell*3+0.5, h); ctx.stroke();
    }
    return c;
  }

  // ── Placeholder generator ────────────────────────────
  function _genPlaceholder(w, h) {
    const bg = $('gen-ph-bg')?.value || '#94a3b8';
    const txColor = $('gen-ph-text-color')?.value || '#ffffff';
    const text = $('gen-ph-text')?.value || `${w}\u00D7${h}`;
    const pattern = $('gen-ph-pattern')?.value || 'none';
    const phState = window._genPhFontPill?.state || {};
    const font = phState.family || 'Inter, sans-serif';
    const bold = phState.bold ?? true;
    const hasBorder = $('gen-ph-border')?.checked;
    const rounded = $('gen-ph-rounded')?.checked;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const cornerR = rounded ? Math.min(w, h) * 0.04 : 0;
    if (cornerR > 0) { ctx.beginPath(); ctx.roundRect(0, 0, w, h, cornerR); ctx.clip(); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    if (pattern !== 'none') {
      ctx.save(); ctx.globalAlpha = 0.15; ctx.strokeStyle = txColor; ctx.lineWidth = 1;
      if (pattern === 'cross') { ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,h); ctx.moveTo(w,0); ctx.lineTo(0,h); ctx.stroke(); }
      else if (pattern === 'grid') { const s = Math.max(20, Math.min(w,h)/10); ctx.beginPath(); for(let x=s;x<w;x+=s){ctx.moveTo(x,0);ctx.lineTo(x,h);} for(let y=s;y<h;y+=s){ctx.moveTo(0,y);ctx.lineTo(w,y);} ctx.stroke(); }
      else if (pattern === 'diagonal') { const s = Math.max(15, Math.min(w,h)/15); ctx.beginPath(); for(let d=-h;d<w+h;d+=s){ctx.moveTo(d,0);ctx.lineTo(d+h,h);} ctx.stroke(); }
      else if (pattern === 'dots') { const s = Math.max(15, Math.min(w,h)/12); const r = Math.max(1.5, s*0.08); ctx.fillStyle = txColor; for(let x=s;x<w;x+=s) for(let y=s;y<h;y+=s){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); } }
      ctx.restore();
    }
    if (hasBorder) { ctx.strokeStyle = '#64748b'; ctx.lineWidth = Math.max(2, Math.min(w,h)*0.005); if(cornerR>0){ctx.beginPath();ctx.roundRect(1,1,w-2,h-2,Math.max(0,cornerR-1));ctx.stroke();}else{ctx.strokeRect(1,1,w-2,h-2);} }
    const fontSize = Math.max(10, Math.min(w * 0.8 / (text.length * 0.55), h * 0.25));
    ctx.fillStyle = txColor; ctx.font = `${bold?'bold ':''}${fontSize}px ${font}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w/2, h/2);
    return c;
  }

  // Placeholder batch
  $('btn-gen-ph-batch')?.addEventListener('click', async () => {
    const input = $('gen-ph-batch')?.value?.trim();
    if (!input) return;
    const sizes = input.split(',').map(s => s.trim()).filter(s => /^\d+[x\u00D7]\d+$/i.test(s));
    if (!sizes.length) return;
    if (typeof ZipWriter === 'undefined') return;
    const zip = new ZipWriter();
    const fmt = _genExportPill.state.format || 'png';
    const mime = _genExportPill.state.mime || 'image/png';
    for (const size of sizes) {
      const [sw, sh] = size.split(/[x\u00D7]/i).map(Number);
      if (!sw || !sh || sw > 4096 || sh > 4096) continue;
      const c = _genPlaceholder(sw, sh);
      const blob = await new Promise(r => c.toBlob(r, mime, 0.92));
      const buf = await blob.arrayBuffer();
      zip.addFile(`placeholder-${sw}x${sh}.${fmt==='jpeg'?'jpg':fmt}`, new Uint8Array(buf));
    }
    const zipBlob = zip.finish();
    Platform.download(URL.createObjectURL(zipBlob), 'gazo/placeholders.zip', true);
  });

  // ── Populate social banner presets ───────────────────
  const socialSel = $('gen-social-preset');
  if (socialSel && typeof socialBannerPresets !== 'undefined') {
    socialBannerPresets.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = `${p.name} (${p.w}×${p.h})`;
      socialSel.appendChild(opt);
    });
  }

  // ── Sprite Sheet ──────────────────────────────────────
  let spriteImages = [];
  let spritePositions = [];

  $('gen-sprite-files')?.addEventListener('change', async (e) => {
    const files = [...e.target.files].filter(f => f.type.startsWith('image/'));
    for (const f of files) {
      const img = await loadImg(f);
      if (img) spriteImages.push({ img, name: f.name.replace(/\.[^.]+$/, '') });
    }
    $('gen-sprite-count').textContent = spriteImages.length + ' images';
    e.target.value = '';
  });

  function generateSpriteSheet() {
    if (!spriteImages.length) { showToast?.('Add images first', 'warn'); return; }
    const padding = +($('gen-sprite-padding')?.value) || 2;
    const maxRowW = +($('gen-w')?.value) || 1024;
    let rows = [], currentRow = [], rowW = 0, rowH = 0;
    for (const s of spriteImages) {
      const iw = s.img.naturalWidth, ih = s.img.naturalHeight;
      if (rowW + iw + padding > maxRowW && currentRow.length > 0) {
        rows.push({ items: currentRow, w: rowW, h: rowH });
        currentRow = []; rowW = 0; rowH = 0;
      }
      currentRow.push({ ...s, x: rowW, w: iw, h: ih });
      rowW += iw + padding; rowH = Math.max(rowH, ih);
    }
    if (currentRow.length) rows.push({ items: currentRow, w: rowW, h: rowH });
    const totalW = Math.max(...rows.map(r => r.w));
    let totalH = 0;
    for (const r of rows) { r.y = totalH; totalH += r.h + padding; }
    const c = document.createElement('canvas'); c.width = totalW; c.height = totalH;
    const ctx = c.getContext('2d');
    spritePositions = [];
    for (const row of rows) for (const item of row.items) {
      ctx.drawImage(item.img, item.x, row.y);
      spritePositions.push({ name: item.name, x: item.x, y: row.y, w: item.w, h: item.h });
    }
    $('gen-w').value = totalW; $('gen-h').value = totalH;
    $('btn-gen-sprite-copy-css').disabled = false;
    showGen(c, 'sprite');
  }

  $('btn-gen-sprite-copy-css')?.addEventListener('click', () => {
    if (!spritePositions.length) return;
    const lines = spritePositions.map(s =>
      `.sprite-${s.name.replace(/[^a-zA-Z0-9_-]/g, '-')} {\n  width: ${s.w}px;\n  height: ${s.h}px;\n  background-position: -${s.x}px -${s.y}px;\n}`
    );
    const css = `/* Sprite Sheet — ${spritePositions.length} sprites */\n.sprite {\n  background-image: url('sprite.png');\n  background-repeat: no-repeat;\n  display: inline-block;\n}\n\n` + lines.join('\n\n');
    navigator.clipboard.writeText(css); showToast?.('Sprite CSS copied');
  });

  // ── Copy CSS ──────────────────────────────────────────
  $('btn-gen-copy-css')?.addEventListener('click', () => {
    const type = typeSelect?.value || 'gradient';
    let css = '';
    if (type === 'gradient') {
      const gradType = $('gen-grad-type')?.value || 'linear';
      const c1 = $('gen-grad-c1')?.value || '#F4C430', c2 = $('gen-grad-c2')?.value || '#B8860B';
      const angle = +($('gen-grad-angle')?.value) || 135;
      if (gradType === 'linear') css = `background: linear-gradient(${angle}deg, ${c1}, ${c2});`;
      else if (gradType === 'radial') css = `background: radial-gradient(circle, ${c1}, ${c2});`;
      else if (gradType === 'conic') css = `background: conic-gradient(from ${angle}deg, ${c1}, ${c2}, ${c1});`;
    } else if (type === 'mesh') {
      const colors = ['gen-mesh-c1','gen-mesh-c2','gen-mesh-c3','gen-mesh-c4'].map(id => $(id)?.value);
      css = `/* Mesh gradient — no pure CSS equivalent, use as background-image */\nbackground: linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3]});`;
    } else if (type === 'pattern') {
      const patType = $('gen-pat-type')?.value;
      const c1 = $('gen-pat-c1')?.value||'#e2e8f0', c2 = $('gen-pat-c2')?.value||'#fff';
      const cell = +($('gen-pat-cell')?.value)||40;
      if (patType === 'checkerboard') css = `background: repeating-conic-gradient(${c1} 0% 25%, ${c2} 0% 50%) 0 0 / ${cell*2}px ${cell*2}px;`;
      else if (patType === 'stripes-h') css = `background: repeating-linear-gradient(0deg, ${c1} 0px, ${c1} ${cell}px, ${c2} ${cell}px, ${c2} ${cell*2}px);`;
      else if (patType === 'stripes-v') css = `background: repeating-linear-gradient(90deg, ${c1} 0px, ${c1} ${cell}px, ${c2} ${cell}px, ${c2} ${cell*2}px);`;
      else css = `/* No pure CSS equivalent for this pattern */`;
    } else if (type === 'placeholder') {
      const w = +($('gen-w')?.value)||800, hh = +($('gen-h')?.value)||600;
      css = `width: ${w}px;\nheight: ${hh}px;\nbackground: ${$('gen-ph-bg')?.value||'#94a3b8'};\ndisplay: flex;\nalign-items: center;\njustify-content: center;`;
    } else if (type === 'swatch') {
      const colors = ($('gen-swatch-colors')?.value||'').split(',').map(c => c.trim()).filter(c => c);
      css = ':root {\n' + colors.map((c, i) => `  --swatch-${i+1}: ${c};`).join('\n') + '\n}';
    } else {
      css = `width: ${+($('gen-w')?.value)||800}px;\nheight: ${+($('gen-h')?.value)||600}px;`;
    }
    if (css) { navigator.clipboard.writeText(css); showToast?.('CSS copied to clipboard'); }
  });

  // ── Copy as HTML data URI ────────────────────────────
  $('btn-gen-copy-datauri')?.addEventListener('click', () => {
    if (!genCanvas.width) { showToast?.('Generate an image first', 'warn'); return; }
    const dataUrl = genCanvas.toDataURL('image/png');
    const html = `<img src="${dataUrl}" width="${genCanvas.width}" height="${genCanvas.height}" alt="placeholder">`;
    navigator.clipboard.writeText(html); showToast?.('HTML <img> copied to clipboard');
  });


  // ── Initial state ────────────────────────────────────
  updateGenOpts();
  drawAngleDial();
  window._updateGenSizeGuide = updateSizeGuide;
}
