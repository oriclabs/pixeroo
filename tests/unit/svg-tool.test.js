// Unit tests for SVG tool utility functions

// ── prettySvg: XML formatter ──
function prettySvg(raw) {
  let result = '';
  let indent = 0;
  const xml = raw.replace(/>\s+</g, '><').replace(/\r\n?/g, '\n').trim();
  const tokens = xml.match(/<[^>]+>|[^<]+/g) || [];
  for (const token of tokens) {
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      result += '  '.repeat(indent) + token + '\n';
    } else if (token.startsWith('<') && !token.startsWith('<!') && !token.startsWith('<?')) {
      result += '  '.repeat(indent) + token + '\n';
      if (!token.endsWith('/>') && !token.startsWith('</')) indent++;
    } else if (token.startsWith('<!') || token.startsWith('<?')) {
      result += '  '.repeat(indent) + token + '\n';
    } else {
      const text = token.trim();
      if (text) result += '  '.repeat(indent) + text + '\n';
    }
  }
  return result.trimEnd();
}

// ── extractSvgColors ──
function extractSvgColors(svgStr) {
  const colors = new Set();
  const re = /(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|[a-zA-Z]+)/gi;
  let m;
  while ((m = re.exec(svgStr))) {
    const c = m[1].trim().toLowerCase();
    if (c && c !== 'none' && c !== 'inherit' && c !== 'currentcolor' && c !== 'transparent') colors.add(c);
  }
  const styleRe = /style\s*=\s*["']([^"']+)["']/gi;
  while ((m = styleRe.exec(svgStr))) {
    const inner = m[1];
    let cm;
    const innerRe = /(?:fill|stroke|stop-color|color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|[a-zA-Z]+)/gi;
    while ((cm = innerRe.exec(inner))) {
      const c = cm[1].trim().toLowerCase();
      if (c && c !== 'none' && c !== 'inherit' && c !== 'currentcolor' && c !== 'transparent') colors.add(c);
    }
  }
  return [...colors];
}

// ══════════════════════════════════════════
//  prettySvg tests
// ══════════════════════════════════════════
describe('prettySvg', () => {
  test('indents nested elements', () => {
    const input = '<svg><rect/><circle/></svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines[0]).toBe('<svg>');
    expect(lines[1]).toBe('  <rect/>');
    expect(lines[2]).toBe('  <circle/>');
    expect(lines[3]).toBe('</svg>');
  });

  test('handles self-closing tags without extra indent', () => {
    const input = '<svg><g><path d="M0 0"/></g></svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines[0]).toBe('<svg>');
    expect(lines[1]).toBe('  <g>');
    expect(lines[2]).toBe('    <path d="M0 0"/>');
    expect(lines[3]).toBe('  </g>');
    expect(lines[4]).toBe('</svg>');
  });

  test('handles deeply nested elements', () => {
    const input = '<svg><g><g><rect/></g></g></svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines[2]).toBe('    <g>');
    expect(lines[3]).toBe('      <rect/>');
  });

  test('preserves text content', () => {
    const input = '<svg><text>Hello</text></svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines[1]).toBe('  <text>');
    expect(lines[2]).toBe('    Hello');
    expect(lines[3]).toBe('  </text>');
  });

  test('preserves attributes in tags', () => {
    const input = '<svg width="100" height="100"><rect x="0" y="0"/></svg>';
    const result = prettySvg(input);
    expect(result).toContain('width="100"');
    expect(result).toContain('x="0"');
  });

  test('collapses whitespace between tags', () => {
    const input = '<svg>   \n   <rect/>   \n   </svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('<svg>');
    expect(lines[1]).toBe('  <rect/>');
  });

  test('handles XML declarations', () => {
    const input = '<?xml version="1.0"?><svg><rect/></svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines[0]).toBe('<?xml version="1.0"?>');
    expect(lines[1]).toBe('<svg>');
  });

  test('handles comments', () => {
    const input = '<svg><!-- comment --><rect/></svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines[1]).toBe('  <!-- comment -->');
  });

  test('handles empty SVG', () => {
    const input = '<svg></svg>';
    const lines = prettySvg(input).split('\n');
    expect(lines[0]).toBe('<svg>');
    expect(lines[1]).toBe('</svg>');
  });

  test('returns empty string for empty input', () => {
    expect(prettySvg('')).toBe('');
  });
});

