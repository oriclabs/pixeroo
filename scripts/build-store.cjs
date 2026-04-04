// Build script: generates Microsoft Store (MSIX) package structure from PWA
// Run: node scripts/build-store.cjs
// Prerequisites: Run `npm run build:pwa` first to generate the PWA files
//
// Output: dist/store/ — ready for PWABuilder or manual MSIX packaging
// To submit: upload dist/store/ to https://www.pwabuilder.com or use MSIX Packaging Tool

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PWA_DIR = path.join(ROOT, 'website', 'pwa');
const STORE_DIR = path.join(ROOT, 'dist', 'store');
const ASSETS_DIR = path.join(STORE_DIR, 'assets');

// --- Config ---
const config = {
  identity: {
    name: 'Gazo.ImageToolkit',
    publisher: 'CN=Gazo',           // Update with your MS Partner Center publisher ID
    version: '0.1.0.0',
  },
  display: {
    name: 'Gazo — Image Toolkit',
    shortName: 'Gazo',
    description: 'Free offline image toolkit — edit, convert, compress, collage, QR, meme, watermark & more. Zero uploads.',
  },
  visual: {
    backgroundColor: '#020617',
    foregroundText: 'light',
  },
  url: 'https://gazo.tools/pwa/',
};

// --- Helpers ---
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function dirSize(dir) {
  let size = 0;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) size += dirSize(fp);
    else size += fs.statSync(fp).size;
  }
  return size;
}

// --- Clean & Create ---
if (fs.existsSync(STORE_DIR)) {
  fs.rmSync(STORE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// --- Verify PWA exists ---
if (!fs.existsSync(path.join(PWA_DIR, 'index.html'))) {
  console.error('Error: PWA not built. Run `npm run build:pwa` first.');
  process.exit(1);
}

// --- Copy PWA files ---
console.log('Copying PWA files...');
copyRecursive(PWA_DIR, path.join(STORE_DIR, 'pwa'));

// --- Copy & map icons for Store tiles ---
console.log('Preparing Store assets...');
const iconMap = {
  'Square44x44Logo.png':    'icon-44.png',
  'Square150x150Logo.png':  'icon-150.png',
  'LargeTile.png':          'icon-300.png',
  'Square44x44Logo.targetsize-44.png':  'icon-44.png',
  'Square150x150Logo.targetsize-150.png': 'icon-150.png',
  'StoreLogo.png':           'icon-50.png',
  'SplashScreen.png':        'icon-620.png',
};

const iconsDir = path.join(PWA_DIR, 'icons');
for (const [storeName, pwaIcon] of Object.entries(iconMap)) {
  const src = path.join(iconsDir, pwaIcon);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(ASSETS_DIR, storeName));
  } else {
    console.warn(`  Warning: Missing ${pwaIcon} — run icon generation script`);
  }
}

// Also copy the full icon set for the package
for (const f of fs.readdirSync(iconsDir)) {
  fs.copyFileSync(path.join(iconsDir, f), path.join(ASSETS_DIR, f));
}

