// Pixeroo WASM Engine Loader
// Loads the WASM binary and exposes window.pixerooWasm

(async function() {
  if (window.pixerooWasm) return; // already loaded

  try {
    // Load the JS bindings
    const bindingsUrl = chrome.runtime.getURL('wasm/pixeroo_wasm.js');
    const resp = await fetch(bindingsUrl);
    const code = await resp.text();

    // The wasm-pack generated JS uses ES module syntax.
    // We need to extract the init function and exports.
    // Create a blob URL that wraps it as a module we can import.
    const moduleBlob = new Blob([code], { type: 'application/javascript' });
    const moduleUrl = URL.createObjectURL(moduleBlob);

    const module = await import(moduleUrl);
    URL.revokeObjectURL(moduleUrl);

    // Initialize with the WASM binary
    const wasmUrl = chrome.runtime.getURL('wasm/pixeroo_wasm_bg.wasm');
    await module.default(wasmUrl);

    // Expose all exports on window
    window.pixerooWasm = {};
    for (const [key, value] of Object.entries(module)) {
      if (key !== 'default') window.pixerooWasm[key] = value;
    }

    console.log('[Pixeroo] WASM engine v' + (window.pixerooWasm.version?.() || '?') + ' loaded');
  } catch (e) {
    console.warn('[Pixeroo] WASM engine failed to load:', e.message);
    // Extension works without WASM -- JS fallbacks handle everything
  }
})();
