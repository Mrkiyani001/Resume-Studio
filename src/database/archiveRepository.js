/**
 * Resume Studio — Archive Repository
 * Manages immutable PDF binary Blob persistence, linked editable snapshots, and metadata.
 * Strict Rule: Reopening an archived PDF always retrieves the stored binary Blob (never regenerated).
 */

import { db } from './db.js'
import { generateId, cloneResumeData } from '../models/resumeSchema.js'

/**
 * Persists an immutable PDF export archive record and updates application metadata.
 * 
 * @param {Object} params
 * @param {string} params.applicationId
 * @param {string} params.companyName - Required internal archive metadata
 * @param {string} params.jobTitle
 * @param {string} params.variantId
 * @param {number} [params.revision=1]
 * @param {string} params.filename - Formatted as "[Full Name] - [Job Title].pdf"
 * @param {Blob} params.pdfBlob - Exact binary PDF Blob
 * @param {Object} params.resumeSnapshot - Editable resume state at moment of export
 * @returns {Promise<Object>} The persisted archive record
 */
export async function archivePdfExport({
  applicationId,
  companyName,
  jobTitle,
  variantId,
  revision = 1,
  filename,
  pdfBlob,
  resumeSnapshot,
}) {
  if (!applicationId) throw new Error('applicationId is required for archiving.')
  if (!pdfBlob || !(pdfBlob instanceof Blob)) {
    throw new Error('Valid binary pdfBlob is required for archiving.')
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('filename is required for archiving.')
  }

  const now = new Date().toISOString()
  const archiveId = generateId()
  const snapshotCopy = resumeSnapshot ? cloneResumeData(resumeSnapshot) : null

  const archiveRecord = {
    id: archiveId,
    applicationId,
    companyName: (companyName || '').trim(),
    jobTitle: (jobTitle || '').trim(),
    variantId: variantId || '',
    revision: Number(revision) || 1,
    exportedAt: now,
    filename: filename.trim(),
    pdfBlob, // Exact binary Blob stored in IndexedDB
    resumeSnapshot: snapshotCopy,
  }

  // Atomically save the archive record and update application export stats
  await db.transaction('rw', db.archivedPdfs, db.applications, async () => {
    await db.archivedPdfs.add(archiveRecord)

    const app = await db.applications.get(applicationId)
    if (app) {
      await db.applications.update(applicationId, {
        lastExportedAt: now,
        exportCount: (app.exportCount || 0) + 1,
        updatedAt: now,
      })
    }
  })

  return archiveRecord
}

/**
 * Retrieves a single archived PDF record by ID.
 * Returns the exact stored binary Blob.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getArchivedPdfById(id) {
  if (!id) return null
  const record = await db.archivedPdfs.get(id)
  return record || null
}

/**
 * Retrieves all archived PDF exports for an application, sorted by exportedAt descending.
 * @param {string} applicationId
 * @returns {Promise<Array<Object>>}
 */
export async function getArchivedPdfsByApplicationId(applicationId) {
  if (!applicationId) return []
  return db.archivedPdfs
    .where('applicationId')
    .equals(applicationId)
    .reverse()
    .sortBy('exportedAt')
}

/**
 * Retrieves all archived PDF records.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllArchivedPdfs() {
  return db.archivedPdfs.orderBy('exportedAt').reverse().toArray()
}

/**
 * Retrieves all archived filenames across the database for collision checks.
 * @returns {Promise<Array<string>>}
 */
export async function getAllArchivedFilenames() {
  const all = await db.archivedPdfs.toArray()
  return all.map((a) => a.filename)
}

/**
 * Deletes an archived PDF record.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteArchivedPdf(id) {
  if (!id) return
  await db.archivedPdfs.delete(id)
}
