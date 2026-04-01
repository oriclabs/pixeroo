// Gazo WASM Loader
// Lazy-loads the WASM module and provides a unified API

let wasmInstance = null;
let wasmLoading = null;

/**
 * Initialize the WASM module (lazy, only loads on first call)
 * @returns {Promise<object>} The WASM module exports
 */
export async function initWasm() {
  if (wasmInstance) return wasmInstance;

  if (wasmLoading) return wasmLoading;

  wasmLoading = (async () => {
    try {
      // In extension context, load from extension URL
      // In PWA context, load from relative path
      const wasmUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('wasm/gazo_wasm_bg.wasm')
        : '/shared/wasm/pkg/gazo_wasm_bg.wasm';

      const { default: init, ...exports } = await import('./pkg/gazo_wasm.js');
      await init(wasmUrl);

      wasmInstance = exports;
      console.log(`[Gazo] WASM engine v${exports.version()} ready`);
      return wasmInstance;
    } catch (e) {
      console.error('[Gazo] WASM load failed:', e);
      wasmLoading = null;
      throw e;
    }
  })();

  return wasmLoading;
}

/**
 * Check if WASM is loaded
 */
export function isWasmReady() {
  return wasmInstance !== null;
}

/**
 * Get the WASM module (throws if not loaded)
 */
export function getWasm() {
  if (!wasmInstance) throw new Error('WASM not initialized. Call initWasm() first.');
  return wasmInstance;
}