// --- Generate AppxManifest.xml ---
console.log('Generating AppxManifest.xml...');
const appxManifest = `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:uap3="http://schemas.microsoft.com/appx/manifest/uap/windows10/3"
         xmlns:uap10="http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap uap3 uap10 rescap">

  <Identity Name="${config.identity.name}"
            Publisher="${config.identity.publisher}"
            Version="${config.identity.version}"
            ProcessorArchitecture="neutral" />

  <Properties>
    <DisplayName>${config.display.name}</DisplayName>
    <PublisherDisplayName>Gazo</PublisherDisplayName>
    <Logo>assets\\StoreLogo.png</Logo>
    <Description>${config.display.description}</Description>
  </Properties>

  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>

  <Resources>
    <Resource Language="en-us" />
  </Resources>

  <Applications>
    <Application Id="App"
                 StartPage="${config.url}">

      <uap:VisualElements DisplayName="${config.display.shortName}"
                          Description="${config.display.description}"
                          BackgroundColor="${config.visual.backgroundColor}"
                          Square150x150Logo="assets\\Square150x150Logo.png"
                          Square44x44Logo="assets\\Square44x44Logo.png">
        <uap:DefaultTile Wide310x150Logo="assets\\LargeTile.png"
                         Square310x310Logo="assets\\LargeTile.png"
                         ShortName="${config.display.shortName}">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo" />
            <uap:ShowOn Tile="wide310x150Logo" />
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>
        <uap:SplashScreen Image="assets\\SplashScreen.png" BackgroundColor="${config.visual.backgroundColor}" />
      </uap:VisualElements>

      <!-- File type associations -->
      <Extensions>
        <uap:Extension Category="windows.fileTypeAssociation">
          <uap:FileTypeAssociation Name="imagefiles">
            <uap:DisplayName>Image Files</uap:DisplayName>
            <uap:SupportedFileTypes>
              <uap:FileType>.png</uap:FileType>
              <uap:FileType>.jpg</uap:FileType>
              <uap:FileType>.jpeg</uap:FileType>
              <uap:FileType>.webp</uap:FileType>
              <uap:FileType>.gif</uap:FileType>
              <uap:FileType>.svg</uap:FileType>
              <uap:FileType>.bmp</uap:FileType>
              <uap:FileType>.tiff</uap:FileType>
              <uap:FileType>.tif</uap:FileType>
            </uap:SupportedFileTypes>
          </uap:FileTypeAssociation>
        </uap:Extension>

        <uap3:Extension Category="windows.appUriHandler">
          <uap3:AppUriHandler>
            <uap3:Host Name="gazo.tools" />
          </uap3:AppUriHandler>
        </uap3:Extension>
      </Extensions>

    </Application>
  </Applications>

  <Capabilities>
    <Capability Name="internetClient" />
  </Capabilities>

</Package>`;

fs.writeFileSync(path.join(STORE_DIR, 'AppxManifest.xml'), appxManifest);

// --- Generate PWABuilder web-manifest.json (for PWABuilder upload) ---
console.log('Generating pwabuilder-config.json...');
const pwabuilderConfig = {
  generatedFrom: 'build-store.cjs',
  url: config.url,
  name: config.display.name,
  shortName: config.display.shortName,
  description: config.display.description,
  backgroundColor: config.visual.backgroundColor,
  themeColor: '#F4C430',
  version: config.identity.version,
  icons: {
    'Square44x44Logo': 'assets/Square44x44Logo.png',
    'Square150x150Logo': 'assets/Square150x150Logo.png',
    'LargeTile': 'assets/LargeTile.png',
    'StoreLogo': 'assets/StoreLogo.png',
    'SplashScreen': 'assets/SplashScreen.png',
  },
};
fs.writeFileSync(
  path.join(STORE_DIR, 'pwabuilder-config.json'),
  JSON.stringify(pwabuilderConfig, null, 2)
);

// --- Summary ---
const totalSize = dirSize(STORE_DIR);
const fileCount = fs.readdirSync(STORE_DIR).length;
console.log('');
console.log('=== Microsoft Store Package Ready ===');
console.log(`Output:  dist/store/`);
console.log(`Size:    ${(totalSize / 1024).toFixed(0)} KB`);
console.log(`Files:   ${fileCount} root entries`);
console.log('');
console.log('Next steps:');
console.log('  Option A (easiest): Upload your PWA URL to https://www.pwabuilder.com');
console.log('  Option B (manual):  Use MSIX Packaging Tool with dist/store/AppxManifest.xml');
console.log('  Option C (CI):      Use makeappx.exe from Windows SDK to create .msix');
console.log('');
console.log('Before submitting, update the publisher identity in scripts/build-store.cjs');
console.log('with your Microsoft Partner Center publisher CN.');
