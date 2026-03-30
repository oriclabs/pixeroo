// Unit tests for pipeline resize as operation

// Simulate pipeline setExportSize logic (extracted for testing)
function createPipeline(origW, origH) {
  return {
    originalWidth: origW,
    originalHeight: origH,
    exportWidth: origW,
    exportHeight: origH,
    operations: [],
    undoneOps: [],

    setExportSize(w, h) {
      this.operations = this.operations.filter(op => op.type !== 'resize');
      if (w !== this.originalWidth || h !== this.originalHeight) {
        this.operations.push({ type: 'resize', w, h });
      }
      this.undoneOps = [];
    },

    addOperation(op) {
      this.operations.push(op);
      this.undoneOps = [];
    },

    undo() {
      if (this.operations.length === 0) return;
      this.undoneOps.push(this.operations.pop());
    },

    redo() {
      if (this.undoneOps.length === 0) return;
      this.operations.push(this.undoneOps.pop());
    },

    resetAll() {
      this.operations = [];
      this.undoneOps = [];
      this.exportWidth = this.originalWidth;
      this.exportHeight = this.originalHeight;
    },
  };
}

describe('Pipeline resize as operation', () => {
  test('setExportSize adds resize operation', () => {
    const p = createPipeline(800, 600);
    p.setExportSize(400, 300);
    expect(p.operations).toHaveLength(1);
    expect(p.operations[0]).toEqual({ type: 'resize', w: 400, h: 300 });
  });

  test('setExportSize to original removes resize op', () => {
    const p = createPipeline(800, 600);
    p.setExportSize(400, 300);
    expect(p.operations).toHaveLength(1);
    p.setExportSize(800, 600); // back to original
    expect(p.operations).toHaveLength(0);
  });

  test('setExportSize replaces existing resize (no stacking)', () => {
    const p = createPipeline(800, 600);
    p.setExportSize(400, 300);
    p.setExportSize(200, 150);
    expect(p.operations).toHaveLength(1);
    expect(p.operations[0]).toEqual({ type: 'resize', w: 200, h: 150 });
  });

  test('resize is undoable', () => {
    const p = createPipeline(800, 600);
    p.setExportSize(400, 300);
    expect(p.operations).toHaveLength(1);
    p.undo();
    expect(p.operations).toHaveLength(0);
    expect(p.undoneOps).toHaveLength(1);
  });

  test('resize is redoable', () => {
    const p = createPipeline(800, 600);
    p.setExportSize(400, 300);
    p.undo();
    expect(p.operations).toHaveLength(0);
    p.redo();
    expect(p.operations).toHaveLength(1);
    expect(p.operations[0]).toEqual({ type: 'resize', w: 400, h: 300 });
  });

  test('resize respects operation order with other ops', () => {
    const p = createPipeline(800, 600);
    p.addOperation({ type: 'rotate', degrees: 90 });
    p.setExportSize(400, 300);
    // resize replaces only resize ops, not rotate
    expect(p.operations).toHaveLength(2);
    expect(p.operations[0].type).toBe('rotate');
    expect(p.operations[1].type).toBe('resize');
  });

  test('setExportSize clears undo stack', () => {
    const p = createPipeline(800, 600);
    p.addOperation({ type: 'rotate', degrees: 90 });
    p.undo(); // rotate is now in undoneOps
    expect(p.undoneOps).toHaveLength(1);
    p.setExportSize(400, 300);
    expect(p.undoneOps).toHaveLength(0); // cleared
  });

  test('undo resize after crop preserves crop', () => {
    const p = createPipeline(800, 600);
    p.addOperation({ type: 'crop', x: 0.1, y: 0.1, w: 0.5, h: 0.5 });
    p.setExportSize(400, 300);
    expect(p.operations).toHaveLength(2);
    p.undo(); // undo resize
    expect(p.operations).toHaveLength(1);
    expect(p.operations[0].type).toBe('crop'); // crop preserved
  });

  test('resetAll removes all operations including resize', () => {
    const p = createPipeline(800, 600);
    p.addOperation({ type: 'rotate', degrees: 90 });
    p.setExportSize(400, 300);
    p.addOperation({ type: 'flip', direction: 'h' });
    expect(p.operations).toHaveLength(3);
    p.resetAll();
    expect(p.operations).toHaveLength(0);
    expect(p.undoneOps).toHaveLength(0);
  });

  test('multiple resize calls only keep last', () => {
    const p = createPipeline(1920, 1080);
    p.setExportSize(1280, 720);
    p.setExportSize(800, 450);
    p.setExportSize(640, 360);
    expect(p.operations).toHaveLength(1);
    expect(p.operations[0].w).toBe(640);
    expect(p.operations[0].h).toBe(360);
  });
});
