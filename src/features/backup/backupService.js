/**
 * Resume Studio — Complete Backup & Archive Service
 * Generates structured JSON exports and complete ZIP bundles including all binary PDF Blobs.
 */

import JSZip from 'jszip'
import { db } from '../../database/db.js'
import { downloadBlob } from '../pdf-export/exportPipeline.js'

/**
 * Builds the structured JSON backup payload.
 * @returns {Promise<Object>}
 */
export async function createJsonBackupPayload() {
  const [variants, applications, archivedPdfs, settings] = await Promise.all([
    db.variants.toArray(),
    db.applications.toArray(),
    db.archivedPdfs.toArray(),
    db.settings.toArray(),
  ])

  // Map archived PDFs metadata (omitting raw Blob from JSON payload)
  const archivedPdfManifest = archivedPdfs.map((a) => ({
    id: a.id,
    applicationId: a.applicationId,
    companyName: a.companyName,
    jobTitle: a.jobTitle,
    variantId: a.variantId,
    revision: a.revision,
    exportedAt: a.exportedAt,
    filename: a.filename,
    blobFilename: `archived-pdfs/${a.id}_${a.filename}`,
    resumeSnapshot: a.resumeSnapshot,
  }))

  return {
    app: 'Resume Studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    variants,
    applications,
    archivedPdfs: archivedPdfManifest,
    settings,
  }
}

/**
 * Exports a lightweight JSON backup of all structured resume data.
 * @returns {Promise<{ filename: string, jsonString: string }>}
 */
export async function exportJsonBackup() {
  const payload = await createJsonBackupPayload()
  const jsonString = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `resume-studio-backup-${dateStr}.json`

  downloadBlob(blob, filename)
  return { filename, jsonString }
}

/**
 * Exports a complete ZIP backup bundling structured data AND all binary PDF Blobs.
 * @returns {Promise<{ filename: string, zipBlob: Blob, pdfCount: number }>}
 */
export async function exportCompleteZipBackup() {
  const payload = await createJsonBackupPayload()
  const archivedPdfs = await db.archivedPdfs.toArray()

  const zip = new JSZip()

  // 1. Add backup.json
  zip.file('backup.json', JSON.stringify(payload, null, 2))

  // 2. Add all binary PDF Blobs in archived-pdfs/ directory
  const pdfFolder = zip.folder('archived-pdfs')
  for (const archive of archivedPdfs) {
    if (archive.pdfBlob) {
      const entryName = `${archive.id}_${archive.filename}`
      pdfFolder.file(entryName, archive.pdfBlob)
    }
  }

  // 3. Generate ZIP binary Blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `resume-studio-complete-backup-${dateStr}.zip`

  downloadBlob(zipBlob, filename)

  return {
    filename,
    zipBlob,
    pdfCount: archivedPdfs.length,
  }
}
