/**
 * Resume Studio — Local Offline PDF.js Worker Configuration
 * Configures pdfjs-dist with locally bundled worker (zero CDN dependency) for 100% offline PWA support.
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

const isVitest = typeof globalThis !== 'undefined' && Boolean(globalThis.process?.env?.VITEST)

if (!isVitest && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
}

export { pdfjsLib }
