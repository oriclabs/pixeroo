// Gazo — Social Media Tool
const SOCIAL_PLATFORM_PRESETS = {
  'tw-header':    { w: 1500, h: 500,  name: 'twitter-header', label: 'Twitter Header' },
  'tw-post':      { w: 1200, h: 675,  name: 'twitter-post', label: 'Twitter Post' },
  'tw-profile':   { w: 400,  h: 400,  name: 'twitter-profile', label: 'Twitter Profile' },
  'ig-post':      { w: 1080, h: 1080, name: 'instagram-post', label: 'Instagram Post' },
  'ig-story':     { w: 1080, h: 1920, name: 'instagram-story', label: 'Instagram Story' },
  'ig-landscape': { w: 1080, h: 566,  name: 'instagram-landscape', label: 'Instagram Landscape' },
  'ig-profile':   { w: 320,  h: 320,  name: 'instagram-profile', label: 'Instagram Profile' },
  'fb-cover':     { w: 820,  h: 312,  name: 'facebook-cover', label: 'Facebook Cover' },
  'fb-post':      { w: 1200, h: 630,  name: 'facebook-post', label: 'Facebook Post' },
  'fb-profile':   { w: 180,  h: 180,  name: 'facebook-profile', label: 'Facebook Profile' },
  'fb-event':     { w: 1920, h: 1005, name: 'facebook-event', label: 'Facebook Event' },
  'li-banner':    { w: 1584, h: 396,  name: 'linkedin-banner', label: 'LinkedIn Banner' },
  'li-post':      { w: 1200, h: 627,  name: 'linkedin-post', label: 'LinkedIn Post' },
  'li-profile':   { w: 400,  h: 400,  name: 'linkedin-profile', label: 'LinkedIn Profile' },
  'yt-thumb':     { w: 1280, h: 720,  name: 'youtube-thumbnail', label: 'YouTube Thumbnail' },
  'yt-banner':    { w: 2560, h: 1440, name: 'youtube-banner', label: 'YouTube Banner' },
  'pin-standard': { w: 1000, h: 1500, name: 'pinterest-standard', label: 'Pinterest Standard' },
  'pin-square':   { w: 1000, h: 1000, name: 'pinterest-square', label: 'Pinterest Square' },
  'tt-post':      { w: 1080, h: 1920, name: 'tiktok-post', label: 'TikTok Post' },
  'dc-avatar':    { w: 128,  h: 128,  name: 'discord-avatar', label: 'Discord Avatar' },
  'dc-banner':    { w: 960,  h: 540,  name: 'discord-banner', label: 'Discord Banner' },
};

// Safe zones: percentage inset from each edge where UI elements may clip content
// { top, bottom, left, right } as fractions (0.14 = 14%)
const SOCIAL_SAFE_ZONES = {
  'ig-story':   { top: 0.14, bottom: 0.14, left: 0.04, right: 0.04 },
  'ig-post':    { top: 0, bottom: 0.08, left: 0, right: 0 },
  'tt-post':    { top: 0.12, bottom: 0.18, left: 0.04, right: 0.04 },
  'yt-thumb':   { top: 0, bottom: 0.15, left: 0, right: 0.18 },
  'yt-banner':  { top: 0.25, bottom: 0.25, left: 0.15, right: 0.15 },
  'fb-cover':   { top: 0, bottom: 0.2, left: 0.15, right: 0 },
  'tw-header':  { top: 0, bottom: 0, left: 0.15, right: 0.05 },
};

