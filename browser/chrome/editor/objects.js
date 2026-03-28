// Pixeroo - Object-based Drawing System
// Replaces stamp-based annotations with selectable, movable, resizable objects.
//
// Usage:
//   const objLayer = new ObjectLayer(canvas);
//   objLayer.addText(100, 100, 'Hello');
//   objLayer.addRect(50, 50, 200, 100);
//   objLayer.addArrow(10, 10, 200, 200);
//   objLayer.flatten(); // burns objects into canvas pixels

class DrawObject {
  constructor(type, x, y, w, h) {
    this.type = type; // 'text', 'rect', 'arrow', 'redact', 'pen', 'highlighter', 'image'
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = '#ef4444';
    this.lineWidth = 3;
    this.text = '';
    this.fontSize = 24;
    this.fontFamily = 'Inter, system-ui, sans-serif';
    this.fontWeight = 'bold';
    this.opacity = 1;
    this.selected = false;
    this.editing = false;
    this.filled = false; // for rect: filled vs stroke-only
    this.redactMode = 'pixelate';
    this.redactStrength = 3;
    this.filter = null;
    this.filterValue = null;
    // For arrow
    this.x2 = x + w;
    this.y2 = y + h;
    // For pen/highlighter
    this.points = [];
    // For image objects (collage)
    this.imgSource = null;  // HTMLCanvasElement or HTMLImageElement
    this.imgFilter = 'none'; // CSS filter name
    this.borderWidth = 0;
    this.borderColor = '#ffffff';
    this.shadowEnabled = false;
    this.shadowColor = '#000000';
    this.shadowBlur = 12;
    this.shadowDir = 'br';
    this.cornerRadius = 0;
  }

