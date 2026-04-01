# Test Fixtures

Test images used by unit and E2E tests. Run `npm run test:prepare` to generate and download all fixtures.

## Generated Fixtures (`tests/scripts/generate-fixtures.cjs`)

| File | Type | Description |
|---|---|---|
| `test-500x300.png` | PNG | Standard test image |
| `test-200x200.png` | PNG | Square test image |
| `test-1920x1080.png` | PNG | Large HD test image |
| `test-transparent-400x400.png` | PNG | With alpha transparency |
| `test-wide-1500x500.png` | PNG | Ultra-wide (banner ratio) |
| `test-tall-500x1500.png` | PNG | Portrait/tall (story ratio) |
| `test-tiny-32x32.png` | PNG | Icon-sized edge case |
| `test-icon.svg` | SVG | Simple icon (rect, circle, path, text) |
| `test-gradient.svg` | SVG | Linear + radial gradients |
| `test-text.svg` | SVG | Text elements with fonts |
| `test-complex.svg` | SVG | 8 element types (rect, circle, ellipse, path, line, polygon, text, filter) |

## Downloaded Fixtures (`tests/scripts/download-exif-samples.cjs`)

### EXIF Samples (`exif/`)

Downloaded from open-source repositories for testing EXIF metadata parsing, orientation handling, and metadata stripping.

**Orientation examples** — [recurser/exif-orientation-examples](https://github.com/recurser/exif-orientation-examples) (MIT License)
- `orientation-Landscape_1.jpg` through `orientation-Landscape_8.jpg` — All 8 EXIF orientation values
- `orientation-Portrait_1.jpg`, `orientation-Portrait_6.jpg`, `orientation-Portrait_8.jpg` — Portrait orientations

**Metadata samples** — [ianare/exif-samples](https://github.com/ianare/exif-samples) (MIT License)
- `canon-40d.jpg` — Canon EOS 40D camera EXIF data (lens, ISO, aperture, shutter speed)
- `gps-nikon.jpg` — Nikon with embedded GPS coordinates
- `long-description.jpg` — JPEG with extended EXIF description field

### WebP Samples (`webp/`)

Downloaded from Google's WebP gallery for testing WebP format support.

**Source** — [Google WebP Gallery](https://developers.google.com/speed/webp/gallery) (BSD-style license)
- `gallery-1.webp` through `gallery-5.webp` — Lossy encoded WebP images
- `lossless-1.webp` through `lossless-3.webp` — Lossless encoded WebP images

## Credits

We gratefully acknowledge the following open-source projects for providing test data:

- **[recurser/exif-orientation-examples](https://github.com/recurser/exif-orientation-examples)** — MIT License — EXIF orientation test images
- **[ianare/exif-samples](https://github.com/ianare/exif-samples)** — MIT License — EXIF metadata sample images
- **[Google WebP Gallery](https://developers.google.com/speed/webp/gallery)** — WebP format sample images
