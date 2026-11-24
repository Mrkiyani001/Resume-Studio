/**
 * Resume Studio — Smart Import File Parser
 * Handles binary DOCX (via Mammoth.js) and selectable-text PDF (via pdfjs-dist).
 * Detects scanned PDFs without OCR/hallucination and routes to deterministic classifier.
 */

import mammoth from 'mammoth'
import { pdfjsLib } from '../../lib/pdfWorker.js'
import { classifyDocxHtml, classifyPlainText } from './classifier.js'

/**
 * Parses an uploaded file into structured resumeData and unassigned content.
 *
 * @param {File|Blob} file File or Blob object
 * @returns {Promise<{ resumeData: Object, unassignedContent: Array<string>, filename: string }>}
 */
export async function parseImportFile(file) {
  if (!file) {
    throw new Error('Please select a valid resume file to import.')
  }

  const filename = file.name || 'Imported Resume'
  const lowerName = filename.toLowerCase()
  const arrayBuffer = await file.arrayBuffer()

  // 1. DOCX Import
  if (lowerName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const buffer = typeof globalThis.Buffer !== 'undefined' ? globalThis.Buffer.from(arrayBuffer) : arrayBuffer
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer, buffer })
      const { resumeData, unassignedContent } = classifyDocxHtml(html)
      return { resumeData, unassignedContent, filename }
    } catch (err) {
      throw new Error(`Failed to parse DOCX file: ${err.message || 'Corrupted document format.'}`, {
        cause: err,
      })
    }
  }

  // 2. PDF Import
  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const data = new Uint8Array(arrayBuffer)
      const loadingTask = pdfjsLib.getDocument({ data })
      const pdfDoc = await loadingTask.promise

      let fullText = ''
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const textContent = await page.getTextContent()
        const pageString = textContent.items.map((item) => item.str).join(' ')
        fullText += pageString + '\n'
      }

      // Scanned PDF Detection Rule: If extractable text is under 50 characters, reject with clear error
      const cleanChars = fullText.replace(/\s+/g, '')
      if (cleanChars.length < 50 || (pdfDoc.numPages > 0 && cleanChars.length / pdfDoc.numPages < 20)) {
        throw new Error(
          'Scanned PDF detected. This document does not contain selectable digital text. Please upload a digital PDF, a DOCX file, or create your resume manually.'
        )
      }

      const { resumeData, unassignedContent } = classifyPlainText(fullText)
      return { resumeData, unassignedContent, filename }
    } catch (err) {
      if (err.message && err.message.includes('Scanned PDF detected')) {
        throw err
      }
      throw new Error(`Failed to parse PDF file: ${err.message || 'Corrupted or unreadable PDF.'}`, {
        cause: err,
      })
    }
  }

  // 3. Fallback: Plain Text
  if (lowerName.endsWith('.txt')) {
    const text = new TextDecoder().decode(arrayBuffer)
    const { resumeData, unassignedContent } = classifyPlainText(text)
    return { resumeData, unassignedContent, filename }
  }

  throw new Error('Unsupported file format. Please upload a .docx, .pdf, or .txt resume file.')
}
