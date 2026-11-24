/**
 * Resume Studio — Validated Restore Service
 * Validates, previews, and restores structured data & binary PDF Blobs from JSON and ZIP backups.
 */

import JSZip from 'jszip'
import { db } from '../../database/db.js'
import { normalizeResumeData } from '../../models/resumeSchema.js'

/**
 * Validates a backup file and generates an inspection preview without touching IndexedDB.
 *
 * @param {File|Blob} file Backup file (.json or .zip)
 * @returns {Promise<{ type: 'json'|'zip', payload: Object, zipInstance: Object|null, preview: Object }>}
 */
export async function validateAndInspectBackup(file) {
  if (!file) {
    throw new Error('Please select a valid backup file to restore.')
  }

  const filename = file.name || 'backup'
  const isZip = filename.toLowerCase().endsWith('.zip') || file.type === 'application/zip'
  const isJson = filename.toLowerCase().endsWith('.json') || file.type === 'application/json'

  if (!isZip && !isJson) {
    throw new Error('Invalid backup file type. Supported formats are .json and .zip.')
  }

  // 1. Handle JSON Backup
  if (isJson) {
    const text = await file.text()
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('Corrupted JSON file. Unable to parse backup structure.')
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup structure: expected a JSON object.')
    }
    if (!Array.isArray(parsed.variants)) {
      throw new Error('Invalid backup structure: "variants" array is required.')
    }
    if (!Array.isArray(parsed.applications)) {
      throw new Error('Invalid backup structure: "applications" array is required.')
    }

    // Check existing conflicts
    const [existingVariants, existingApps] = await Promise.all([
      db.variants.toArray(),
      db.applications.toArray(),
    ])

    const variantConflictCount = parsed.variants.filter((v) =>
      existingVariants.some((ev) => ev.id === v.id)
    ).length
    const appConflictCount = parsed.applications.filter((a) =>
      existingApps.some((ea) => ea.id === a.id)
    ).length

    return {
      type: 'json',
      payload: parsed,
      zipInstance: null,
      preview: {
        exportedAt: parsed.exportedAt || 'Unknown',
        variantsCount: parsed.variants.length,
        applicationsCount: parsed.applications.length,
        archivedPdfsCount: 0,
        variantConflictCount,
        appConflictCount,
      },
    }
  }

  // 2. Handle ZIP Complete Backup
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    const jsonEntry = zip.file('backup.json')
    if (!jsonEntry) {
      throw new Error('Corrupted ZIP backup: missing "backup.json" metadata manifest.')
    }

    const jsonText = await jsonEntry.async('text')
    const parsed = JSON.parse(jsonText)

    if (!Array.isArray(parsed.variants) || !Array.isArray(parsed.applications)) {
      throw new Error('Corrupted backup.json inside ZIP: missing variants or applications.')
    }

    const archivedPdfManifest = Array.isArray(parsed.archivedPdfs) ? parsed.archivedPdfs : []

    // Verify all referenced PDF Blobs exist in the ZIP
    let validPdfCount = 0
    for (const a of archivedPdfManifest) {
      if (a.blobFilename && zip.file(a.blobFilename)) {
        validPdfCount++
      }
    }

    const [existingVariants, existingApps, existingPdfs] = await Promise.all([
      db.variants.toArray(),
      db.applications.toArray(),
      db.archivedPdfs.toArray(),
    ])

    const variantConflictCount = parsed.variants.filter((v) =>
      existingVariants.some((ev) => ev.id === v.id)
    ).length
    const appConflictCount = parsed.applications.filter((a) =>
      existingApps.some((ea) => ea.id === a.id)
    ).length
    const pdfConflictCount = archivedPdfManifest.filter((a) =>
      existingPdfs.some((ep) => ep.id === a.id)
    ).length

    return {
      type: 'zip',
      payload: parsed,
      zipInstance: zip,
      preview: {
        exportedAt: parsed.exportedAt || 'Unknown',
        variantsCount: parsed.variants.length,
        applicationsCount: parsed.applications.length,
        archivedPdfsCount: validPdfCount,
        variantConflictCount,
        appConflictCount,
        pdfConflictCount,
      },
    }
  } catch (err) {
    throw new Error(`Failed to inspect ZIP backup: ${err.message || 'Corrupted archive format.'}`, {
      cause: err,
    })
  }
}

/**
 * Atomically executes a validated restore into Dexie IndexedDB.
 *
 * @param {Object} options
 * @param {Object} options.backupInspection Output from validateAndInspectBackup
 * @param {'replace'|'merge'} [options.strategy='replace']
 * @returns {Promise<{ success: boolean, restoredVariants: number, restoredApplications: number, restoredPdfs: number }>}
 */
export async function executeRestore({ backupInspection, strategy = 'replace' }) {
  if (!backupInspection || !backupInspection.payload) {
    throw new Error('Valid backup inspection payload is required to execute restore.')
  }

  const { type, payload, zipInstance } = backupInspection
  const { variants = [], applications = [], archivedPdfs = [], settings = [] } = payload

  // Normalize variants
  const normalizedVariants = variants.map((v) => ({
    ...v,
    resumeData: normalizeResumeData(v.resumeData),
  }))

  // Normalize applications
  const normalizedApplications = applications.map((a) => ({
    ...a,
    resumeData: normalizeResumeData(a.resumeData),
  }))

  // Reconstruct archived PDF Blobs if ZIP
  const reconstructedArchivedPdfs = []
  if (type === 'zip' && zipInstance && Array.isArray(archivedPdfs)) {
    for (const a of archivedPdfs) {
      if (a.blobFilename && zipInstance.file(a.blobFilename)) {
        const fileData = await zipInstance.file(a.blobFilename).async('blob')
        // Wrap in typed application/pdf Blob
        const pdfBlob = new Blob([fileData], { type: 'application/pdf' })
        reconstructedArchivedPdfs.push({
          id: a.id,
          applicationId: a.applicationId,
          companyName: a.companyName || '',
          jobTitle: a.jobTitle || '',
          variantId: a.variantId || '',
          revision: Number(a.revision) || 1,
          exportedAt: a.exportedAt || new Date().toISOString(),
          filename: a.filename,
          pdfBlob,
          resumeSnapshot: a.resumeSnapshot ? normalizeResumeData(a.resumeSnapshot) : null,
        })
      }
    }
  }

  // Execute Dexie Transaction
  await db.transaction('rw', [db.variants, db.applications, db.archivedPdfs, db.settings], async () => {
    if (strategy === 'replace') {
      await db.variants.clear()
      await db.applications.clear()
      await db.archivedPdfs.clear()
      await db.settings.clear()

      if (normalizedVariants.length > 0) {
        await db.variants.bulkAdd(normalizedVariants)
      }
      if (normalizedApplications.length > 0) {
        await db.applications.bulkAdd(normalizedApplications)
      }
      if (reconstructedArchivedPdfs.length > 0) {
        await db.archivedPdfs.bulkAdd(reconstructedArchivedPdfs)
      }
      if (settings.length > 0) {
        await db.settings.bulkAdd(settings)
      }
    } else {
      // Merge strategy: put/update
      for (const v of normalizedVariants) {
        await db.variants.put(v)
      }
      for (const a of normalizedApplications) {
        await db.applications.put(a)
      }
      for (const p of reconstructedArchivedPdfs) {
        await db.archivedPdfs.put(p)
      }
      for (const s of settings) {
        await db.settings.put(s)
      }
    }
  })

  return {
    success: true,
    restoredVariants: normalizedVariants.length,
    restoredApplications: normalizedApplications.length,
    restoredPdfs: reconstructedArchivedPdfs.length,
  }
}