function initSocial() {
  const canvas = $('social-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const guidesCanvas = $('social-guides');
  if ($('social-font-pill')) window._socialFontPill = new FontPill($('social-font-pill'), { defaultFamily: 'Inter, system-ui, sans-serif', defaultSize: 0, autoSize: true, maxSize: 300 });
  const guidesCtx = guidesCanvas?.getContext('2d');
  let socialImg = null;
  let generated = false;
  // Frame positioning: the guideline frame sits over the image, user drags it
  let frameX = 0, frameY = 0; // frame position in canvas pixels (top-left of frame)
  // Image offset: when image is smaller than target, user drags image inside frame
  let imgOffX = 0, imgOffY = 0;
  let _smallMode = false; // true when image is smaller than target

  const platformSel = $('social-platform');
  const fitSel = $('social-fit');
  const bgColor = $('social-bg-color');
  const textInput = $('social-text');
  const textColor = $('social-text-color');
  const textPos = $('social-text-pos');
  const dimsEl = $('social-dims');
  const dropzone = $('social-dropzone');
  const dropzoneDefault = $('social-dropzone-default');
  const dropOutline = $('social-drop-outline');
  const canvasWrap = $('social-canvas-wrap');
  const labelEl = $('social-canvas-label');

  function _updateButtons() {
    $('btn-social-generate').disabled = !socialImg;
    $('btn-social-download').disabled = !generated;
    $('btn-social-copy').disabled = !generated;
    const saveBtn = $('btn-social-save-lib');
    if (saveBtn) saveBtn.disabled = !generated;
  }

  // ── Load image ──
  function _onImageLoaded(img) {
    socialImg = img;
    generated = false;
    panX = 0; panY = 0;
    // Hide both dropzones
    dropzone.style.display = 'none';
    dropzoneDefault.style.display = 'none';
    dropOutline.style.display = 'none';
    if (dropGuides) dropGuides.style.display = 'none';
    canvasWrap.style.display = '';
    canvas.style.display = 'block';

    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    const sw = img.naturalWidth, sh = img.naturalHeight;
    _smallMode = preset && (sw < preset.w && sh < preset.h);

    if (_smallMode) {
      canvas.width = preset.w;
      canvas.height = preset.h;
      imgOffX = Math.round((preset.w - sw) / 2);
      imgOffY = Math.round((preset.h - sh) / 2);
      _redrawSmallMode();
    } else {
      imgOffX = 0; imgOffY = 0;
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, 0, 0);
    }

    dimsEl.textContent = preset
      ? `${preset.w}\u00d7${preset.h} \u00b7 Source: ${sw}\u00d7${sh}`
      : `Source: ${sw}\u00d7${sh}`;

    if (preset) {
      _initFrame(preset);
      _checkResolution(preset);
      _drawFrameOverlay();
    }
    _updateButtons();
  }

  function _handleFileDrop(file) {
    loadImg(file).then(img => { if (img) _onImageLoaded(img); });
  }
  setupDropzone(dropzone, $('social-file'), _handleFileDrop);
  setupDropzone(dropzoneDefault, $('social-file-default'), _handleFileDrop);

  $('btn-social-from-lib')?.addEventListener('click', () => {
    openLibraryPicker(async (items) => {
      const item = items[0]; if (!item) return;
      const img = new Image();
      img.src = item.dataUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      _onImageLoaded(img);
    }, { singleSelect: true });
  });

  // ── Platform selection — shape dropzone + show resolution warning ──
  const dropWrap = $('social-drop-wrap');
  const dropShape = $('social-drop-shape');
  const dropLabel = $('social-drop-label');
  const dropGuides = $('social-drop-guides');
  const resWarn = $('social-res-warn');

  platformSel.addEventListener('change', () => {
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (preset) {
      dimsEl.textContent = `${preset.w} \u00d7 ${preset.h}`;

      // Scale outline shape within fixed-height container
      if (!socialImg && !generated) {
        dropzoneDefault.style.display = 'none';
        dropOutline.style.display = '';

        // Fit within 500px wide x 280px tall container
        const maxW = 480, maxH = 260;
        const scale = Math.min(maxW / preset.w, maxH / preset.h);
        const shapeW = Math.round(preset.w * scale);
        const shapeH = Math.round(preset.h * scale);
        dropShape.style.width = shapeW + 'px';
        dropShape.style.height = shapeH + 'px';
        dropLabel.textContent = `${preset.w} \u00d7 ${preset.h} \u2014 ${preset.label}`;

        // Safe zone guide
        const zone = SOCIAL_SAFE_ZONES[platformSel.value];
        if (zone) {
          dropGuides.style.display = '';
          dropGuides.style.top = `${zone.top * 100}%`;
          dropGuides.style.bottom = `${zone.bottom * 100}%`;
          dropGuides.style.left = `${zone.left * 100}%`;
          dropGuides.style.right = `${zone.right * 100}%`;
          dropGuides.style.border = '1px dashed rgba(34,197,94,0.4)';
          dropGuides.innerHTML = `<span style="position:absolute;top:2px;left:6px;color:rgba(34,197,94,0.5);font-size:0.55rem;">safe zone</span>`;
        } else {
          dropGuides.style.display = 'none';
          dropGuides.innerHTML = '';
        }
      }

      if (socialImg) {
        const sw = socialImg.naturalWidth, sh = socialImg.naturalHeight;
        _smallMode = sw < preset.w && sh < preset.h;
        if (_smallMode) {
          canvas.width = preset.w;
          canvas.height = preset.h;
          imgOffX = Math.round((preset.w - sw) / 2);
          imgOffY = Math.round((preset.h - sh) / 2);
          _redrawSmallMode();
        } else {
          imgOffX = 0; imgOffY = 0;
          canvas.width = sw;
          canvas.height = sh;
          ctx.drawImage(socialImg, 0, 0);
        }
        dimsEl.textContent = `${preset.w}\u00d7${preset.h} \u00b7 Source: ${sw}\u00d7${sh}`;
        _initFrame(preset);
        _checkResolution(preset);
        requestAnimationFrame(_drawFrameOverlay);
      }
    } else {
      dimsEl.textContent = 'Select a platform';
      if (!socialImg && !generated) {
        dropOutline.style.display = 'none';
        dropzoneDefault.style.display = '';
      }
      if (dropGuides) { dropGuides.style.display = 'none'; dropGuides.innerHTML = ''; }
      if (resWarn) resWarn.style.display = 'none';
    }
  });

  function _checkResolution(preset) {
    if (!resWarn) return;
    if (!socialImg || !preset) { resWarn.style.display = 'none'; return; }
    const sw = socialImg.naturalWidth, sh = socialImg.naturalHeight;
    const tw = preset.w, th = preset.h;
    const bothSmaller = sw < tw && sh < th;
    const oneSmaller = sw < tw || sh < th;
    if (bothSmaller || oneSmaller) {
      const fit = fitSel.value;
      if (bothSmaller) {
        // Both dimensions smaller
        resWarn.style.display = '';
        if (fit === 'original') {
          resWarn.style.color = '#22c55e';
          resWarn.textContent = `\u2713 Image placed at original ${sw}\u00d7${sh} \u2014 remaining space filled with ${$('social-bg-transparent')?.checked ? 'transparency' : 'background color'}`;
        } else if (fit === 'contain') {
          resWarn.style.color = '#3b82f6';
          resWarn.textContent = `\u2139 Image scaled to fit inside ${tw}\u00d7${th} \u2014 remaining space filled with ${$('social-bg-transparent')?.checked ? 'transparency' : 'background color'}`;
        } else if (fit === 'stretch') {
          resWarn.style.color = '#eab308';
          resWarn.textContent = `\u26a0 Image will be stretched from ${sw}\u00d7${sh} to ${tw}\u00d7${th} \u2014 may appear distorted`;
        } else {
          resWarn.style.color = '#eab308';
          resWarn.textContent = `\u26a0 Both dimensions smaller than target \u2014 try "Original size" or "Contain"`;
        }
      } else {
        // One dimension smaller — image can be cropped but one axis will be tight
        resWarn.style.display = '';
        const which = sw < tw ? 'width' : 'height';
        const srcVal = sw < tw ? sw : sh;
        const tgtVal = sw < tw ? tw : th;
        if (fit === 'cover') {
          resWarn.style.color = '#3b82f6';
          resWarn.textContent = `\u2139 Image ${which} (${srcVal}) slightly smaller than target (${tgtVal}) \u2014 will be upscaled to fill. Use the frame to position`;
        } else {
          resWarn.style.color = '#3b82f6';
          resWarn.textContent = `\u2139 Image ${which} (${srcVal}) smaller than target (${tgtVal})`;
        }
      }
    } else {
      resWarn.style.display = 'none';
    }
  }

  // ── Draw guides overlay (Level 1 + Level 2) ──
  function _drawGuides() {
    if (!guidesCanvas || !guidesCtx) return;
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];

    // Match guide canvas to displayed canvas size
    const cw = canvas.clientWidth || canvas.offsetWidth;
    const ch = canvas.clientHeight || canvas.offsetHeight;
    if (!cw || !ch) {
      guidesCanvas.style.display = 'none';
      return;
    }
    guidesCanvas.width = cw;
    guidesCanvas.height = ch;
    guidesCanvas.style.display = '';

    const gx = guidesCtx;
    const w = guidesCanvas.width;
    const h = guidesCanvas.height;
    gx.clearRect(0, 0, w, h);

    if (!preset) return;

    // Level 1: Canvas outline with dimensions
    gx.strokeStyle = 'rgba(244, 196, 48, 0.8)';
    gx.lineWidth = 2;
    gx.strokeRect(1, 1, w - 2, h - 2);

    // Dimension label with background pill
    const label = `${preset.w}\u00d7${preset.h} \u2014 ${preset.label}`;
    const fontSize = Math.max(11, Math.round(w * 0.03));
    gx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    const labelW = gx.measureText(label).width;
    gx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    gx.fillRect(w / 2 - labelW / 2 - 8, h - fontSize - 10, labelW + 16, fontSize + 8);
    gx.fillStyle = '#F4C430';
    gx.textAlign = 'center';
    gx.textBaseline = 'bottom';
    gx.fillText(label, w / 2, h - 6);

    // Level 2: Safe zone guides
    const zone = SOCIAL_SAFE_ZONES[platformSel.value];
    if (zone) {
      const st = h * zone.top;
      const sb = h * zone.bottom;
      const sl = w * zone.left;
      const sr = w * zone.right;

      // Fill unsafe areas with darker overlay
      gx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      if (zone.top > 0) gx.fillRect(0, 0, w, st);
      if (zone.bottom > 0) gx.fillRect(0, h - sb, w, sb);
      if (zone.left > 0) gx.fillRect(0, st, sl, h - st - sb);
      if (zone.right > 0) gx.fillRect(w - sr, st, sr, h - st - sb);

      // Draw safe zone rectangle — solid, bright
      gx.strokeStyle = 'rgba(34, 197, 94, 0.85)';
      gx.lineWidth = 2;
      gx.setLineDash([6, 3]);
      gx.strokeRect(sl, st, w - sl - sr, h - st - sb);
      gx.setLineDash([]);

      // Safe zone label with background
      const szFont = Math.max(9, Math.round(w * 0.025));
      gx.font = `600 ${szFont}px Inter, system-ui, sans-serif`;
      const szLabel = 'SAFE ZONE';
      const szW = gx.measureText(szLabel).width;
      gx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      gx.fillRect(sl + 4, st + 4, szW + 10, szFont + 6);
      gx.fillStyle = '#22c55e';
      gx.textAlign = 'left';
      gx.textBaseline = 'top';
      gx.fillText(szLabel, sl + 9, st + 7);
    }

    // Update label below canvas
    if (labelEl && !socialImg) {
      let text = `${preset.label} \u00b7 ${preset.w}\u00d7${preset.h}`;
      if (zone) text += ' \u00b7 Green = safe zone';
      labelEl.textContent = text;
    }
  }

  // Re-draw guides on window resize
  window.addEventListener('resize', () => { if (canvasWrap?.style.display !== 'none') requestAnimationFrame(_drawGuides); });

  // ── Draggable frame overlay ──
  // Frame = target crop area shown over the full image. User drags to reposition.
  let _dragging = false, _dragStartX = 0, _dragStartY = 0, _frameStartX = 0, _frameStartY = 0;
  let frameW = 0, frameH = 0; // frame size in canvas pixels (scaled to fit image)

  function _initFrame(preset) {
    if (!socialImg || !preset) return;
    const sw = socialImg.naturalWidth, sh = socialImg.naturalHeight;

    if (sw < preset.w && sh < preset.h) {
      // Both dimensions smaller — canvas is target size, frame fills entire canvas
      frameW = preset.w;
      frameH = preset.h;
      frameX = 0;
      frameY = 0;
    } else if (preset.w <= sw && preset.h <= sh) {
      // Both dimensions bigger — frame at exact target size
      frameW = preset.w;
      frameH = preset.h;
      frameX = Math.round((sw - frameW) / 2);
      frameY = Math.round((sh - frameH) / 2);
    } else {
      // One dimension bigger, one smaller — scale frame to fit within image
      const ratio = preset.w / preset.h;
      if (sw / sh > ratio) {
        // Image wider than target ratio — constrain by height
        frameH = sh;
        frameW = Math.round(sh * ratio);
      } else {
        // Image taller than target ratio — constrain by width
        frameW = sw;
        frameH = Math.round(sw / ratio);
      }
      frameX = Math.round((sw - frameW) / 2);
      frameY = Math.round((sh - frameH) / 2);
    }
  }

  // Redraw canvas in small mode (image inside target-sized canvas)
  function _redrawSmallMode() {
    if (!socialImg) return;
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (!preset) return;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, preset.w, preset.h);
    ctx.drawImage(socialImg, imgOffX, imgOffY);
  }

  function _canDragFrame() {
    // Only draggable if frame is smaller than image (there's excess to reposition)
    if (!socialImg || !frameW || !frameH) return false;
    return frameW < socialImg.naturalWidth - 1 || frameH < socialImg.naturalHeight - 1;
  }

  function _drawFrameOverlay() {
    if (!guidesCanvas || !guidesCtx || !socialImg) return;
    guidesCanvas.style.display = '';

    // Use image pixel dimensions as drawing space
    // CSS width:100%;height:100% scales the guides canvas to match the image display size
    const dw = canvas.width;
    const dh = canvas.height;
    if (!dw || !dh) return;
    guidesCanvas.width = dw;
    guidesCanvas.height = dh;

    const gx = guidesCtx;

    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (!preset || !frameW || !frameH) {
      gx.clearRect(0, 0, dw, dh);
      return;
    }

    // Frame coordinates are already in image pixel space — no scaling needed
    const fx = Math.round(frameX);
    const fy = Math.round(frameY);
    const fw = Math.round(frameW);
    const fh = Math.round(frameH);

    // Fill entire overlay with dark, then punch out the frame
    gx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    gx.fillRect(0, 0, dw, dh);
    gx.clearRect(fx, fy, fw, fh);

    // Scale factor for text/lines (image pixels can be very large)
    const uiScale = Math.max(1, dw / 500);

    // Frame border
    gx.strokeStyle = '#F4C430';
    gx.lineWidth = 2 * uiScale;
    gx.strokeRect(fx, fy, fw, fh);

    // Dimension label
    const fontSize = Math.max(10 * uiScale, Math.round(fw * 0.035));
    const label = `${preset.w}\u00d7${preset.h} \u2014 ${preset.label}`;
    gx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    const lw = gx.measureText(label).width;
    gx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    const pad = 6 * uiScale;
    gx.fillRect(fx + fw / 2 - lw / 2 - pad, fy + fh - fontSize - pad * 1.5, lw + pad * 2, fontSize + pad * 1.2);
    gx.fillStyle = '#F4C430';
    gx.textAlign = 'center';
    gx.textBaseline = 'bottom';
    gx.fillText(label, fx + fw / 2, fy + fh - pad);

    // Safe zone
    const zone = SOCIAL_SAFE_ZONES[platformSel.value];
    if (zone) {
      const st = fh * zone.top, sb = fh * zone.bottom;
      const sl = fw * zone.left, sr = fw * zone.right;
      gx.strokeStyle = 'rgba(34, 197, 94, 0.85)';
      gx.lineWidth = 1.5 * uiScale;
      gx.setLineDash([5 * uiScale, 3 * uiScale]);
      gx.strokeRect(fx + sl, fy + st, fw - sl - sr, fh - st - sb);
      gx.setLineDash([]);

      const szFont = Math.max(8 * uiScale, Math.round(fw * 0.025));
      gx.font = `600 ${szFont}px Inter, system-ui, sans-serif`;
      gx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      const szLabel = 'SAFE ZONE';
      const szW = gx.measureText(szLabel).width;
      gx.fillRect(fx + sl + 3 * uiScale, fy + st + 3 * uiScale, szW + 8 * uiScale, szFont + 5 * uiScale);
      gx.fillStyle = '#22c55e';
      gx.textAlign = 'left';
      gx.textBaseline = 'top';
      gx.fillText(szLabel, fx + sl + 7 * uiScale, fy + st + 5 * uiScale);
    }

    const draggable = _canDragFrame() || _smallMode;
    if (!_dragging) guidesCanvas.style.cursor = draggable ? 'grab' : 'default';

    // Drag hint inside frame
    if (draggable) {
      gx.font = `500 ${Math.max(9 * uiScale, Math.round(fw * 0.028))}px Inter, system-ui, sans-serif`;
      gx.fillStyle = 'rgba(244, 196, 48, 0.8)';
      gx.textAlign = 'center';
      gx.textBaseline = 'top';
      const hint = _smallMode ? '\u2630 Drag image to position' : '\u2630 Drag frame to reposition';
      gx.fillText(hint, fx + fw / 2, fy + 6 * uiScale);
    }

    // Label below canvas
    if (labelEl) {
      let text = `${preset.label} \u00b7 ${preset.w}\u00d7${preset.h}`;
      if (socialImg) {
        text += ` \u00b7 Source: ${socialImg.naturalWidth}\u00d7${socialImg.naturalHeight}`;
        if (_smallMode) {
          text += ' \u00b7 Drag image to position inside frame';
        } else if (_canDragFrame()) {
          text += ' \u00b7 Drag frame to choose focus';
        }
      }
      labelEl.textContent = text;
    }
  }

  // Drag handlers on the guides canvas (sits over the main canvas)
  guidesCanvas.addEventListener('mousedown', (e) => {
    if (!socialImg) return;
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (!preset) return;
    if (!_smallMode && !_canDragFrame()) return;
    _dragging = true;
    _dragStartX = e.clientX;
    _dragStartY = e.clientY;
    _frameStartX = _smallMode ? imgOffX : frameX;
    _frameStartY = _smallMode ? imgOffY : frameY;
    guidesCanvas.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!_dragging || !socialImg) return;
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (!preset) return;

    const gRect = guidesCanvas.getBoundingClientRect();
    const scaleX = canvas.width / (gRect.width || 1);
    const scaleY = canvas.height / (gRect.height || 1);
    const dx = (e.clientX - _dragStartX) * scaleX;
    const dy = (e.clientY - _dragStartY) * scaleY;

    if (_smallMode) {
      // Move image inside target canvas — constrain to stay within bounds
      const sw = socialImg.naturalWidth, sh = socialImg.naturalHeight;
      imgOffX = Math.max(0, Math.min(preset.w - sw, Math.round(_frameStartX + dx)));
      imgOffY = Math.max(0, Math.min(preset.h - sh, Math.round(_frameStartY + dy)));
      _redrawSmallMode();
      _drawFrameOverlay();
    } else {
      // Move frame over the image
      const cw = canvas.width, ch = canvas.height;
      frameX = Math.max(0, Math.min(cw - frameW, Math.round(_frameStartX + dx)));
      frameY = Math.max(0, Math.min(ch - frameH, Math.round(_frameStartY + dy)));
      _drawFrameOverlay();
    }
  });

  window.addEventListener('mouseup', () => {
    if (_dragging) {
      _dragging = false;
      guidesCanvas.style.cursor = 'grab';
    }
  });

  // Re-init frame when platform or fit changes
  fitSel.addEventListener('change', () => {
    if (!socialImg) return;
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (preset) {
      _initFrame(preset);
      _checkResolution(preset);
      _drawFrameOverlay();
    }
  });

  // Update resolution message when transparency changes
  $('social-bg-transparent')?.addEventListener('change', () => {
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (preset) _checkResolution(preset);
  });

  // ── Generate button — render to overlay ──
  const resultCanvas = $('social-result-canvas');
  const resultCtx = resultCanvas?.getContext('2d');
  const resultOverlay = $('social-result-overlay');
  const resultInfo = $('social-result-info');

  $('btn-social-generate').addEventListener('click', () => {
    if (!socialImg) { pixDialog.alert('No Image', 'Drop or select a source image first.'); return; }
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    if (!preset) { pixDialog.alert('No Platform', 'Select a social media platform preset.'); return; }

    const tw = preset.w, th = preset.h;
    resultCanvas.width = tw; resultCanvas.height = th;

    const sw = socialImg.naturalWidth, sh = socialImg.naturalHeight;
    const fit = fitSel.value;

    const transparent = $('social-bg-transparent')?.checked;

    // Fill background (unless transparent)
    if (!transparent) {
      resultCtx.fillStyle = bgColor.value;
      resultCtx.fillRect(0, 0, tw, th);
    }

    if (fit === 'cover') {
      if (_smallMode) {
        // Image smaller — place at dragged position, upscale would be blurry
        resultCtx.drawImage(socialImg, imgOffX, imgOffY);
      } else if (frameW > 0 && frameH > 0) {
        resultCtx.drawImage(socialImg, frameX, frameY, frameW, frameH, 0, 0, tw, th);
      } else {
        const scale = Math.max(tw / sw, th / sh);
        const dw = sw * scale, dh = sh * scale;
        const dx = (tw - dw) / 2, dy = (th - dh) / 2;
        resultCtx.drawImage(socialImg, dx, dy, dw, dh);
      }
    } else if (fit === 'contain') {
      if (_smallMode) {
        // Image smaller — place at position user dragged
        resultCtx.drawImage(socialImg, imgOffX, imgOffY);
      } else {
        const scale = Math.min(tw / sw, th / sh);
        const dw = sw * scale, dh = sh * scale;
        const dx = (tw - dw) / 2, dy = (th - dh) / 2;
        resultCtx.drawImage(socialImg, dx, dy, dw, dh);
      }
    } else if (fit === 'original') {
      // Place at original size — use drag position if in small mode, otherwise centered
      const dx = _smallMode ? imgOffX : Math.round((tw - sw) / 2);
      const dy = _smallMode ? imgOffY : Math.round((th - sh) / 2);
      resultCtx.drawImage(socialImg, dx, dy);
    } else {
      // Stretch
      resultCtx.drawImage(socialImg, 0, 0, tw, th);
    }

    // Text overlay
    const txt = textInput.value.trim();
    if (txt) {
      const customSize = window._socialFontPill?.state.size || 0;
      const fontSize = customSize > 0 ? customSize : Math.max(16, Math.round(Math.min(tw, th) * 0.06));
      const fontFamily = window._socialFontPill?.state.family || 'sans-serif';
      resultCtx.font = `bold ${fontSize}px ${fontFamily}`;
      resultCtx.fillStyle = textColor.value;
      resultCtx.textAlign = 'center';
      resultCtx.textBaseline = 'middle';
      resultCtx.shadowColor = 'rgba(0,0,0,0.6)';
      resultCtx.shadowBlur = 6;
      resultCtx.shadowOffsetX = 0;
      resultCtx.shadowOffsetY = 2;

      let tx = tw / 2, ty;
      const pos = textPos.value;
      if (pos === 'top') ty = fontSize * 1.5;
      else if (pos === 'bottom') ty = th - fontSize * 1.5;
      else ty = th / 2;

      resultCtx.fillText(txt, tx, ty);
      resultCtx.shadowColor = 'transparent';
      resultCtx.shadowBlur = 0;
    }

    generated = true;
    _updateButtons();

    // Show result info
    if (resultInfo) resultInfo.textContent = `${preset.label} \u00b7 ${tw}\u00d7${th}`;

    // Show overlay
    resultOverlay.style.display = 'flex';

    // Platform mockup preview
    _renderMockup(preset);
  });

  // Close result overlay
  $('btn-social-result-close')?.addEventListener('click', () => {
    resultOverlay.style.display = 'none';
  });
  resultOverlay?.addEventListener('click', (e) => {
    if (e.target === resultOverlay) resultOverlay.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resultOverlay?.style.display === 'flex') resultOverlay.style.display = 'none';
  });

  // ── Level 3: Platform mockup preview ──
  function _renderMockup(preset) {
    const mockup = $('social-mockup');
    const frame = $('social-mockup-frame');
    if (!mockup || !frame || !generated) return;

    const dataUrl = resultCanvas.toDataURL('image/jpeg', 0.85);
    const key = platformSel.value;
    const bg = '#1e293b';

    let html = '';

    if (key.startsWith('ig-post') || key === 'ig-landscape') {
      // Instagram feed card
      html = `<div style="width:340px;background:#000;border:1px solid #333;border-radius:8px;font-family:system-ui,sans-serif;">` +
        `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;"><div style="width:28px;height:28px;border-radius:50%;background:#333;"></div><div style="font-size:12px;color:#fff;font-weight:600;">username</div></div>` +
        `<img src="${dataUrl}" style="width:100%;display:block;">` +
        `<div style="padding:10px 12px;display:flex;gap:14px;">` +
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` +
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` +
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>` +
        `</div></div>`;
    } else if (key === 'ig-story' || key === 'tt-post') {
      // Story/TikTok phone frame
      html = `<div style="width:200px;background:#000;border-radius:20px;border:3px solid #333;overflow:hidden;position:relative;">` +
        `<img src="${dataUrl}" style="width:100%;display:block;">` +
        `<div style="position:absolute;top:8px;left:0;right:0;display:flex;justify-content:center;"><div style="width:50%;height:3px;background:rgba(255,255,255,0.3);border-radius:2px;"></div></div>` +
        `</div>`;
    } else if (key === 'yt-thumb') {
      // YouTube search result row
      html = `<div style="width:400px;background:#0f0f0f;border-radius:8px;overflow:hidden;display:flex;gap:10px;padding:8px;">` +
        `<div style="position:relative;flex-shrink:0;width:180px;"><img src="${dataUrl}" style="width:100%;border-radius:6px;display:block;"><span style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.8);color:#fff;font-size:10px;padding:1px 4px;border-radius:2px;">12:34</span></div>` +
        `<div style="padding:2px 0;"><div style="color:#fff;font-size:12px;font-weight:600;line-height:1.3;">Video Title Goes Here</div><div style="color:#aaa;font-size:10px;margin-top:4px;">Channel Name</div><div style="color:#aaa;font-size:10px;">1.2M views \u00b7 3 days ago</div></div>` +
        `</div>`;
    } else if (key.startsWith('tw-post')) {
      // Twitter post card
      html = `<div style="width:360px;background:#15202b;border:1px solid #38444d;border-radius:12px;font-family:system-ui,sans-serif;">` +
        `<div style="display:flex;gap:10px;padding:12px 14px;">` +
        `<div style="width:40px;height:40px;border-radius:50%;background:#333;flex-shrink:0;"></div>` +
        `<div style="flex:1;"><div style="display:flex;gap:4px;align-items:center;margin-bottom:4px;"><span style="color:#fff;font-size:13px;font-weight:700;">Display Name</span><span style="color:#8899a6;font-size:12px;">@username \u00b7 2h</span></div>` +
        `<div style="color:#d9d9d9;font-size:13px;margin-bottom:8px;">Check out this image!</div>` +
        `<img src="${dataUrl}" style="width:100%;border-radius:12px;display:block;border:1px solid #38444d;">` +
        `</div></div></div>`;
    } else if (key.startsWith('fb-post')) {
      // Facebook post
      html = `<div style="width:360px;background:#242526;border-radius:8px;font-family:system-ui,sans-serif;">` +
        `<div style="display:flex;gap:8px;padding:12px;align-items:center;"><div style="width:36px;height:36px;border-radius:50%;background:#3a3b3c;"></div><div><div style="color:#e4e6eb;font-size:13px;font-weight:600;">Page Name</div><div style="color:#b0b3b8;font-size:11px;">Just now \u00b7 \ud83c\udf10</div></div></div>` +
        `<img src="${dataUrl}" style="width:100%;display:block;">` +
        `<div style="padding:8px 12px;display:flex;justify-content:space-around;border-top:1px solid #3a3b3c;"><span style="color:#b0b3b8;font-size:12px;">\ud83d\udc4d Like</span><span style="color:#b0b3b8;font-size:12px;">\ud83d\udcac Comment</span><span style="color:#b0b3b8;font-size:12px;">\u21aa Share</span></div>` +
        `</div>`;
    } else if (key.includes('profile') || key === 'dc-avatar') {
      // Profile picture in circle
      html = `<div style="width:120px;text-align:center;">` +
        `<img src="${dataUrl}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #333;">` +
        `<div style="color:#aaa;font-size:11px;margin-top:6px;">Profile Picture</div></div>`;
    } else if (key.includes('banner') || key.includes('cover') || key.includes('header')) {
      // Banner/cover with profile overlay
      html = `<div style="width:380px;position:relative;">` +
        `<img src="${dataUrl}" style="width:100%;border-radius:8px;display:block;">` +
        `<div style="position:absolute;bottom:-16px;left:16px;width:48px;height:48px;border-radius:50%;background:#333;border:3px solid ${bg};"></div>` +
        `</div>`;
    } else {
      // Generic frame
      html = `<div style="width:320px;"><img src="${dataUrl}" style="width:100%;border-radius:8px;display:block;"></div>`;
    }

    frame.innerHTML = html;
    mockup.style.display = '';
  }

  // ── Reset ──
  $('btn-social-reset')?.addEventListener('click', () => {
    socialImg = null;
    generated = false;
    frameX = 0; frameY = 0; frameW = 0; frameH = 0;
    imgOffX = 0; imgOffY = 0; _smallMode = false;
    canvas.width = 0; canvas.height = 0;
    canvas.style.display = 'none';
    canvasWrap.style.display = 'none';
    if (dropGuides) { dropGuides.style.display = 'none'; dropGuides.innerHTML = ''; }
    dropOutline.style.display = 'none';
    dropzone.style.display = '';
    dropzoneDefault.style.display = '';
    $('social-mockup').style.display = 'none';
    resultOverlay.style.display = 'none';
    resultCanvas.width = 0; resultCanvas.height = 0;
    $('social-file').value = '';
    $('social-file-default').value = '';
    if (guidesCanvas) guidesCanvas.style.display = 'none';
    if (labelEl) labelEl.textContent = '';
    if (resWarn) resWarn.style.display = 'none';
    platformSel.value = '';
    dimsEl.textContent = 'Select a platform';
    _updateButtons();
  });

  // ── Download (ribbon + overlay) ──
  function _downloadResult() {
    if (!resultCanvas.width || !resultCanvas.height) return;
    const preset = SOCIAL_PLATFORM_PRESETS[platformSel.value];
    const name = preset ? preset.name : 'social';
    resultCanvas.toBlob((blob) => {
      if (!blob) return;
      Platform.download(URL.createObjectURL(blob), `gazo/${name}.png`, true);
    }, 'image/png');
  }
  $('btn-social-download')?.addEventListener('click', _downloadResult);
  $('btn-social-result-download')?.addEventListener('click', _downloadResult);

  // ── Copy to clipboard (ribbon + overlay) ──
  async function _copyResult() {
    if (!resultCanvas.width || !resultCanvas.height) return;
    try {
      const blob = await new Promise(r => resultCanvas.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Copied to clipboard', 'success');
    } catch (e) {
      pixDialog.alert('Copy Failed', 'Could not copy image to clipboard.');
    }
  }
  $('btn-social-copy')?.addEventListener('click', _copyResult);
  $('btn-social-result-copy')?.addEventListener('click', _copyResult);
}
