// Gazo - Shared Image Utilities

/**
 * Convert a File/Blob to ArrayBuffer
 */
export async function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert a URL to image bytes (fetch + arrayBuffer)
 */
export async function urlToBytes(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Convert bytes to object URL for display/download
 */
export function bytesToObjectUrl(bytes, mimeType = 'image/png') {
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Download bytes as a file
 */
export function downloadBytes(bytes, filename, mimeType = 'image/png') {
  const url = bytesToObjectUrl(bytes, mimeType);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Guess MIME type from file extension
 */
export function mimeFromExt(ext) {
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
    bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff',
    ico: 'image/x-icon', svg: 'image/svg+xml', qoi: 'image/qoi',
  };
  return map[ext?.toLowerCase()] || 'application/octet-stream';
}

/**
 * Get file extension from MIME type
 */
export function extFromMime(mime) {
  const map = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/avif': 'avif', 'image/bmp': 'bmp',
    'image/tiff': 'tiff', 'image/x-icon': 'ico', 'image/svg+xml': 'svg',
  };
  return map[mime] || 'bin';
}

/**
 * Extract filename from URL
 */
export function filenameFromUrl(url) {
  try {
    return new URL(url).pathname.split('/').pop() || 'image';
  } catch {
    return 'image';
  }
}

/**
 * Escape HTML for safe display
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