  containsPoint(px, py) {
    if (this.type === 'arrow') {
      return this._distToSegment(px, py, this.x, this.y, this.x2, this.y2) < 8;
    }
    if (this.type === 'pen' || this.type === 'highlighter') {
      // Check distance to any segment of the stroke
      const threshold = Math.max(this.lineWidth, 8);
      for (let i = 1; i < this.points.length; i++) {
        if (this._distToSegment(px, py, this.points[i - 1].x, this.points[i - 1].y, this.points[i].x, this.points[i].y) < threshold) return true;
      }
      return false;
    }
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  getHandle(px, py) {
    const hs = 6;
    const handles = this._getHandlePositions();
    for (const [name, hx, hy] of handles) {
      if (Math.abs(px - hx) < hs && Math.abs(py - hy) < hs) return name;
    }
    if (this.containsPoint(px, py)) return 'move';
    return null;
  }

  _getHandlePositions() {
    if (this.type === 'arrow') {
      return [['start', this.x, this.y], ['end', this.x2, this.y2]];
    }
    if (this.type === 'pen' || this.type === 'highlighter') {
      return [];
    }
    return [
      ['tl', this.x, this.y], ['tr', this.x + this.w, this.y],
      ['bl', this.x, this.y + this.h], ['br', this.x + this.w, this.y + this.h],
      ['tm', this.x + this.w / 2, this.y], ['bm', this.x + this.w / 2, this.y + this.h],
      ['ml', this.x, this.y + this.h / 2], ['mr', this.x + this.w, this.y + this.h / 2],
    ];
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;

    if (this.type === 'rect') {
      if (this.filled) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
      } else {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
      }
    } else if (this.type === 'pen' || this.type === 'highlighter') {
      this._drawStroke(ctx);
    } else if (this.type === 'arrow') {
      this._drawArrow(ctx);
    } else if (this.type === 'text') {
      ctx.fillStyle = this.color;
      ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
      ctx.textBaseline = 'top';
      const lines = (this.text || '').split('\n');
      const lineH = this.fontSize * 1.3;
      // Measure and auto-size bounding box
      let maxW = 0;
      lines.forEach(line => { maxW = Math.max(maxW, ctx.measureText(line).width); });
      this.w = Math.max(maxW + 8, 20);
      this.h = Math.max(lines.length * lineH, lineH);
      // Draw text
      lines.forEach((line, i) => {
        ctx.fillText(line, this.x + 4, this.y + i * lineH + 2);
      });
    } else if (this.type === 'redact') {
      // Solid black fill (text unreadable)
      ctx.fillStyle = '#000000';
      ctx.fillRect(this.x, this.y, this.w, this.h);
    } else if (this.type === 'mask') {
      // Mask filter indicator (actual filter applied on flatten)
      ctx.strokeStyle = '#F4C430';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(this.x, this.y, this.w, this.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(244,196,48,0.1)';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = '#F4C430';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(this.filter || 'mask', this.x + 4, this.y + 4);
    } else if (this.type === 'image' && this.imgSource) {
      this._drawImage(ctx);
    }

    ctx.restore();
  }

  drawSelection(ctx) {
    if (!this.selected) return;
    ctx.save();
    ctx.strokeStyle = '#F4C430';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    if (this.type === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x2, this.y2);
      ctx.stroke();
    } else if (this.type === 'pen' || this.type === 'highlighter') {
      // Draw bounding box around stroke
      const bb = this._strokeBounds();
      ctx.strokeRect(bb.x - 4, bb.y - 4, bb.w + 8, bb.h + 8);
    } else {
      ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    }

    ctx.setLineDash([]);

    // Draw handles
    ctx.fillStyle = '#F4C430';
    for (const [, hx, hy] of this._getHandlePositions()) {
      ctx.fillRect(hx - 4, hy - 4, 8, 8);
    }

    // Text cursor when editing
    if (this.type === 'text' && this.editing) {
      ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
      const lines = (this.text || '').split('\n');
      const lastLine = lines[lines.length - 1] || '';
      const cursorX = this.x + 4 + ctx.measureText(lastLine).width + 2;
      const cursorY = this.y + (lines.length - 1) * this.fontSize * 1.3 + 2;
      ctx.strokeStyle = '#F4C430';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cursorX, cursorY);
      ctx.lineTo(cursorX, cursorY + this.fontSize);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawArrow(ctx) {
    const headLen = 12;
    const angle = Math.atan2(this.y2 - this.y, this.x2 - this.x);
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x2, this.y2);
    ctx.lineTo(this.x2 - headLen * Math.cos(angle - Math.PI / 6), this.y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(this.x2 - headLen * Math.cos(angle + Math.PI / 6), this.y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  _strokeBounds() {
    if (!this.points.length) return { x: this.x, y: this.y, w: 0, h: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.points) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  _drawImage(ctx) {
    const { x, y, w, h } = this;
    const bw = this.borderWidth || 0;
    const r = this.cornerRadius || 0;

    // Shadow
    if (this.shadowEnabled) {
      const sr = parseInt(this.shadowColor.slice(1,3),16)||0, sg = parseInt(this.shadowColor.slice(3,5),16)||0, sb = parseInt(this.shadowColor.slice(5,7),16)||0;
      const sOff = Math.max(2, Math.round(this.shadowBlur * 0.3));
      const dir = this.shadowDir || 'br';
      ctx.shadowColor = `rgba(${sr},${sg},${sb},0.4)`;
      ctx.shadowBlur = this.shadowBlur;
      ctx.shadowOffsetX = dir === 'center' ? 0 : (dir.includes('r') ? sOff : -sOff);
      ctx.shadowOffsetY = dir === 'center' ? 0 : (dir.includes('b') ? sOff : -sOff);
      ctx.fillStyle = this.borderColor || '#fff';
      if (r > 0) { _imgRoundRect(ctx, x - bw, y - bw, w + bw*2, h + bw*2, r); ctx.fill(); }
      else ctx.fillRect(x - bw, y - bw, w + bw*2, h + bw*2);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    }

    // Border frame
    if (bw > 0) {
      ctx.fillStyle = this.borderColor || '#ffffff';
      if (r > 0) { _imgRoundRect(ctx, x - bw, y - bw, w + bw*2, h + bw*2, r); ctx.fill(); }
      else ctx.fillRect(x - bw, y - bw, w + bw*2, h + bw*2);
    }

    // Clip for rounded corners
    ctx.save();
    if (r > 0) { _imgRoundRect(ctx, x, y, w, h, Math.max(1, r - bw)); ctx.clip(); }

    // Filter
    const filterCSS = { none:'', grayscale:'grayscale(100%)', sepia:'sepia(100%)', brightness:'brightness(130%)', contrast:'contrast(140%)', blur:'blur(2px)', invert:'invert(100%)' };
    if (this.imgFilter && filterCSS[this.imgFilter]) ctx.filter = filterCSS[this.imgFilter];

    // Draw image (cover: fill the cell completely)
    const src = this.imgSource;
    const scale = Math.max(w / src.width, h / src.height);
    const sw = src.width * scale, sh = src.height * scale;
    ctx.drawImage(src, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);

    ctx.filter = 'none';
    ctx.restore();
  }

  _drawStroke(ctx) {
    if (this.points.length < 2) return;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.type === 'highlighter' ? Math.max(this.lineWidth * 4, 16) : this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (this.type === 'highlighter') ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
    if (this.type === 'highlighter') ctx.globalAlpha = this.opacity;
  }

  _wrapText(ctx, text, maxWidth) {
    if (!text) return [''];
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
    return lines;
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
}

class ObjectLayer {
  constructor(baseCanvas, saveStateFn) {
    this.base = baseCanvas;
    this.baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    this.objects = [];
    this.selected = null;
    this.saveState = saveStateFn;

    // Overlay canvas for drawing objects + handles
    this.overlay = document.createElement('canvas');
    this.overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:auto;cursor:default;';
    this.overlayCtx = this.overlay.getContext('2d');

    // Interaction state
    this.dragging = false;
    this.dragHandle = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.origX = 0;
    this.origY = 0;
    this.origW = 0;
    this.origH = 0;
    this.creating = null; // tool type being created
    this.active = false;

    // Settings (shared with ribbon)
    this.color = '#ef4444';
    this.lineWidth = 3;
    this.fontSize = 24;
    this._penObj = null; // active pen/highlighter stroke being drawn
  }

  attach(parentEl) {
    this.overlay.width = this.base.width;
    this.overlay.height = this.base.height;
    parentEl.style.position = 'relative';
    parentEl.appendChild(this.overlay);
    this.active = true;

    this._onDown = (e) => this._handleDown(e);
    this._onMove = (e) => this._handleMove(e);
    this._onUp = (e) => this._handleUp(e);
    this._onDblClick = (e) => this._handleDblClick(e);
    this._onKey = (e) => this._handleKey(e);

    this.overlay.addEventListener('mousedown', this._onDown);
    window.addEventListener('mousemove', this._onMove);
    window.addEventListener('mouseup', this._onUp);
    this.overlay.addEventListener('dblclick', this._onDblClick);
    document.addEventListener('keydown', this._onKey);

    this.render();
  }

  detach() {
    this.active = false;
    this.overlay.remove();
    this.overlay.removeEventListener('mousedown', this._onDown);
    window.removeEventListener('mousemove', this._onMove);
    window.removeEventListener('mouseup', this._onUp);
    this.overlay.removeEventListener('dblclick', this._onDblClick);
    document.removeEventListener('keydown', this._onKey);
  }

  _toCanvasCoords(e) {
    const rect = this.overlay.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * this.base.width / rect.width,
      y: (e.clientY - rect.top) * this.base.height / rect.height
    };
  }

  // --- Tool activation ---
  startTool(type) {
    this.deselectAll();
    this.creating = type;
    this.overlay.style.cursor = type === 'text' ? 'text' : 'crosshair';
    this.render();
  }

  stopTool() {
    this.creating = null;
    this.overlay.style.cursor = 'default';
  }

  // --- Object creation ---
  addRect(x, y, w, h) {
    const obj = new DrawObject('rect', x, y, w, h);
    obj.color = this.color;
    obj.lineWidth = this.lineWidth;
    obj.filled = this.filled || false;
    this.objects.push(obj);
    this.select(obj);
    return obj;
  }

  addArrow(x1, y1, x2, y2) {
    const obj = new DrawObject('arrow', x1, y1, 0, 0);
    obj.x2 = x2;
    obj.y2 = y2;
    obj.color = this.color;
    obj.lineWidth = this.lineWidth;
    this.objects.push(obj);
    this.select(obj);
    return obj;
  }

  addText(x, y, text) {
    const obj = new DrawObject('text', x, y, 200, 30);
    obj.text = text || '';
    obj.color = this.color;
    obj.fontSize = this.fontSize;
    obj.fontFamily = this.fontFamily || 'Inter, system-ui, sans-serif';
    obj.editing = true;
    this.objects.push(obj);
    this.select(obj);
    return obj;
  }

  addRedact(x, y, w, h) {
    const obj = new DrawObject('redact', x, y, w, h);
    this.objects.push(obj);
    this.select(obj);
    return obj;
  }

  addMask(x, y, w, h, filter, filterValue) {
    const obj = new DrawObject('mask', x, y, w, h);
    obj.filter = filter || 'blur';
    obj.filterValue = filterValue;
    this.objects.push(obj);
    this.select(obj);
    return obj;
  }

  addImage(imgSource, x, y, w, h) {
    const obj = new DrawObject('image', x, y, w, h);
    obj.imgSource = imgSource;
    obj.opacity = 1;
    this.objects.push(obj);
    this.select(obj);
    return obj;
  }

  // Layer ordering
  bringForward() {
    if (!this.selected) return;
    const i = this.objects.indexOf(this.selected);
    if (i < this.objects.length - 1) {
      this.objects.splice(i, 1);
      this.objects.splice(i + 1, 0, this.selected);
      this.render();
    }
  }

  sendBackward() {
    if (!this.selected) return;
    const i = this.objects.indexOf(this.selected);
    if (i > 0) {
      this.objects.splice(i, 1);
      this.objects.splice(i - 1, 0, this.selected);
      this.render();
    }
  }

  bringToFront() {
    if (!this.selected) return;
    this.objects = this.objects.filter(o => o !== this.selected);
    this.objects.push(this.selected);
    this.render();
  }

  sendToBack() {
    if (!this.selected) return;
    this.objects = this.objects.filter(o => o !== this.selected);
    this.objects.unshift(this.selected);
    this.render();
  }

  // --- Pen/Highlighter are created directly in _handleDown, no addPen needed ---

  // --- Selection ---
  select(obj) {
    this.deselectAll();
    obj.selected = true;
    this.selected = obj;
    this.render();
  }

  deselectAll() {
    if (this.selected?.editing) this.selected.editing = false;
    this.objects.forEach(o => o.selected = false);
    this.selected = null;
  }

  deleteSelected() {
    if (!this.selected) return;
    this.objects = this.objects.filter(o => o !== this.selected);
    this.selected = null;
    this.render();
  }

  // --- Mouse handlers ---
  _handleDown(e) {
    const { x, y } = this._toCanvasCoords(e);

    // If creating a new object
    if (this.creating) {
      this.dragStartX = x;
      this.dragStartY = y;

      if (this.creating === 'text') {
        const obj = this.addText(x, y, '');
        obj.editing = true;
        this.stopTool();
        this.render();
        return;
      }

      // Freehand pen/highlighter — start collecting points immediately
      if (this.creating === 'pen' || this.creating === 'highlighter') {
        const obj = new DrawObject(this.creating, x, y, 0, 0);
        obj.color = this.creating === 'highlighter' ? '#facc15' : this.color;
        obj.lineWidth = this.lineWidth;
        obj.opacity = 1;
        obj.points = [{ x, y }];
        this.objects.push(obj);
        this._penObj = obj;
        this.dragging = true;
        this.dragHandle = 'pen';
        return;
      }

      this.dragging = true;
      this.dragHandle = 'create';
      return;
    }

    // Check if clicking on a handle of selected object
    if (this.selected) {
      const handle = this.selected.getHandle(x, y);
      if (handle) {
        this.dragging = true;
        this.dragHandle = handle;
        this.dragStartX = x;
        this.dragStartY = y;
        this.origX = this.selected.x;
        this.origY = this.selected.y;
        this.origW = this.selected.w;
        this.origH = this.selected.h;
        return;
      }
    }

    // Check if clicking on any object
    for (let i = this.objects.length - 1; i >= 0; i--) {
      if (this.objects[i].containsPoint(x, y)) {
        this.select(this.objects[i]);
        this.dragging = true;
        this.dragHandle = 'move';
        this.dragStartX = x;
        this.dragStartY = y;
        this.origX = this.selected.x;
        this.origY = this.selected.y;
        return;
      }
    }

    // Clicked on nothing -- deselect
    this.deselectAll();
    this.render();
  }

  _handleMove(e) {
    if (!this.active) return;
    const { x, y } = this._toCanvasCoords(e);

    if (!this.dragging) {
      // Update cursor based on what's under mouse
      let cursor = this.creating ? (this.creating === 'text' ? 'text' : 'crosshair') : 'default';
      if (this.selected) {
        const handle = this.selected.getHandle(x, y);
        const cursors = { tl: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', br: 'nwse-resize',
          tm: 'ns-resize', bm: 'ns-resize', ml: 'ew-resize', mr: 'ew-resize',
          start: 'move', end: 'move', move: 'move' };
        if (handle) cursor = cursors[handle] || 'move';
      }
      for (const obj of this.objects) {
        if (obj.containsPoint(x, y)) { cursor = 'move'; break; }
      }
      this.overlay.style.cursor = cursor;
      return;
    }

    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;

    // Freehand stroke in progress
    if (this.dragHandle === 'pen' && this._penObj) {
      this._penObj.points.push({ x, y });
      this.render();
      return;
    }

    if (this.dragHandle === 'create') {
      // Live preview of object being created
      this.render();
      const oc = this.overlayCtx;
      oc.strokeStyle = this.color;
      oc.lineWidth = this.lineWidth;
      oc.setLineDash([4, 4]);
      if (this.creating === 'arrow') {
        oc.beginPath();
        oc.moveTo(this.dragStartX, this.dragStartY);
        oc.lineTo(x, y);
        oc.stroke();
      } else {
        oc.strokeRect(this.dragStartX, this.dragStartY, dx, dy);
      }
      oc.setLineDash([]);
      return;
    }

    if (!this.selected) return;
    const obj = this.selected;

    if (this.dragHandle === 'move') {
      if (obj.type === 'arrow') {
        const adx = obj.x2 - obj.x;
        const ady = obj.y2 - obj.y;
        obj.x = this.origX + dx;
        obj.y = this.origY + dy;
        obj.x2 = obj.x + adx;
        obj.y2 = obj.y + ady;
      } else if ((obj.type === 'pen' || obj.type === 'highlighter') && obj.points.length) {
        // Move all points by delta from last frame
        const mx = (this.origX + dx) - obj.x;
        const my = (this.origY + dy) - obj.y;
        for (const p of obj.points) { p.x += mx; p.y += my; }
        obj.x = this.origX + dx;
        obj.y = this.origY + dy;
      } else {
        obj.x = this.origX + dx;
        obj.y = this.origY + dy;
      }
    } else if (obj.type === 'arrow') {
      if (this.dragHandle === 'start') { obj.x = x; obj.y = y; }
      else if (this.dragHandle === 'end') { obj.x2 = x; obj.y2 = y; }
    } else {
      // Resize handles
      if (this.dragHandle.includes('r')) { obj.w = Math.max(10, this.origW + dx); }
      if (this.dragHandle.includes('l')) { obj.x = this.origX + dx; obj.w = Math.max(10, this.origW - dx); }
      if (this.dragHandle.includes('b')) { obj.h = Math.max(10, this.origH + dy); }
      if (this.dragHandle.includes('t')) { obj.y = this.origY + dy; obj.h = Math.max(10, this.origH - dy); }
    }

    this.render();
  }

  _handleUp(e) {
    if (!this.dragging) return;
    const { x, y } = this._toCanvasCoords(e);

    // Finalize pen/highlighter stroke
    if (this.dragHandle === 'pen' && this._penObj) {
      if (this._penObj.points.length < 3) {
        this.objects.pop();
      } else {
        const bb = this._penObj._strokeBounds();
        this._penObj.x = bb.x; this._penObj.y = bb.y;
        this._penObj.w = bb.w; this._penObj.h = bb.h;
        this.select(this._penObj);
      }
      this._penObj = null;
      this.dragging = false;
      this.dragHandle = null;
      this.render();
      return;
    }

    if (this.dragHandle === 'create') {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      const minSize = 5;

      if (Math.abs(dx) > minSize || Math.abs(dy) > minSize) {
        const rx = Math.min(this.dragStartX, x), ry = Math.min(this.dragStartY, y);
        const rw = Math.abs(dx), rh = Math.abs(dy);

        if (this.creating === 'rect') this.addRect(rx, ry, rw, rh);
        else if (this.creating === 'arrow') this.addArrow(this.dragStartX, this.dragStartY, x, y);
        else if (this.creating === 'redact') this.addRedact(rx, ry, rw, rh);
        else if (this.creating === 'mask') this.addMask(rx, ry, rw, rh, this.maskFilter);
      }
      this.stopTool();
    }

    this.dragging = false;
    this.dragHandle = null;
    this.render();
  }

  _handleDblClick(e) {
    const { x, y } = this._toCanvasCoords(e);
    for (let i = this.objects.length - 1; i >= 0; i--) {
      if (this.objects[i].type === 'text' && this.objects[i].containsPoint(x, y)) {
        this.select(this.objects[i]);
        this.objects[i].editing = true;
        this.render();
        return;
      }
    }
  }

  _handleKey(e) {
    // Text editing
    if (this.selected?.editing && this.selected.type === 'text') {
      if (e.key === 'Escape') {
        this.selected.editing = false;
        if (!this.selected.text) this.deleteSelected();
        this.render();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        this.selected.text = this.selected.text.slice(0, -1);
        this.render();
        return;
      }
      if (e.key === 'Enter') {
        this.selected.text += '\n';
        this.render();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.selected.text += e.key;
        this.render();
        return;
      }
      return;
    }

    // Delete selected object
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selected) {
        e.preventDefault();
        this.deleteSelected();
        this.render();
      }
    }

    // Escape deselects
    if (e.key === 'Escape') {
      this.deselectAll();
      this.render();
    }
  }

  // Sync overlay pixel dimensions to match base canvas
  _syncOverlay() {
    this.overlay.width = this.base.width;
    this.overlay.height = this.base.height;
  }

  // --- Rendering ---
  render() {
    if (!this.active) return;
    this._syncOverlay();
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);

    // Draw all objects
    for (const obj of this.objects) {
      obj.draw(ctx);
      obj.drawSelection(ctx);
    }
  }

  // --- Flatten: burn all objects into the base canvas ---
  flatten() {
    this.deselectAll();
    for (const obj of this.objects) {
      if (obj.type === 'redact') {
        this._pixelateRegion(obj.x, obj.y, obj.w, obj.h, obj.redactStrength);
        // Draw solid black on top for full concealment
        this.baseCtx.fillStyle = '#000000';
        this.baseCtx.fillRect(Math.round(obj.x), Math.round(obj.y), Math.round(obj.w), Math.round(obj.h));
      } else if (obj.type === 'mask') {
        this._applyMaskFilter(obj);
      } else {
        obj.draw(this.baseCtx);
      }
    }
    this.objects = [];
    this.render();
    if (this.saveState) this.saveState();
  }

  // Apply a filter only within the mask region
  _applyMaskFilter(obj) {
    const rx = Math.max(0, Math.round(obj.x));
    const ry = Math.max(0, Math.round(obj.y));
    const rw = Math.min(Math.round(obj.w), this.base.width - rx);
    const rh = Math.min(Math.round(obj.h), this.base.height - ry);
    if (rw < 2 || rh < 2) return;

    // Extract region, apply to temp canvas with filter, put back
    const imgData = this.baseCtx.getImageData(rx, ry, rw, rh);
    const tmp = document.createElement('canvas'); tmp.width = rw; tmp.height = rh;
    const tc = tmp.getContext('2d');
    tc.putImageData(imgData, 0, 0);

    const out = document.createElement('canvas'); out.width = rw; out.height = rh;
    const oc = out.getContext('2d');

    const filterMap = {
      'blur': 'blur(5px)', 'sharpen': 'contrast(150%) brightness(110%)',
      'grayscale': 'grayscale(100%)', 'sepia': 'sepia(100%)',
      'invert': 'invert(100%)', 'brightness': `brightness(${obj.filterValue || 150}%)`
    };

    oc.filter = filterMap[obj.filter] || 'blur(5px)';
    oc.drawImage(tmp, 0, 0);
    oc.filter = 'none';

    this.baseCtx.drawImage(out, rx, ry);
  }

  _pixelateRegion(rx, ry, rw, rh, strength) {
    rx = Math.max(0, Math.round(rx));
    ry = Math.max(0, Math.round(ry));
    rw = Math.min(Math.round(rw), this.base.width - rx);
    rh = Math.min(Math.round(rh), this.base.height - ry);
    if (rw < 2 || rh < 2) return;

    // strength 1=light(big blocks), 2=medium, 3=heavy(tiny blocks, unreadable)
    const s = strength || 3;
    const blockSize = Math.max(2, Math.floor(Math.min(rw, rh) / (s * 8)));
    const imgData = this.baseCtx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;

    for (let by = 0; by < rh; by += blockSize) {
      for (let bx = 0; bx < rw; bx += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let py = by; py < Math.min(by + blockSize, rh); py++) {
          for (let px = bx; px < Math.min(bx + blockSize, rw); px++) {
            const i = (py * rw + px) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        for (let py = by; py < Math.min(by + blockSize, rh); py++) {
          for (let px = bx; px < Math.min(bx + blockSize, rw); px++) {
            const i = (py * rw + px) * 4;
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
          }
        }
      }
    }
    this.baseCtx.putImageData(imgData, rx, ry);
  }

  // --- Check if there are unflatted objects ---
  hasObjects() {
    return this.objects.length > 0;
  }

  // --- Export annotations as SVG string ---
  exportAsSVG(width, height) {
    const w = width || this.base.width;
    const h = height || this.base.height;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

    for (const obj of this.objects) {
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      if (obj.type === 'rect') {
        if (obj.filled) {
          svg += `<rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="${obj.color}" opacity="${obj.opacity}"/>`;
        } else {
          svg += `<rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" stroke="${obj.color}" stroke-width="${obj.lineWidth}" opacity="${obj.opacity}"/>`;
        }
      } else if (obj.type === 'arrow') {
        const headLen = 12;
        const angle = Math.atan2(obj.y2 - obj.y, obj.x2 - obj.x);
        const hx1 = obj.x2 - headLen * Math.cos(angle - Math.PI / 6);
        const hy1 = obj.y2 - headLen * Math.sin(angle - Math.PI / 6);
        const hx2 = obj.x2 - headLen * Math.cos(angle + Math.PI / 6);
        const hy2 = obj.y2 - headLen * Math.sin(angle + Math.PI / 6);
        svg += `<line x1="${obj.x}" y1="${obj.y}" x2="${obj.x2}" y2="${obj.y2}" stroke="${obj.color}" stroke-width="${obj.lineWidth}" opacity="${obj.opacity}"/>`;
        svg += `<polygon points="${obj.x2},${obj.y2} ${hx1},${hy1} ${hx2},${hy2}" fill="${obj.color}" opacity="${obj.opacity}"/>`;
      } else if (obj.type === 'text') {
        const lines = (obj.text || '').split('\n');
        const lineH = obj.fontSize * 1.3;
        lines.forEach((line, i) => {
          svg += `<text x="${obj.x + 4}" y="${obj.y + i * lineH + obj.fontSize}" fill="${obj.color}" font-size="${obj.fontSize}px" font-family="${esc(obj.fontFamily)}" font-weight="${obj.fontWeight}" opacity="${obj.opacity}">${esc(line)}</text>`;
        });
      } else if (obj.type === 'pen' || obj.type === 'highlighter') {
        if (obj.points.length >= 2) {
          let d = `M${obj.points[0].x},${obj.points[0].y}`;
          for (let i = 1; i < obj.points.length; i++) d += `L${obj.points[i].x},${obj.points[i].y}`;
          const sw = obj.type === 'highlighter' ? Math.max(obj.lineWidth * 4, 16) : obj.lineWidth;
          const op = obj.type === 'highlighter' ? 0.4 : obj.opacity;
          svg += `<path d="${d}" fill="none" stroke="${obj.color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
        }
      } else if (obj.type === 'redact') {
        svg += `<rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="#000000"/>`;
      }
    }

    svg += '</svg>';
    return svg;
  }
}

// Shared rounded rect helper for image objects
function _imgRoundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
