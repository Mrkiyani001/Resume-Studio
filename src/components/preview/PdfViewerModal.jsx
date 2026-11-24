import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { pdfjsLib } from '../../lib/pdfWorker.js'
import { downloadBlob } from '../../features/pdf-export/exportPipeline.js'

/**
 * Mobile-First In-App PDF.js Preview Modal.
 *
 * Requirements:
 * - 100% offline rendering via locally bundled pdfjs-dist worker
 * - Scrollable pages stack with page navigation indicator
 * - Accessible zoom controls (Zoom In, Zoom Out, Reset, min 44px touch targets)
 * - Reliable download trigger for current Blob
 * - Decoupled: can display freshly generated blobs OR archived Blobs from Dexie
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Blob} props.pdfBlob Exact PDF binary Blob to render
 * @param {string} props.filename Sanitized filename for downloading
 * @param {string} [props.title] Custom modal title
 * @param {boolean} [props.isArchived=false] Whether viewing an immutable archive record
 */
export function PdfViewerModal({
  isOpen,
  onClose,
  pdfBlob,
  filename = 'Resume.pdf',
  title,
  isArchived = false,
}) {
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const canvasRefs = useRef([])
  const pdfDocRef = useRef(null)

  // 1. Load PDF Document from Blob
  useEffect(() => {
    let isCancelled = false

    async function loadPdf() {
      if (!isOpen || !pdfBlob) return
      try {
        setIsLoading(true)
        setError(null)
        canvasRefs.current = []

        const arrayBuffer = await pdfBlob.arrayBuffer()
        if (isCancelled) return

        const data = new Uint8Array(arrayBuffer)
        const loadingTask = pdfjsLib.getDocument({ data })
        const pdfDoc = await loadingTask.promise
        if (isCancelled) return

        pdfDocRef.current = pdfDoc
        setNumPages(pdfDoc.numPages)
        setIsLoading(false)
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load PDF in previewer:', err)
          setError(err.message || 'Could not render PDF document.')
          setIsLoading(false)
        }
      }
    }

    loadPdf()
    return () => {
      isCancelled = true
    }
  }, [isOpen, pdfBlob])

  // 2. Render Canvas Pages when scale or numPages changes
  const renderPages = useCallback(async () => {
    const pdfDoc = pdfDocRef.current
    if (!pdfDoc || numPages === 0) return

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const canvas = canvasRefs.current[pageNum - 1]
      if (!canvas) continue

      try {
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale })

        const context = canvas.getContext ? canvas.getContext('2d') : null
        if (!context) continue

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport,
        }

        await page.render(renderContext).promise
      } catch (err) {
        // Page render error or canvas unmounted
        console.warn(`Page ${pageNum} render notice:`, err)
      }
    }
  }, [numPages, scale])

  useEffect(() => {
    if (!isLoading && numPages > 0) {
      renderPages()
    }
  }, [isLoading, numPages, scale, renderPages])

  // 3. Zoom Handlers
  function handleZoomIn() {
    setScale((prev) => Math.min(prev + 0.2, 2.5))
  }

  function handleZoomOut() {
    setScale((prev) => Math.max(prev - 0.2, 0.6))
  }

  function handleZoomReset() {
    setScale(1.1)
  }

  function handleDownloadClick() {
    if (pdfBlob) {
      downloadBlob(pdfBlob, filename)
    }
  }

  const zoomPercentage = Math.round((scale / 1.1) * 100)
  const modalTitle = title || (isArchived ? `Archived PDF: ${filename}` : `Preview: ${filename}`)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={modalTitle}
      description={
        isArchived
          ? 'Viewing immutable stored PDF binary Blob (never regenerated).'
          : 'Interactive offline preview rendered from structured resume data.'
      }
      footer={
        <div className="w-full flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {numPages > 0 ? `${numPages} ${numPages === 1 ? 'Page' : 'Pages'}` : ''}
            </span>
            {isArchived && (
              <Badge variant="blue" className="text-[10px]">
                Immutable Stored Blob
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Return to Editor
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Download}
              onClick={handleDownloadClick}
              disabled={!pdfBlob}
            >
              Download PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Floating Zoom & Controls Toolbar */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 w-11 min-h-[44px] min-w-[44px] p-0"
              leftIcon={ZoomOut}
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              aria-label="Zoom Out"
            />
            <span className="text-xs font-mono font-medium px-2 py-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              {zoomPercentage}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 w-11 min-h-[44px] min-w-[44px] p-0"
              leftIcon={ZoomIn}
              onClick={handleZoomIn}
              disabled={scale >= 2.5}
              aria-label="Zoom In"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 w-11 min-h-[44px] min-w-[44px] p-0"
              leftIcon={RotateCcw}
              onClick={handleZoomReset}
              aria-label="Reset Zoom"
              title="Reset Zoom"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {filename}
            </span>
          </div>
        </div>

        {/* Scrollable PDF Pages Container */}
        <div className="min-h-[400px] max-h-[65vh] overflow-y-auto overflow-x-auto p-4 rounded-xl bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center gap-6 border border-slate-300 dark:border-slate-800 shadow-inner">
          {isLoading && (
            <div className="py-24 text-center space-y-3 animate-pulse">
              <FileText className="h-8 w-8 mx-auto text-slate-400" />
              <p className="text-xs text-slate-500">Rendering high-fidelity PDF pages...</p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center space-y-3 max-w-sm">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Preview Unavailable
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Download}
                onClick={handleDownloadClick}
              >
                Download PDF File Directly
              </Button>
            </div>
          )}

          {!isLoading && !error && numPages > 0 && (
            <div className="flex flex-col items-center gap-6">
              {Array.from({ length: numPages }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <div className="rounded-lg shadow-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white">
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current[idx] = el
                      }}
                      className="block max-w-full"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 select-none">
                    Page {idx + 1} of {numPages}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
