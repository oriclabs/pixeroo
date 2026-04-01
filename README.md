# Gazo

**Grab. Alter. Zone. Output.**
*Image tools, offline.*

Free offline image toolkit — browser extension + PWA. Edit, convert, compress, draw, generate QR codes, extract colors, trace SVGs, and more. 100% offline, zero tracking, no account required.

## Install

- **Chrome** — [Chrome Web Store](#)
- **Edge** — [Edge Add-ons](#)
- **Firefox** — [Firefox Add-ons](#)
- **PWA** — [gazo web app](#)

## Tools (20)

### Essentials

| Tool | Description |
|---|---|
| **Edit** | Resize, crop, rotate, flip, adjust (B/C/S/H), filters, draw (rect, ellipse, arrow, curved arrow, text, pen, highlighter, redact). Non-destructive pipeline with undo/redo history. Export as PNG, JPEG, WebP, BMP, SVG trace. |
| **Convert** | Batch format conversion between PNG, JPEG, WebP, BMP, GIF, TIFF, ICO, QOI. Per-file format control, quality slider, strip EXIF, smart rename patterns. |
| **Batch Edit** | Process multiple images with same settings. Resize, filter, watermark (5 modes: text, diagonal, grid, stamp, image), rename patterns with tokens, multi-size export, pipeline import from Edit, ZIP download. Presets, LQIP, social sizes, duplicate detection, consistency check. |
| **Social Media** | Resize for 21 platform presets (Twitter, Instagram, Facebook, LinkedIn, YouTube, Pinterest, TikTok, Discord). Visual guidelines with safe zones, draggable crop frame (image bigger) or draggable image placement (image smaller). Platform mockup preview. 4 fit modes: Cover, Contain, Original size, Stretch. Transparent background option. |
| **Collage** | Freeform canvas with drag-and-drop images. Grid/row/col/stack auto-arrange, templates, 16 blend modes, edge fades, join blend, smart snap, alignment/distribute, group/ungroup, text objects. |
| **Draw** | Blank canvas drawing board. Rectangle, ellipse, arrow, curved arrow (bezier with control point), text (B/I/U, custom fonts), pen, highlighter. Add images from file or Library. Undo/redo, duplicate, layer order, grid overlay, line styles (solid/dashed/dotted), background image, transparent canvas. |

### More Tools

| Tool | Description |
|---|---|
| **Compress** | Reduce file size with live side-by-side preview. JPEG/WebP/PNG, quality slider, resize option, target size mode (binary search), format comparison table. Click-to-enlarge preview. Auto-selects best format, warns on same-format. |
| **QR Code** | Generate QR codes with live preview. 8 presets (URL, WiFi, Email, Phone, vCard, SMS, Geo, Event). Auto-detect content type, validation. Dot styles (square, rounded, dots), custom FG/BG colors, gradient, center logo, background image. Bulk generate as ZIP. Read QR from dropped images. History. |
| **Info** | Inspect image metadata: file info, dimensions, aspect ratio, EXIF (camera, lens, ISO, GPS), DPI, JPEG structure, SHA-256 + perceptual hash, base64 data URI. Copy as JSON. Strip metadata (re-encode without EXIF). |
| **Colors** | Eyedropper (click any pixel), dominant palette extraction (k-means, 2-12 colors), HEX/RGB/HSL formats. Copy individual colors or entire palette. Contrast checker (WCAG). |
| **Generate** | Create images from scratch: gradients (linear/radial), patterns (checker/stripes/dots/noise), placeholders, social banners, avatars, noise, favicons, color swatches. |
| **Showcase** | Screenshot beautifier with gradient backgrounds, browser frames (Chrome, Safari, Firefox, Arc), OS frames (macOS, Terminal), device mockups (iPhone, iPad, MacBook, Android, Monitor). Shadow, padding, corner radius. |
| **SVG Tools** | Two tabs: **Inspect** (formatted source with syntax highlighting, element breakdown, color palette extraction, export as raster) and **Trace** (vectorize raster images with 12 presets, side-by-side comparison, size comparison, fit/1:1 toggle). |
| **Compare** | Side-by-side image comparison: pixel diff (red highlights), before/after slider, center alignment guides. |
| **Meme** | Classic meme generator with Impact font, top/bottom/middle text, auto-sizing, outline controls. |
| **Watermark** | Text or logo watermark with 5 modes (single, diagonal, grid, stamp, image logo). 9-point position grid, opacity, tiling, batch processing. |
| **Callout** | Annotate with callout boxes: speech bubble, thought bubble, cloud, banner, arrow box. Tail direction, custom colors, icons, font controls. |
| **GIF Creator** | Combine images into animated GIF. Drag to reorder frames, frame delay (30-2000ms), preview playback. |
| **Certificate** | Generate certificates, diplomas, and badges. 8 templates (classic to creative), custom text, date, issuer, logo upload, badge mode. |
| **Store Assets** | Generate all app store icon sizes from a single 1024x1024 source. Apple, Google Play, Chrome, Edge, Firefox, Microsoft Store. |

## Features

### Extension Features
- **Right-click context menu** — View Image Info, Save As (PNG/JPEG/WebP/AVIF/BMP/ICO), Copy as PNG, Read QR, Extract Colors
- **Side panel** — Browse page images (5 view modes, filter by type, sort), save to Library, color extraction, contrast checker, screenshots
- **Popup** — Quick actions (Screenshot, Region, Pick Color, Paste, Library, Draw), QR for current page, gear settings
- **Keyboard shortcuts** — Alt+Q (Quick QR), Alt+P (Open side panel)

### Cross-cutting Features
- **Font Manager** — 3 tiers: 15 built-in web-safe fonts, system fonts (via queryLocalFonts API), custom uploads (max 10, stored in IndexedDB). Shared across all tools with font dropdowns.
- **Library** — Save images across sessions (IndexedDB). Browse, search, filter, rename, organize into collections. Opens as overlay without leaving current tool.
- **FAQ ("Which tool?")** — Task-based guide on home screen, popup, side panel, and help page. Clickable tool links.
- **Search** — Home screen search with keyword matching across tool names, descriptions, and rich keywords (e.g. "optimize" finds Compress, "instagram" finds Social Media).
- **Tours** — Guided step-by-step tour for each tool.
- **Help** — Full documentation page with per-tool sections, FAQ, keyboard shortcuts.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla JavaScript, Tailwind CSS |
| Image Processing | Rust/WASM (gazo-wasm) |
| Extension | Chrome Manifest V3 |
| Storage | IndexedDB (Library, Fonts), chrome.storage (Settings) |
| Testing | Jest (unit), Playwright (E2E) |

## Development

```bash
# Install dependencies
npm install

# Build CSS
npm run build:css

# Build WASM
npm run build:wasm

# Run unit tests
npm run test:unit

# Prepare test fixtures (generate + download)
npm run test:prepare

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

## Project Structure

```
browser/
  chrome/           # Chrome extension source
    editor/         # Main toolkit (20 tools)
    sidepanel/      # Side panel UI
    popup/          # Extension popup
    settings/       # Settings page
    help/           # Help documentation
    shared/         # Dialog, library, theme, font manager
    content/        # Content script (page image detection)
    background.js   # Service worker
  edge/             # Edge extension manifest
  firefox/          # Firefox extension
website/
  pwa/              # Progressive Web App
  docs/             # Landing page, features, privacy, changelog
shared/
  wasm/             # WASM module + loader
  utils/            # Shared utilities
crates/             # Rust source (convert, edit, info, qr, svg)
tests/
  unit/             # Jest unit tests
  e2e/              # Playwright E2E tests
  fixtures/         # Test images (PNG, SVG, JPEG, WebP)
  scripts/          # Fixture generation + download scripts
```

## Test Data Credits

Test fixture images are downloaded from open-source projects for testing EXIF metadata parsing, orientation handling, and format compatibility. Run `npm run test:prepare` to generate and download all fixtures.

- **[recurser/exif-orientation-examples](https://github.com/recurser/exif-orientation-examples)** (MIT License) — All 8 EXIF orientation values for testing auto-rotation of phone photos
- **[ianare/exif-samples](https://github.com/ianare/exif-samples)** (MIT License) — Camera metadata samples (Canon EOS 40D, Nikon with GPS coordinates, extended descriptions)
- **[Google WebP Gallery](https://developers.google.com/speed/webp/gallery)** — Lossy and lossless WebP format samples for testing format conversion

## Privacy

- 100% offline — zero network requests
- No data leaves your device
- No accounts, no tracking, no analytics
- Minimal permissions: activeTab, contextMenus, downloads, storage, sidePanel, clipboardWrite
- Open source — every line of code is inspectable

## License

MIT
