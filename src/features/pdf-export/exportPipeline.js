/**
 * Resume Studio — Atomic PDF Generation & Export Pipeline
 * Pure, reliable export pipeline handling validation, PDF generation,
 * Dexie atomic persistence, and browser download triggers.
 */

import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { PdfDocument } from '../../components/preview/PdfDocument.jsx'
import { sanitizeFilename, getUniqueFilename } from '../../lib/sanitizers.js'
import { archivePdfExport, getAllArchivedFilenames } from '../../database/archiveRepository.js'
import { cloneResumeData } from '../../models/resumeSchema.js'

/**
 * Generates an authentic selectable-text PDF Blob from structured resumeData.
 * @param {Object} resumeData
 * @returns {Promise<Blob>}
 */
export async function generatePdfBlob(resumeData) {
  if (!resumeData) {
    throw new Error('Resume data is required to generate PDF.')
  }
  const documentElement = React.createElement(PdfDocument, { resumeData })
  const instance = pdf(documentElement)
  return await instance.toBlob()
}

/**
 * Triggers a browser download for a Blob.
 * Handles headless and SSR environments safely.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {boolean} Whether download trigger was executed
 */
export function downloadBlob(blob, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  try {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    // Prevent JSDOM unhandled navigation warning in test environment
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITEST) {
      link.addEventListener('click', (e) => e.preventDefault())
    }

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(url)
      } catch {
        // Ignore revoke errors
      }
    }, 1000)

    return true
  } catch (err) {
    console.error('Failed to trigger browser download:', err)
    return false
  }
}

/**
 * Executes the full atomic export pipeline:
 * 1. Sanitizes filename matching [Full Name] - [Job Title].pdf (zero company name, no "Resume" suffix)
 * 2. Checks and prevents filename collisions
 * 3. Generates PDF binary Blob via @react-pdf/renderer
 * 4. For applications: atomically stores PDF Blob + editable snapshot + metadata in Dexie
 * 5. Triggers browser download
 *
 * @param {Object} options
 * @param {{ type: 'variant' | 'application', id: string }} options.target
 * @param {Object} options.resumeData
 * @param {Object} [options.record] Parent application or variant record
 * @returns {Promise<{ success: boolean, filename: string, pdfBlob: Blob, archiveRecord: Object|null }>}
 */
export async function exportResumePdf({ target, resumeData, record = {} }) {
  if (!resumeData) {
    throw new Error('Cannot export PDF: resumeData is missing.')
  }

  // 1. Determine Full Name and Job Title
  const fullName = resumeData.personalInfo?.fullName || 'Candidate'
  const jobTitle =
    target.type === 'application'
      ? record.jobTitle || resumeData.personalInfo?.headline || 'Professional'
      : resumeData.personalInfo?.headline || record.name || 'Professional'

  const baseFilename = sanitizeFilename(fullName, jobTitle)

  // 2. Resolve Collisions
  let uniqueFilename = baseFilename
  try {
    const existingFilenames = await getAllArchivedFilenames()
    uniqueFilename = getUniqueFilename(baseFilename, existingFilenames)
  } catch {
    // If DB check fails, proceed with base filename
  }

  // 3. Generate PDF Blob
  const pdfBlob = await generatePdfBlob(resumeData)

  let archiveRecord = null

  // 4. Atomic Archiving for Applications
  if (target.type === 'application') {
    archiveRecord = await archivePdfExport({
      applicationId: target.id,
      companyName: record.companyName || '',
      jobTitle: record.jobTitle || resumeData.personalInfo?.headline || 'Professional',
      variantId: record.variantId || '',
      revision: record.revision || 1,
      filename: uniqueFilename,
      pdfBlob,
      resumeSnapshot: cloneResumeData(resumeData),
    })
  }

  // 5. Trigger Browser Download
  downloadBlob(pdfBlob, uniqueFilename)

  return {
    success: true,
    filename: uniqueFilename,
    pdfBlob,
    archiveRecord,
  }
}
