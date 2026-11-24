import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { Blob as NodeBlob, File as NodeFile, Buffer as NodeBuffer } from 'node:buffer'

// Polyfill Uint8Array cross-realm instanceof and toHex for pdfjs-dist & react-pdf in JSDOM/Node
if (typeof Uint8Array !== 'undefined') {
  if (!Uint8Array.prototype.toHex) {
    Uint8Array.prototype.toHex = function () {
      return Array.from(this)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  }

  // Cross-realm instanceof guard for Node Buffers & TypedArrays in JSDOM
  Object.defineProperty(Uint8Array, Symbol.hasInstance, {
    value: (instance) => {
      if (!instance) return false
      return (
        NodeBuffer.isBuffer(instance) ||
        instance.constructor?.name === 'Uint8Array' ||
        instance.constructor?.name === 'Buffer' ||
        (typeof instance === 'object' && typeof instance.byteLength === 'number' && instance.BYTES_PER_ELEMENT === 1)
      )
    },
    configurable: true,
  })
}

// JSDOM polyfills for browser APIs
if (typeof window !== 'undefined') {
  // Ensure native Node Blob/File is used so structuredClone / fake-indexeddb preserves binary Blobs correctly
  globalThis.Blob = NodeBlob
  window.Blob = NodeBlob
  globalThis.File = NodeFile
  window.File = NodeFile

  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }

  // Safe mock for URL.createObjectURL in JSDOM / Vitest
  URL.createObjectURL = () => 'blob:mock-url'
  URL.revokeObjectURL = () => {}
  if (typeof window !== 'undefined' && window.URL) {
    window.URL.createObjectURL = () => 'blob:mock-url'
    window.URL.revokeObjectURL = () => {}
  }

  // JSDOM HTMLCanvasElement mock for PDF.js preview rendering in tests
  if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = () => ({
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Array(4) }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    })
  }
}
