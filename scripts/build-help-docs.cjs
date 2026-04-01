// Generate help documentation pages for website/help/
// Run: node scripts/build-help-docs.cjs

const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '../website/help');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function page(title, slug, content, nav) {
  const navLinks = nav.map(n =>
    `<a href="${n.slug}.html" class="nav-item${n.slug === slug ? ' active' : ''}">${n.title}</a>`
  ).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Gazo Help</title>
  <meta name="description" content="Gazo help: ${title}. Free offline image toolkit.">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config={theme:{extend:{colors:{saffron:{400:'#F4C430',500:'#D4A017',600:'#B8860B',950:'#2A1E05'}},fontFamily:{sans:['Inter','system-ui','sans-serif']}}}}</script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { display: flex; min-height: 100vh; }
    .sidebar { width: 220px; flex-shrink: 0; border-right: 1px solid #1e293b; padding: 1.5rem 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    .sidebar-title { padding: 0 1.25rem; font-size: 1rem; font-weight: 700; color: #F4C430; margin-bottom: 1rem; }
    .sidebar-section { padding: 0 1.25rem; font-size: 0.65rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 1rem; margin-bottom: 0.25rem; }
    .nav-item { display: block; padding: 0.375rem 1.25rem; font-size: 0.8125rem; color: #94a3b8; text-decoration: none; border-left: 3px solid transparent; transition: all 0.12s; }
    .nav-item:hover { color: #e2e8f0; background: #0f172a; }
    .nav-item.active { color: #F4C430; border-left-color: #F4C430; background: rgba(244,196,48,0.03); }
    .content { flex: 1; padding: 2rem 3rem; max-width: 800px; overflow-y: auto; }
    .content h1 { font-size: 1.75rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.5rem; }
    .content h2 { font-size: 1.25rem; font-weight: 600; color: #F4C430; margin-top: 2rem; margin-bottom: 0.75rem; padding-top: 1.5rem; border-top: 1px solid #1e293b; }
    .content h3 { font-size: 1rem; font-weight: 600; color: #e2e8f0; margin-top: 1.25rem; margin-bottom: 0.5rem; }
    .content p { font-size: 0.9rem; color: #94a3b8; line-height: 1.75; margin-bottom: 0.75rem; }
    .content ul, .content ol { margin: 0 0 1rem; padding-left: 1.25rem; }
    .content li { font-size: 0.9rem; color: #94a3b8; line-height: 1.75; margin-bottom: 0.25rem; }
    .content strong { color: #e2e8f0; }
    .content code { background: #1e293b; padding: 1px 5px; border-radius: 3px; font-size: 0.85rem; color: #e2e8f0; }
    .content kbd { background: #1e293b; border: 1px solid #334155; padding: 1px 6px; border-radius: 4px; font-size: 0.8rem; font-family: monospace; color: #e2e8f0; }
    .content table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
    .content th { text-align: left; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #64748b; border-bottom: 1px solid #1e293b; }
    .content td { padding: 0.5rem 0.75rem; font-size: 0.85rem; color: #94a3b8; border-bottom: 1px solid #1e293b; }
    .screenshot { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 2rem; text-align: center; color: #64748b; font-size: 0.8rem; margin: 1rem 0; min-height: 200px; display: flex; align-items: center; justify-content: center; }
    .fg { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0.75rem 0; }
    .fi { background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; color: #94a3b8; }
    .fi strong { color: #F4C430; }
    @media (max-width: 700px) { body { flex-direction: column; } .sidebar { width: 100%; height: auto; position: static; display: flex; flex-wrap: wrap; padding: 0.75rem; gap: 0.25rem; border-right: none; border-bottom: 1px solid #1e293b; } .sidebar-title { width: 100%; } .sidebar-section { width: 100%; } .content { padding: 1.5rem; } .fg { grid-template-columns: 1fr; } }
  </style>
  <style>.light{background:#f8fafc!important;color:#1e293b!important}.light .sidebar{border-color:#e2e8f0;background:#f8fafc}.light .nav-item{color:#64748b}.light .nav-item:hover{background:#f1f5f9;color:#0f172a}.light .nav-item.active{color:#D4A017;background:rgba(244,196,48,0.05)}.light .content h1{color:#0f172a}.light .content h2{color:#D4A017;border-color:#e2e8f0}.light .content h3{color:#1e293b}.light .content p,.light .content li,.light .content td{color:#475569}.light .content strong{color:#0f172a}.light .content code,.light .content kbd{background:#f1f5f9;border-color:#e2e8f0;color:#0f172a}.light .content th{color:#94a3b8;border-color:#e2e8f0}.light .content td{border-color:#e2e8f0}.light .screenshot{background:#f1f5f9;border-color:#e2e8f0;color:#94a3b8}.light .fi{background:#f8fafc;border-color:#e2e8f0;color:#475569}.light .fi strong{color:#B8860B}.theme-btn{background:none;border:1px solid rgba(148,163,184,0.3);border-radius:6px;padding:4px;cursor:pointer;color:inherit;display:flex;align-items:center}.theme-btn:hover{border-color:#F4C430;color:#F4C430}</style>
  <script>if(localStorage.getItem("gazo-theme")==="light")document.documentElement.classList.add("light")</script>
</head>
<body class="bg-slate-950 text-gray-100 font-sans">
  <nav class="sidebar">
    <div class="sidebar-title"><a href="../index.html" style="color:#F4C430;text-decoration:none;">Gazo</a> Help</div>
    <div class="sidebar-section">Overview</div>
        ${navLinks}
  </nav>
  <main class="content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <a href="../index.html" style="color:#64748b;font-size:0.8rem;text-decoration:none;">&larr; Back to Gazo</a>
      <button id="theme-toggle" class="theme-btn" title="Toggle theme"><svg id="ti-d" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><svg id="ti-l" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
    </div>
    ${content}
  </main>
  <script>const tg=document.getElementById("theme-toggle"),id=document.getElementById("ti-d"),il=document.getElementById("ti-l");function ui(){const l=document.documentElement.classList.contains("light");if(id)id.style.display=l?"none":"block";if(il)il.style.display=l?"block":"none"}ui();tg&&tg.addEventListener("click",()=>{document.documentElement.classList.toggle("light");localStorage.setItem("gazo-theme",document.documentElement.classList.contains("light")?"light":"dark");ui()})</script>
</body>
</html>`;
}

function screenshot(name) {
  return `<div class="screenshot">[Screenshot: ${name}]<br><small>Placeholder — captured during E2E tests</small></div>`;
}

// ── Navigation ──
const nav = [
  { title: 'Getting Started', slug: 'index' },
  { title: 'Popup', slug: 'popup' },
  { title: 'Side Panel', slug: 'sidepanel' },
  { title: 'Edit', slug: 'edit' },
  { title: 'Convert', slug: 'convert' },
  { title: 'Batch Edit', slug: 'batch' },
  { title: 'Compress', slug: 'compress' },
  { title: 'Social Media', slug: 'social' },
  { title: 'Collage', slug: 'collage' },
  { title: 'Draw', slug: 'draw' },
  { title: 'QR Code', slug: 'qr' },
  { title: 'Info', slug: 'info' },
  { title: 'Colors', slug: 'colors' },
  { title: 'SVG Tools', slug: 'svg' },
  { title: 'Compare', slug: 'compare' },
  { title: 'Generate', slug: 'generate' },
  { title: 'Showcase', slug: 'showcase' },
  { title: 'Meme', slug: 'meme' },
  { title: 'Watermark', slug: 'watermark' },
  { title: 'Callout', slug: 'callout' },
  { title: 'GIF Creator', slug: 'gif' },
  { title: 'Certificate', slug: 'certificate' },
  { title: 'Store Assets', slug: 'store' },
  { title: 'Font Manager', slug: 'fonts' },
  { title: 'Library', slug: 'library' },
  { title: 'Shortcuts', slug: 'shortcuts' },
  { title: 'FAQ', slug: 'faq' },
  { title: 'PWA', slug: 'pwa' },
];

// ── Pages ──
const pages = {
  index: { title: 'Getting Started', content: `
<h1>Gazo Help</h1>
<p><strong>Grab. Alter. Zone. Output.</strong> — Image tools, offline.</p>
<p>Gazo is a free offline image toolkit with 20 tools. It runs as a browser extension (Chrome, Edge, Firefox) and as a Progressive Web App. Everything happens on your device — no uploads, no tracking, no accounts.</p>
${screenshot('home-screen')}
<h2>How to Access</h2>
<ul>
<li><strong>Popup</strong> — click the Gazo icon in your browser toolbar for quick actions</li>
<li><strong>Side Panel</strong> — press <kbd>Alt+P</kbd> to browse images on any page</li>
<li><strong>Toolkit</strong> — click "Toolkit" in the popup or open the editor tab directly</li>
<li><strong>Right-click</strong> — right-click any image for context menu actions</li>
</ul>
<h2>Core Principles</h2>
<ul>
<li><strong>100% Offline</strong> — zero network requests, works on flights</li>
<li><strong>Private</strong> — no data leaves your device, ever</li>
<li><strong>No Account</strong> — no signup, no login, no tracking</li>
<li><strong>Lightweight</strong> — minimal permissions, fast startup</li>
</ul>
<h2>All Tools</h2>
<div class="fg">
<div class="fi"><strong>Edit</strong> — Resize, crop, rotate, adjust, filters, annotate</div>
<div class="fi"><strong>Convert</strong> — Batch format conversion</div>
<div class="fi"><strong>Batch Edit</strong> — Process multiple images</div>
<div class="fi"><strong>Compress</strong> — Reduce file size</div>
<div class="fi"><strong>Social Media</strong> — Platform-specific resize</div>
<div class="fi"><strong>Collage</strong> — Freeform canvas composition</div>
<div class="fi"><strong>Draw</strong> — Blank canvas drawing board</div>
<div class="fi"><strong>QR Code</strong> — Generate, customize, read</div>
<div class="fi"><strong>Info</strong> — EXIF, metadata, hash</div>
<div class="fi"><strong>Colors</strong> — Eyedropper, palette</div>
<div class="fi"><strong>SVG Tools</strong> — Inspect, trace</div>
<div class="fi"><strong>Compare</strong> — Pixel diff, slider</div>
<div class="fi"><strong>Generate</strong> — Gradients, patterns</div>
<div class="fi"><strong>Showcase</strong> — Screenshot mockups</div>
<div class="fi"><strong>Meme</strong> — Top/bottom text</div>
<div class="fi"><strong>Watermark</strong> — Text/logo overlay</div>
<div class="fi"><strong>Callout</strong> — Speech bubbles, labels</div>
<div class="fi"><strong>GIF Creator</strong> — Animated GIFs</div>
<div class="fi"><strong>Certificate</strong> — Diplomas, badges</div>
<div class="fi"><strong>Store Assets</strong> — App store icons</div>
</div>
` },

  popup: { title: 'Popup', content: `
<h1>Popup</h1>
<p>Click the Gazo icon in your browser toolbar to open the popup.</p>
${screenshot('popup')}
<h2>Quick Actions</h2>
<ul>
<li><strong>Screenshot</strong> — capture the visible tab and open in editor</li>
<li><strong>Region</strong> — select a region on the page to capture</li>
<li><strong>Pick Color</strong> — open side panel with eyedropper</li>
<li><strong>Paste</strong> — open editor with clipboard image</li>
<li><strong>Library</strong> — open your saved image library</li>
<li><strong>Draw</strong> — open blank drawing canvas</li>
</ul>
<h2>QR Code</h2>
<p>The popup automatically generates a QR code for the current page URL. Click "Copy" to copy it to clipboard.</p>
<h2>Settings</h2>
<p>Click the gear icon for quick settings: theme, default export format, QR error correction, panel view mode. "Advanced Settings" opens the full settings page.</p>
<h2>FAQ & Help</h2>
<p>The <strong>?</strong> button opens the FAQ page. The <strong>i</strong> button opens full help.</p>
` },

  sidepanel: { title: 'Side Panel', content: `
<h1>Side Panel</h1>
<p>Open the side panel with <kbd>Alt+P</kbd> or via the popup's "Page Images" button. It opens alongside any web page.</p>
${screenshot('sidepanel-page-tab')}
<h2>Tabs</h2>
<h3>Page Images</h3>
<ul>
<li>5 view modes: Tiles, Medium, Large, Details, Names</li>
<li>Filter by type (JPEG, PNG, WebP, SVG, GIF, AVIF, BMP, ICO)</li>
<li>Sort by page order, size, dimensions, type, or name</li>
<li>Click any image for an overlay with full info and download</li>
<li>Select multiple images and batch download as ZIP</li>
<li>Save images to Library</li>
</ul>
${screenshot('sidepanel-overlay')}
<h3>Page Colors</h3>
<ul>
<li>Colors extracted from the page's CSS and images</li>
<li>HEX, RGB values</li>
<li>Click to copy</li>
<li>Contrast checker (WCAG)</li>
</ul>
<h3>My Library</h3>
<ul>
<li>Images persist across sessions (IndexedDB)</li>
<li>Search, filter, sort your saved images</li>
<li>Open in editor or other tools</li>
<li>Delete or export</li>
</ul>
<h2>Quick Actions</h2>
<p>Screenshot, Region capture, Edit, Convert, QR — all accessible from the quick actions bar.</p>
` },

  edit: { title: 'Edit', content: `
<h1>Image Editor</h1>
<p>Non-destructive editing — your original image is never modified. All operations stack and can be undone.</p>
${screenshot('edit-loaded')}
<h2>Getting Started</h2>
<ol>
<li>Drop an image, click to browse, or press <kbd>Ctrl+V</kbd> to paste</li>
<li>Ribbon toolbar activates when an image loads</li>
<li>Press <kbd>Ctrl+Z</kbd> to undo any operation</li>
</ol>
<h2>Features</h2>
<table>
<tr><th>Feature</th><th>Description</th></tr>
<tr><td><strong>Resize</strong></td><td>Non-destructive, from original. Slider or exact px/% input. Objects scale proportionally.</td></tr>
<tr><td><strong>Crop</strong></td><td>Free, ratio presets (1:1, 4:3, 16:9), or smart auto-crop.</td></tr>
<tr><td><strong>Rotate/Flip</strong></td><td>90° steps, horizontal/vertical flip.</td></tr>
<tr><td><strong>Adjust</strong></td><td>Brightness, Contrast, Saturation, Hue sliders.</td></tr>
<tr><td><strong>Filters</strong></td><td>Grayscale, Sepia, Invert, Blur, Sharpen.</td></tr>
<tr><td><strong>Draw</strong></td><td>Rectangle, Ellipse, Arrow, Curved Arrow, Text, Pen, Highlighter, Redact.</td></tr>
<tr><td><strong>Effects</strong></td><td>Vignette, Denoise, Pixelate, Round corners.</td></tr>
<tr><td><strong>Export</strong></td><td>PNG, JPEG, WebP, BMP, SVG trace.</td></tr>
</table>
${screenshot('edit-drawing-objects')}
<h2>Drawing Objects</h2>
<p>Objects are selectable, movable, and resizable. The <strong>curved arrow</strong> has a draggable control point for bending. When you resize the image, objects scale proportionally.</p>
<h2>Reset & Clear</h2>
<ul>
<li><strong>Reset All</strong> — reverts all edits, keeps the image loaded</li>
<li><strong>Clear</strong> — unloads the image entirely, returns to the drop zone</li>
</ul>
<h2>Keyboard Shortcuts</h2>
<table>
<tr><th>Action</th><th>Key</th></tr>
<tr><td>Undo</td><td><kbd>Ctrl+Z</kbd></td></tr>
<tr><td>Redo</td><td><kbd>Ctrl+Y</kbd></td></tr>
<tr><td>Export</td><td><kbd>Ctrl+S</kbd></td></tr>
<tr><td>Ruler</td><td><kbd>R</kbd></td></tr>
<tr><td>Grid</td><td><kbd>G</kbd></td></tr>
<tr><td>Center</td><td><kbd>C</kbd></td></tr>
<tr><td>History</td><td><kbd>H</kbd></td></tr>
</table>
` },

  convert: { title: 'Convert', content: `
<h1>Format Conversion</h1>
<p>Convert between PNG, JPEG, WebP, BMP, and more. Each file gets its own row with individual format, quality, and size controls.</p>
${screenshot('convert-table')}
<h2>Workflow</h2>
<ol>
<li>Drop images or click Add</li>
<li>Each file shows source format, dimensions, and size</li>
<li>Best alternative format auto-selected (e.g. PNG → WebP)</li>
<li>Click Convert All to download (ZIP for multiple files)</li>
</ol>
<h2>Features</h2>
<ul>
<li><strong>Per-file format</strong> — different output per image</li>
<li><strong>Quality slider</strong> — for JPEG/WebP</li>
<li><strong>Strip EXIF</strong> — remove metadata for privacy</li>
<li><strong>Preview</strong> — click eye icon for live preview</li>
<li><strong>Rename</strong> — pattern-based: {name}, {index}, {fmt}</li>
</ul>
<h2>Supported Formats</h2>
<table>
<tr><th>Format</th><th>Read</th><th>Write</th></tr>
<tr><td>PNG</td><td>✓</td><td>✓</td></tr>
<tr><td>JPEG</td><td>✓</td><td>✓</td></tr>
<tr><td>WebP</td><td>✓</td><td>✓</td></tr>
<tr><td>BMP</td><td>✓</td><td>✓</td></tr>
<tr><td>GIF</td><td>✓</td><td>—</td></tr>
<tr><td>TIFF</td><td>✓</td><td>—</td></tr>
<tr><td>ICO</td><td>✓</td><td>—</td></tr>
</table>
` },

  batch: { title: 'Batch Edit', content: `
<h1>Batch Processing</h1>
<p>Process multiple images with the same settings. Checkboxes to select/deselect individual files.</p>
${screenshot('batch-mixed-files-loaded')}
<h2>Features</h2>
<div class="fg">
<div class="fi"><strong>Resize</strong> — Width/height with lock ratio, multi-size export</div>
<div class="fi"><strong>Pipeline Import</strong> — Apply Edit tool operations to all</div>
<div class="fi"><strong>Filter</strong> — Grayscale, Sepia, Sharpen, Blur, Invert</div>
<div class="fi"><strong>Watermark</strong> — 5 modes, custom font (B/I), color, opacity</div>
<div class="fi"><strong>Format</strong> — PNG, JPEG, WebP, Original + quality slider</div>
<div class="fi"><strong>Rename</strong> — Pattern: {name} {index} {date} {w} {h} {ext}</div>
<div class="fi"><strong>Target Size</strong> — Auto-adjust quality to hit KB limit</div>
<div class="fi"><strong>ZIP Export</strong> — Bundle all into one download</div>
<div class="fi"><strong>Presets</strong> — Save/load settings</div>
<div class="fi"><strong>LQIP</strong> — Lazy-load placeholders</div>
</div>
${screenshot('batch-preview')}
<h2>Rename Patterns</h2>
<p>If your pattern has no unique token like <code>{name}</code> or <code>{index}</code>, the tool auto-appends <code>-{index}</code> to prevent overwrites. A warning is shown.</p>
` },

  compress: { title: 'Compress', content: `
<h1>Image Compressor</h1>
<p>Reduce file size with live quality preview. See compression artifacts before downloading.</p>
${screenshot('compress-side-by-side')}
<h2>Features</h2>
<ul>
<li><strong>Side-by-side</strong> — original vs compressed, click to enlarge at full resolution</li>
<li><strong>Format</strong> — JPEG, WebP (lossy), PNG (lossless). Auto-selects best format.</li>
<li><strong>Quality slider</strong> — 10–100%, live preview updates</li>
<li><strong>Resize</strong> — cap max dimension before compressing</li>
<li><strong>Target size</strong> — set KB limit, auto-finds right quality</li>
<li><strong>Compare Formats</strong> — table of all formats at 7 quality levels</li>
<li><strong>Same-format warning</strong> — warns when output matches source (e.g. PNG→PNG)</li>
</ul>
<h2>Tips</h2>
<ul>
<li>WebP is usually 25–35% smaller than JPEG at same quality</li>
<li>Resizing a 4000px photo to 1920px saves more than any quality slider</li>
<li>Quality is in the filename: <code>photo-compressed-80q.jpg</code></li>
<li>SVG files cannot be compressed — use the SVG tool instead</li>
</ul>
` },

  social: { title: 'Social Media', content: `
<h1>Social Media Resizer</h1>
<p>Resize images for 21 social platform presets with visual guidelines, safe zones, and platform mockup previews.</p>
${screenshot('social-frame-guidelines')}
<h2>Platforms</h2>
<p>Twitter/X, Instagram, Facebook, LinkedIn, YouTube, Pinterest, TikTok, Discord — posts, headers, profiles, stories, thumbnails, banners.</p>
<h2>Visual Guidelines</h2>
<ul>
<li>Select a platform to see the target shape on the dropzone</li>
<li><strong>Image bigger</strong> — drag the crop frame to choose focus</li>
<li><strong>Image smaller</strong> — drag the image to position inside the frame</li>
<li><strong>Safe zone</strong> — green dashed area where platform UI won't clip</li>
<li>Resolution warning with fit mode suggestions</li>
</ul>
<h2>Fit Modes</h2>
<table>
<tr><th>Mode</th><th>Behavior</th></tr>
<tr><td>Cover (crop)</td><td>Scales to fill, crops excess</td></tr>
<tr><td>Contain (fit)</td><td>Fits inside with background color</td></tr>
<tr><td>Original size</td><td>Places at real pixel size, fills remaining</td></tr>
<tr><td>Stretch</td><td>Distorts to exact dimensions</td></tr>
</table>
${screenshot('social-mockup-preview')}
<h2>Platform Mockup</h2>
<p>After generating, see how your image looks in context: Instagram feed, YouTube search result, Twitter post, phone frame for stories, circular crop for profiles.</p>
` },

  collage: { title: 'Collage', content: `
<h1>Freeform Collage</h1>
<p>Drag-and-drop canvas. Place, resize, rotate, layer, and blend images freely.</p>
${screenshot('collage-layout')}
<h2>Features</h2>
<div class="fg">
<div class="fi"><strong>Arrange</strong> — Grid, Row, Col, Stack</div>
<div class="fi"><strong>Blend Modes</strong> — 16 modes per image</div>
<div class="fi"><strong>Edge Fades</strong> — Independent L/R/T/B</div>
<div class="fi"><strong>Join Blend</strong> — Auto-fade at seams</div>
<div class="fi"><strong>Smart Snap</strong> — Align to edges/centers</div>
<div class="fi"><strong>Alignment</strong> — L/R/T/B/Center/Distribute</div>
<div class="fi"><strong>Group</strong> — Ctrl+G / Ctrl+Shift+G</div>
<div class="fi"><strong>Text</strong> — Add text on canvas</div>
</div>
` },

  draw: { title: 'Draw', content: `
<h1>Drawing Board</h1>
<p>Blank canvas for quick sketches, diagrams, wireframes, and annotations. No image needed.</p>
${screenshot('draw-canvas')}
<h2>Tools</h2>
<table>
<tr><th>Tool</th><th>Description</th></tr>
<tr><td>Select</td><td>Click to select, drag to move, handles to resize</td></tr>
<tr><td>Rectangle</td><td>Drag to create. Fill toggle for solid shapes</td></tr>
<tr><td>Ellipse</td><td>Drag to create circles/ellipses</td></tr>
<tr><td>Arrow</td><td>Straight arrow from start to end</td></tr>
<tr><td>Curved Arrow</td><td>Bezier curve with draggable control point</td></tr>
<tr><td>Text</td><td>Click to place, B/I/U, custom fonts</td></tr>
<tr><td>Pen</td><td>Freehand drawing</td></tr>
<tr><td>Highlighter</td><td>Semi-transparent yellow</td></tr>
</table>
<h2>Features</h2>
<ul>
<li><strong>Images</strong> — add from file or Library as movable objects</li>
<li><strong>Undo/Redo</strong> — Ctrl+Z / Ctrl+Y (50 levels)</li>
<li><strong>Duplicate</strong> — Ctrl+D</li>
<li><strong>Layer order</strong> — bring forward / send backward</li>
<li><strong>Grid</strong> — toggle alignment grid</li>
<li><strong>Line styles</strong> — solid, dashed, dotted</li>
<li><strong>Background</strong> — solid color, transparent, or reference image (30% opacity)</li>
<li><strong>Export</strong> — PNG, JPEG, WebP, or copy to clipboard</li>
</ul>
` },

  qr: { title: 'QR Code', content: `
<h1>QR Code</h1>
<p>Generate, customize, and read QR codes. All controls in the Generate panel — no ribbon.</p>
${screenshot('qr-generated')}
<h2>Generate</h2>
<ol>
<li>Type content — QR updates live as you type</li>
<li>Pick a preset (URL, WiFi, Email, Phone, vCard, SMS, Geo, Event)</li>
<li>Content type auto-detected with validation</li>
<li>Adjust style, colors, logo</li>
</ol>
<h2>Customization</h2>
<ul>
<li><strong>Dot styles</strong> — Square, Rounded, Dots</li>
<li><strong>Colors</strong> — FG/BG + optional gradient</li>
<li><strong>Logo</strong> — center logo or background image</li>
<li><strong>Error correction</strong> — Low to High (auto High with logo)</li>
<li><strong>Compact mode</strong> — smallest possible QR</li>
</ul>
<h2>Read QR</h2>
<p>Switch to Read tab, drop an image. Content extracted with Copy/Use buttons. Clear to scan another.</p>
<h2>Export</h2>
<ul>
<li>PNG or SVG download</li>
<li>Copy image or raw text to clipboard</li>
<li>4 sizes (128, 256, 512, 1024px) as ZIP</li>
<li>Bulk: paste multiple URLs, download all as ZIP</li>
</ul>
` },

  info: { title: 'Info', content: `
<h1>Image Info</h1>
<p>Drop any image to inspect its full metadata.</p>
${screenshot('info-exif-jpeg')}
<h2>What It Shows</h2>
<div class="fg">
<div class="fi"><strong>File info</strong> — Name, type, size, dimensions, ratio</div>
<div class="fi"><strong>EXIF</strong> — Camera, lens, ISO, aperture, date, GPS</div>
<div class="fi"><strong>DPI</strong> — From PNG/JPEG headers</div>
<div class="fi"><strong>JPEG structure</strong> — Marker analysis</div>
<div class="fi"><strong>Hashes</strong> — SHA-256 + perceptual hash</div>
<div class="fi"><strong>Copy JSON</strong> — All metadata as structured JSON</div>
</div>
<h2>Actions</h2>
<ul>
<li><strong>Copy Data URI</strong> — base64 for embedding in HTML/CSS</li>
<li><strong>Copy JSON</strong> — all metadata as formatted JSON</li>
<li><strong>Strip Metadata</strong> — re-encode without EXIF (enabled only when EXIF exists)</li>
<li><strong>Reset</strong> — clear and load a different image</li>
</ul>
` },

  colors: { title: 'Colors', content: `
<h1>Color Tools</h1>
<p>Extract colors from any image. Click pixels, extract palettes, copy in any format.</p>
${screenshot('colors-palette-extracted')}
<h2>Eyedropper</h2>
<p>Click any pixel on the canvas. The picked color shows in the ribbon as a swatch + hex value. Hover for RGB/HSL. Click to copy.</p>
<h2>Palette Extraction</h2>
<ul>
<li>Dominant colors extracted automatically (k-means)</li>
<li>Adjust count: 2–12 colors</li>
<li>Each color shows HEX, RGB, and percentage</li>
<li><strong>Copy Palette</strong> — copies all hex values (one per line)</li>
<li>Re-extract to regenerate</li>
</ul>
` },

  svg: { title: 'SVG Tools', content: `
<h1>SVG Tools</h1>
<p>Two tabs: Inspect SVG files, or Trace raster images to SVG.</p>
<h2>Inspect Tab</h2>
${screenshot('svg-inspect')}
<ul>
<li><strong>Preview</strong> — rendered SVG with grid overlay</li>
<li><strong>Metadata</strong> — width, height, viewBox, element count, file size</li>
<li><strong>Element breakdown</strong> — count by type (path, rect, circle, etc.)</li>
<li><strong>Color palette</strong> — all fill/stroke colors (click to copy)</li>
<li><strong>Formatted source</strong> — pretty-printed with syntax highlighting</li>
<li><strong>Export raster</strong> — PNG/JPEG/WebP at custom dimensions</li>
</ul>
<h2>Trace Tab</h2>
${screenshot('svg-trace')}
<ul>
<li>12 presets: Default, Logo, Sketch, Photo, Posterized, etc.</li>
<li>Side-by-side original vs traced comparison</li>
<li>Size comparison (original vs SVG file size)</li>
<li>Traced source with copy/wrap/collapse</li>
<li>Fit / 1:1 toggle for preview</li>
<li>SVG files rejected — use Inspect tab instead</li>
</ul>
` },

  compare: { title: 'Compare', content: `
<h1>Image Compare</h1>
<p>Compare two images side-by-side with pixel-level analysis.</p>
${screenshot('compare-diff')}
<h2>Modes</h2>
<ul>
<li><strong>Side-by-side</strong> — both images next to each other</li>
<li><strong>Pixel diff</strong> — red highlights where pixels differ</li>
<li><strong>Slider</strong> — drag to reveal before/after</li>
<li><strong>Center guides</strong> — toggle alignment crosshair</li>
</ul>
` },

  generate: { title: 'Generate', content: `
<h1>Image Generator</h1>
<p>Create images from scratch — no source image needed.</p>
${screenshot('generate-gradient')}
<div class="fg">
<div class="fi"><strong>Gradient</strong> — Linear/radial with custom colors</div>
<div class="fi"><strong>Pattern</strong> — Checker, stripes, dots, noise</div>
<div class="fi"><strong>Placeholder</strong> — Sized with dimensions text</div>
<div class="fi"><strong>Social Banner</strong> — Platform-sized presets</div>
<div class="fi"><strong>Avatar</strong> — Circle with initials</div>
<div class="fi"><strong>Noise</strong> — White, Perlin, color</div>
<div class="fi"><strong>Favicon</strong> — Letter icon</div>
<div class="fi"><strong>Swatch</strong> — Color palette card</div>
</div>
` },

  showcase: { title: 'Showcase', content: `
<h1>Screenshot Beautifier</h1>
<p>Present screenshots with device frames and gradient backgrounds.</p>
${screenshot('showcase-mockup')}
<h2>Features</h2>
<ul>
<li><strong>Backgrounds</strong> — 10 gradient presets + custom colors</li>
<li><strong>Browser frames</strong> — Chrome, Safari, Firefox, Arc</li>
<li><strong>OS frames</strong> — macOS window, Terminal</li>
<li><strong>Device mockups</strong> — iPhone, iPad, MacBook, Android, Monitor</li>
<li><strong>Shadow, padding, corner radius</strong></li>
</ul>
` },

  meme: { title: 'Meme', content: `
<h1>Meme Generator</h1>
<p>Classic meme-style images with Impact font and text outlines.</p>
${screenshot('meme-created')}
<ul>
<li>Top, bottom, and middle text positions</li>
<li>Impact font with black outline</li>
<li>Auto-sizes text to fit width</li>
<li>Custom font, size, color controls</li>
</ul>
` },

  watermark: { title: 'Watermark', content: `
<h1>Watermark Tool</h1>
<p>Protect images with text or logo watermarks. Supports batch processing.</p>
${screenshot('watermark-applied')}
<h2>Modes</h2>
<ul>
<li><strong>Text</strong> — custom text, font (B/I), color</li>
<li><strong>Diagonal</strong> — angled text across center</li>
<li><strong>Grid</strong> — repeated text pattern</li>
<li><strong>Stamp</strong> — single positioned text</li>
<li><strong>Image</strong> — upload a logo</li>
</ul>
<p>Position: 9-point grid. Opacity: 10–100%.</p>
` },

  callout: { title: 'Callout', content: `
<h1>Callout Annotations</h1>
<p>Add professional callout boxes, speech bubbles, and step labels.</p>
${screenshot('callout-shapes')}
<ul>
<li>Templates: speech bubble, thought bubble, info, warning, success, error, step, pin</li>
<li>5 shapes: rounded, bubble, cloud, banner, arrow box</li>
<li>Tail direction, custom colors, icons, font controls</li>
</ul>
` },

  gif: { title: 'GIF Creator', content: `
<h1>GIF Creator</h1>
<p>Combine multiple images into an animated GIF.</p>
${screenshot('gif-frames')}
<ul>
<li>Drop multiple images as frames</li>
<li>Drag to reorder</li>
<li>Frame delay: 30–2000ms</li>
<li>Preview playback</li>
<li>GIF supports max 256 colors per frame</li>
</ul>
` },

  certificate: { title: 'Certificate', content: `
<h1>Certificate Generator</h1>
<p>Create professional certificates, diplomas, and badges.</p>
${screenshot('certificate-classic')}
<ul>
<li>8 templates: Classic, Modern, Elegant, Minimal, Gold, Corporate, Academic, Creative</li>
<li>Custom recipient name, title, description, date, issuer</li>
<li>Logo upload, badge mode</li>
</ul>
` },

  store: { title: 'Store Assets', content: `
<h1>App Store Assets</h1>
<p>Generate all required icon sizes from a single 1024×1024 source.</p>
${screenshot('store-icons')}
<h2>Supported Stores</h2>
<ul>
<li><strong>Apple</strong> — 1024, 180, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20</li>
<li><strong>Google Play</strong> — 512, 192, 144, 96, 72, 48</li>
<li><strong>Chrome</strong> — 128, 48, 16</li>
<li><strong>Edge</strong> — 300, 128, 48, 16</li>
<li><strong>Firefox</strong> — 128, 64, 48, 32</li>
<li><strong>Microsoft</strong> — 300, 150, 50</li>
</ul>
` },

  fonts: { title: 'Font Manager', content: `
<h1>Font Manager</h1>
<p>Centralized font management across all tools. Three tiers of fonts.</p>
${screenshot('font-manager')}
<h2>Tiers</h2>
<ol>
<li><strong>Built-in</strong> — 15 web-safe fonts, always available</li>
<li><strong>System fonts</strong> — detected via browser API (one-time permission). Cached.</li>
<li><strong>Custom uploads</strong> — .ttf, .otf, .woff, .woff2 (max 10, stored in IndexedDB)</li>
</ol>
<h2>Usage</h2>
<p>Click "Fonts" in the topbar. Upload custom fonts, detect system fonts, preview with sample text. All font dropdowns across all tools update automatically.</p>
` },

  library: { title: 'Library', content: `
<h1>Library</h1>
<p>Save images across sessions. Opens as an overlay without leaving your current tool.</p>
${screenshot('library-overlay')}
<h2>Features</h2>
<ul>
<li>3 view modes: Tiles, Medium, List</li>
<li>Sort by date, name, size</li>
<li>Search and filter</li>
<li>Right-click: download, copy, rename, move to collection, delete</li>
<li>Export selected as ZIP</li>
<li>When opened from a tool: browse-only (no navigation to other tools)</li>
<li>When opened from home: can open images in Edit, Showcase, Social Media</li>
</ul>
` },

  shortcuts: { title: 'Shortcuts', content: `
<h1>Keyboard Shortcuts</h1>
<p>Press <kbd>Ctrl+/</kbd> in the toolkit to see the shortcuts overlay.</p>
<table>
<tr><th>Action</th><th>Key</th></tr>
<tr><td>Undo</td><td><kbd>Ctrl+Z</kbd></td></tr>
<tr><td>Redo</td><td><kbd>Ctrl+Y</kbd></td></tr>
<tr><td>Export</td><td><kbd>Ctrl+S</kbd></td></tr>
<tr><td>Shortcuts overlay</td><td><kbd>Ctrl+/</kbd></td></tr>
<tr><td>Back to Home</td><td><kbd>Escape</kbd></td></tr>
<tr><td>Ruler (Edit)</td><td><kbd>R</kbd></td></tr>
<tr><td>Grid (Edit)</td><td><kbd>G</kbd></td></tr>
<tr><td>Center (Edit)</td><td><kbd>C</kbd></td></tr>
<tr><td>History (Edit)</td><td><kbd>H</kbd></td></tr>
<tr><td>Select All (Collage)</td><td><kbd>Ctrl+A</kbd></td></tr>
<tr><td>Group (Collage)</td><td><kbd>Ctrl+G</kbd></td></tr>
<tr><td>Ungroup</td><td><kbd>Ctrl+Shift+G</kbd></td></tr>
<tr><td>Delete object</td><td><kbd>Delete</kbd></td></tr>
<tr><td>Duplicate (Draw)</td><td><kbd>Ctrl+D</kbd></td></tr>
<tr><td>Quick QR</td><td><kbd>Alt+Q</kbd></td></tr>
<tr><td>Open Side Panel</td><td><kbd>Alt+P</kbd></td></tr>
</table>
` },

  faq: { title: 'FAQ', content: `
<h1>Which Tool Should I Use?</h1>
<p>Not sure where to start? Find your task below.</p>
<h2>I want to make an image smaller</h2>
<ul>
<li><strong>Compress</strong> — one image with live quality preview</li>
<li><strong>Batch Edit</strong> — many images with same settings</li>
<li><strong>Convert</strong> — by changing format (PNG → WebP)</li>
<li><strong>Edit</strong> — by resizing dimensions</li>
</ul>
<h2>I want to change the format</h2>
<ul>
<li><strong>Convert</strong> — per-file format control</li>
<li><strong>Batch Edit</strong> — same format for all</li>
</ul>
<h2>I want to edit or annotate</h2>
<ul>
<li><strong>Edit</strong> — full editor with crop, adjust, draw</li>
<li><strong>Draw</strong> — blank canvas, no image needed</li>
<li><strong>Watermark</strong> — text or logo overlay</li>
<li><strong>Callout</strong> — speech bubbles, labels</li>
<li><strong>Meme</strong> — top/bottom text</li>
</ul>
<h2>I want to create something from scratch</h2>
<ul>
<li><strong>Draw</strong> — sketches, diagrams, wireframes</li>
<li><strong>Generate</strong> — gradients, patterns, placeholders</li>
<li><strong>Certificate</strong> — diplomas, badges</li>
<li><strong>QR Code</strong> — custom QR codes</li>
<li><strong>Collage</strong> — combine images</li>
</ul>
<h2>I want to inspect or analyze</h2>
<ul>
<li><strong>Info</strong> — EXIF, metadata, hash</li>
<li><strong>Colors</strong> — eyedropper, palette</li>
<li><strong>Compare</strong> — pixel diff</li>
<li><strong>SVG Tools</strong> — source, elements, trace</li>
</ul>
<h2>I want to prepare for publishing</h2>
<ul>
<li><strong>Social Media</strong> — platform-specific resize</li>
<li><strong>Store Assets</strong> — app store icons</li>
<li><strong>Showcase</strong> — screenshot mockups</li>
</ul>
<h2>I want to work with page images</h2>
<ul>
<li><strong>Side Panel</strong> — browse, save, download page images</li>
<li><strong>Right-click menu</strong> — info, save as, copy, read QR</li>
</ul>
` },

  pwa: { title: 'PWA', content: `
<h1>Progressive Web App</h1>
<p>Gazo is also available as a PWA — works in any browser, installable to your home screen or taskbar.</p>
${screenshot('pwa-home')}
<h2>How to Install</h2>
<ol>
<li>Visit <a href="../pwa/" style="color:#F4C430;">gazo.tools/pwa</a></li>
<li>Click the install icon in your browser's address bar</li>
<li>Or: Chrome menu → "Install Gazo"</li>
</ol>
<h2>Differences from Extension</h2>
<table>
<tr><th>Feature</th><th>Extension</th><th>PWA</th></tr>
<tr><td>All 20 tools</td><td>✓</td><td>✓</td></tr>
<tr><td>Right-click menu</td><td>✓</td><td>—</td></tr>
<tr><td>Side panel</td><td>✓</td><td>—</td></tr>
<tr><td>Page image detection</td><td>✓</td><td>—</td></tr>
<tr><td>Works offline</td><td>✓</td><td>✓</td></tr>
<tr><td>Cross-browser</td><td>Chrome/Edge/Firefox</td><td>Any browser</td></tr>
<tr><td>Mobile support</td><td>—</td><td>✓</td></tr>
</table>
<h2>Offline Support</h2>
<p>The PWA uses a service worker to cache all assets. Once loaded, it works completely offline — no internet needed.</p>
` },
};

// ── Generate all pages ──
let count = 0;
for (const [slug, { title, content }] of Object.entries(pages)) {
  const html = page(title, slug, content, nav);
  fs.writeFileSync(path.join(OUT, `${slug}.html`), html);
  count++;
}

console.log(`Generated ${count} help pages in website/help/`);
