Third-party libraries bundled locally (no CDN, no remote loading).

jsQR.min.js
  - QR code decoder
  - Source: https://github.com/cozmo/jsQR (npm: jsqr@1.4.0)
  - License: Apache-2.0
  - Minified with Terser (not obfuscated)
  - 130KB

smartcrop.min.js
  - Content-aware image cropping
  - Source: https://github.com/jwagner/smartcrop.js (npm: smartcrop@2.0.5)
  - License: MIT
  - Minified (not obfuscated)
  - 7KB

editor/tracer.js (adapted, not in lib/)
  - Raster image to SVG vectorizer
  - Based on: https://github.com/jankovicsandras/imagetracerjs (v1.2.6)
  - Original license: Unlicense / Public Domain
  - Adapted for Pixeroo: stripped Node.js/CLI/AMD, refactored API to accept
    canvas directly, added custom presets (logo, sketch, photo, minimal),
    modernized to ES6. Core vectorization algorithm unchanged.
  - Credit: Andras Jankovics (andras@jankovics.net)