// ══════════════════════════════════════════
//  extractSvgColors tests
// ══════════════════════════════════════════
describe('extractSvgColors', () => {
  test('extracts fill hex colors', () => {
    const svg = '<rect fill="#ff0000"/><circle fill="#00ff00"/>';
    const colors = extractSvgColors(svg);
    expect(colors).toContain('#ff0000');
    expect(colors).toContain('#00ff00');
  });

  test('extracts stroke colors', () => {
    const svg = '<path stroke="#1e293b"/>';
    expect(extractSvgColors(svg)).toContain('#1e293b');
  });

  test('extracts 3-digit hex', () => {
    const svg = '<rect fill="#f00"/>';
    expect(extractSvgColors(svg)).toContain('#f00');
  });

  test('extracts named colors', () => {
    const svg = '<rect fill="red"/><circle stroke="blue"/>';
    const colors = extractSvgColors(svg);
    expect(colors).toContain('red');
    expect(colors).toContain('blue');
  });

  test('extracts rgb colors', () => {
    const svg = '<rect fill="rgb(255,0,0)"/>';
    expect(extractSvgColors(svg)).toContain('rgb(255,0,0)');
  });

  test('extracts colors from style attributes', () => {
    const svg = '<rect style="fill:#abc123; stroke:#def456"/>';
    const colors = extractSvgColors(svg);
    expect(colors).toContain('#abc123');
    expect(colors).toContain('#def456');
  });

  test('ignores none, inherit, transparent, currentcolor', () => {
    const svg = '<rect fill="none" stroke="inherit"/><circle fill="transparent" stroke="currentColor"/>';
    expect(extractSvgColors(svg)).toHaveLength(0);
  });

  test('deduplicates colors', () => {
    const svg = '<rect fill="#f00"/><circle fill="#f00"/><path fill="#f00"/>';
    expect(extractSvgColors(svg)).toHaveLength(1);
  });

  test('returns empty array for no colors', () => {
    expect(extractSvgColors('<svg><g></g></svg>')).toHaveLength(0);
  });

  test('extracts stop-color from gradients', () => {
    const svg = '<stop stop-color="#ff9900"/>';
    expect(extractSvgColors(svg)).toContain('#ff9900');
  });
});

// ══════════════════════════════════════════
//  Trace file validation tests
// ══════════════════════════════════════════
describe('trace file validation', () => {
  function isTraceableFile(file) {
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) return false;
    return true;
  }

  test('rejects SVG by mime type', () => {
    expect(isTraceableFile({ type: 'image/svg+xml', name: 'icon.svg' })).toBe(false);
  });

  test('rejects SVG by extension', () => {
    expect(isTraceableFile({ type: '', name: 'drawing.SVG' })).toBe(false);
  });

  test('accepts PNG', () => {
    expect(isTraceableFile({ type: 'image/png', name: 'photo.png' })).toBe(true);
  });

  test('accepts JPEG', () => {
    expect(isTraceableFile({ type: 'image/jpeg', name: 'photo.jpg' })).toBe(true);
  });

  test('accepts WebP', () => {
    expect(isTraceableFile({ type: 'image/webp', name: 'photo.webp' })).toBe(true);
  });

  test('accepts BMP', () => {
    expect(isTraceableFile({ type: 'image/bmp', name: 'photo.bmp' })).toBe(true);
  });

  test('accepts GIF', () => {
    expect(isTraceableFile({ type: 'image/gif', name: 'anim.gif' })).toBe(true);
  });

  test('accepts TIFF', () => {
    expect(isTraceableFile({ type: 'image/tiff', name: 'scan.tiff' })).toBe(true);
  });
});
