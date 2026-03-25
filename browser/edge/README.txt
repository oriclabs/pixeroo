Pixeroo - Edge Extension

Edge uses the same Manifest V3 format as Chrome.
All source files are shared with the Chrome extension.

Build process:
1. Copy all files from browser/chrome/ to browser/edge/
2. The manifest.json is identical (Edge supports sidePanel API)
3. Package as .zip for Edge Add-ons submission

Edge-specific notes:
- Edge supports sidePanel API since Edge 116+
- Downloads API works identically to Chrome
- No Brave-specific download API issues on Edge
