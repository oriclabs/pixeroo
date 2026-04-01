// Unit tests for batchFilename pattern

function batchFilename(bf, index, w, h, ext) {
  const pattern = bf.pattern || '{name}';
  const baseName = bf.file.name.replace(/\.[^.]+$/, '');
  const origExt = bf.file.name.split('.').pop();
  const date = new Date().toISOString().slice(0, 10);
  return pattern
    .replace(/\{name\}/g, baseName)
    .replace(/\{index\}/g, String(index + 1).padStart(3, '0'))
    .replace(/\{i\}/g, String(index + 1))
    .replace(/\{date\}/g, date)
    .replace(/\{w\}/g, w)
    .replace(/\{h\}/g, h)
    .replace(/\{ext\}/g, origExt)
    + '.' + ext;
}

describe('batchFilename', () => {
  const mockFile = (name) => ({ file: { name }, pattern: '{name}' });
  const today = new Date().toISOString().slice(0, 10);

  // ── Basic patterns ──
  test('default pattern uses original name', () => {
    const bf = mockFile('photo.jpg');
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe('photo.png');
  });

  test('{index} pads to 3 digits', () => {
    const bf = { ...mockFile('img.png'), pattern: 'file-{index}' };
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe('file-001.png');
    expect(batchFilename(bf, 9, 800, 600, 'png')).toBe('file-010.png');
    expect(batchFilename(bf, 99, 800, 600, 'png')).toBe('file-100.png');
  });

  test('{i} uses unpadded index', () => {
    const bf = { ...mockFile('img.png'), pattern: 'file-{i}' };
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe('file-1.png');
    expect(batchFilename(bf, 9, 800, 600, 'png')).toBe('file-10.png');
  });

  test('{date} inserts today', () => {
    const bf = { ...mockFile('img.png'), pattern: '{name}-{date}' };
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe(`img-${today}.png`);
  });

  test('{w} and {h} insert dimensions', () => {
    const bf = { ...mockFile('img.png'), pattern: '{name}-{w}x{h}' };
    expect(batchFilename(bf, 0, 1920, 1080, 'jpg')).toBe('img-1920x1080.jpg');
  });

  test('{ext} inserts original extension', () => {
    const bf = { ...mockFile('photo.jpeg'), pattern: '{name}-original-{ext}' };
    expect(batchFilename(bf, 0, 800, 600, 'webp')).toBe('photo-original-jpeg.webp');
  });

  // ── Complex patterns ──
  test('complex pattern with multiple tokens', () => {
    const bf = { ...mockFile('vacation.jpg'), pattern: '{date}-{name}-{index}-{w}x{h}' };
    expect(batchFilename(bf, 4, 640, 480, 'png')).toBe(`${today}-vacation-005-640x480.png`);
  });

  test('all tokens combined', () => {
    const bf = { ...mockFile('photo.png'), pattern: '{date}_{name}_{index}_{i}_{w}x{h}_{ext}' };
    expect(batchFilename(bf, 2, 800, 600, 'jpg')).toBe(`${today}_photo_003_3_800x600_png.jpg`);
  });

  // ── Extension handling ──
  test('strips extension from name correctly', () => {
    const bf = mockFile('my.photo.final.png');
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe('my.photo.final.png');
  });

  test('handles filename with no extension', () => {
    const bf = mockFile('noext');
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe('noext.png');
  });

  test('handles filename with dots', () => {
    const bf = { ...mockFile('image.v2.final.jpg'), pattern: '{name}-{index}' };
    expect(batchFilename(bf, 0, 800, 600, 'webp')).toBe('image.v2.final-001.webp');
  });

  // ── Unique token enforcement ──
  test('pattern without unique token gets {index} appended', () => {
    const bf = { ...mockFile('img.png'), pattern: 'photo-{date}' };
    const effective = bf.pattern + '-{index}';
    bf.pattern = effective;
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe(`photo-${today}-001.png`);
    expect(batchFilename(bf, 4, 800, 600, 'png')).toBe(`photo-${today}-005.png`);
  });

  test('static pattern with auto-appended index produces unique names', () => {
    const bf = { ...mockFile('a.jpg'), pattern: 'output-{index}' };
    const names = [0, 1, 2].map(i => batchFilename(bf, i, 800, 600, 'jpg'));
    expect(names[0]).toBe('output-001.jpg');
    expect(names[1]).toBe('output-002.jpg');
    expect(names[2]).toBe('output-003.jpg');
    expect(new Set(names).size).toBe(3);
  });

  test('pattern with {name} does not need index', () => {
    const bf = mockFile('sunset.jpg');
    expect(batchFilename(bf, 0, 800, 600, 'webp')).toBe('sunset.webp');
  });

  test('empty pattern falls back to {name}', () => {
    const bf = { ...mockFile('test.png'), pattern: '{name}' };
    expect(batchFilename(bf, 0, 400, 300, 'png')).toBe('test.png');
  });

  // ── Output format variations ──
  test('png output', () => {
    const bf = mockFile('img.jpg');
    expect(batchFilename(bf, 0, 100, 100, 'png')).toBe('img.png');
  });

  test('jpeg output', () => {
    const bf = mockFile('img.png');
    expect(batchFilename(bf, 0, 100, 100, 'jpg')).toBe('img.jpg');
  });

  test('webp output', () => {
    const bf = mockFile('img.bmp');
    expect(batchFilename(bf, 0, 100, 100, 'webp')).toBe('img.webp');
  });

  // ── Edge cases ──
  test('large index number', () => {
    const bf = { ...mockFile('img.png'), pattern: 'file-{index}' };
    expect(batchFilename(bf, 999, 800, 600, 'png')).toBe('file-1000.png');
  });

  test('zero dimensions', () => {
    const bf = { ...mockFile('img.png'), pattern: '{name}-{w}x{h}' };
    expect(batchFilename(bf, 0, 0, 0, 'png')).toBe('img-0x0.png');
  });

  test('very long filename', () => {
    const longName = 'a'.repeat(200) + '.png';
    const bf = mockFile(longName);
    const result = batchFilename(bf, 0, 800, 600, 'png');
    expect(result).toBe('a'.repeat(200) + '.png');
  });

  test('special characters in filename preserved', () => {
    const bf = mockFile('photo (1)-copy.jpg');
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe('photo (1)-copy.png');
  });

  test('multiple same tokens', () => {
    const bf = { ...mockFile('img.png'), pattern: '{name}-{name}-{index}' };
    expect(batchFilename(bf, 0, 800, 600, 'png')).toBe('img-img-001.png');
  });
});
