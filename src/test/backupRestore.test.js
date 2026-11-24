import { describe, it, expect, beforeEach } from 'vitest'
import JSZip from 'jszip'
import { db } from '../database/db.js'
import { createJsonBackupPayload, exportJsonBackup, exportCompleteZipBackup } from '../features/backup/backupService.js'
import { validateAndInspectBackup, executeRestore } from '../features/backup/restoreService.js'
import { createVariant } from '../database/variantRepository.js'
import { createApplication } from '../database/applicationRepository.js'
import { archivePdfExport } from '../database/archiveRepository.js'
import { createEmptyResume } from '../models/resumeSchema.js'

describe('Backup & Restore Service', () => {
  let sampleVariant
  let sampleApp
  let samplePdfBlob

  beforeEach(async () => {
    // Clear test database
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()
    await db.settings.clear()

    // Seed test variant
    const resume = createEmptyResume()
    resume.personalInfo.fullName = 'Fahad Ashfaq'
    resume.personalInfo.headline = 'Product UI/UX Designer'
    sampleVariant = await createVariant({
      name: 'UX Designer Master',
      resumeData: resume,
    })

    // Seed test application
    sampleApp = await createApplication(sampleVariant, {
      companyName: 'Acme Corp',
      jobTitle: 'Lead Product Designer',
    })

    // Seed test archived PDF
    samplePdfBlob = new Blob(['%PDF-1.4 test binary blob data'], { type: 'application/pdf' })
    await archivePdfExport({
      applicationId: sampleApp.id,
      variantId: sampleVariant.id,
      companyName: sampleApp.companyName,
      jobTitle: sampleApp.jobTitle,
      filename: 'Fahad Ashfaq - Lead Product Designer.pdf',
      pdfBlob: samplePdfBlob,
      resumeSnapshot: resume,
      revision: 1,
    })
  })

  describe('createJsonBackupPayload & exportJsonBackup', () => {
    it('creates a structured JSON payload with metadata manifest and no embedded raw Blobs', async () => {
      const payload = await createJsonBackupPayload()

      expect(payload.app).toBe('Resume Studio')
      expect(payload.version).toBe(1)
      expect(payload.variants.length).toBe(1)
      expect(payload.variants[0].id).toBe(sampleVariant.id)

      expect(payload.applications.length).toBe(1)
      expect(payload.applications[0].id).toBe(sampleApp.id)

      expect(payload.archivedPdfs.length).toBe(1)
      const pdfMeta = payload.archivedPdfs[0]
      expect(pdfMeta.applicationId).toBe(sampleApp.id)
      expect(pdfMeta.filename).toBe('Fahad Ashfaq - Lead Product Designer.pdf')
      expect(pdfMeta.blobFilename).toContain('archived-pdfs/')
      // Raw Blob must be omitted from pure JSON
      expect(pdfMeta.pdfBlob).toBeUndefined()
    })

    it('exports a downloadable JSON backup file', async () => {
      const result = await exportJsonBackup()
      expect(result.filename).toMatch(/^resume-studio-backup-\d{4}-\d{2}-\d{2}\.json$/)
      expect(typeof result.jsonString).toBe('string')

      const parsed = JSON.parse(result.jsonString)
      expect(parsed.variants.length).toBe(1)
    })
  })

  describe('exportCompleteZipBackup', () => {
    it('bundles structured metadata and all binary PDF Blobs into a valid ZIP', async () => {
      const result = await exportCompleteZipBackup()
      expect(result.filename).toMatch(/^resume-studio-complete-backup-\d{4}-\d{2}-\d{2}\.zip$/)
      expect(result.pdfCount).toBe(1)
      expect(result.zipBlob).toBeInstanceOf(Blob)

      // Inspect ZIP contents
      const arrayBuffer = await result.zipBlob.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)

      // 1. Check backup.json
      const jsonFile = zip.file('backup.json')
      expect(jsonFile).toBeDefined()
      const jsonText = await jsonFile.async('text')
      const payload = JSON.parse(jsonText)
      expect(payload.applications.length).toBe(1)

      // 2. Check archived PDF binary entry
      const pdfEntryName = payload.archivedPdfs[0].blobFilename
      const pdfFile = zip.file(pdfEntryName)
      expect(pdfFile).toBeDefined()
      const pdfText = await pdfFile.async('text')
      expect(pdfText).toContain('%PDF-1.4 test binary blob data')
    })
  })

  describe('validateAndInspectBackup', () => {
    it('correctly inspects and previews a JSON backup without modifying IndexedDB', async () => {
      const payload = await createJsonBackupPayload()
      const jsonBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const file = new File([jsonBlob], 'backup.json', { type: 'application/json' })

      const inspected = await validateAndInspectBackup(file)
      expect(inspected.type).toBe('json')
      expect(inspected.preview.variantsCount).toBe(1)
      expect(inspected.preview.applicationsCount).toBe(1)
      expect(inspected.preview.archivedPdfsCount).toBe(0)
      expect(inspected.preview.variantConflictCount).toBe(1) // ID already in DB
    })

    it('correctly inspects and previews a complete ZIP backup with binary PDF counts', async () => {
      const { zipBlob } = await exportCompleteZipBackup()
      const file = new File([zipBlob], 'full-backup.zip', { type: 'application/zip' })

      const inspected = await validateAndInspectBackup(file)
      expect(inspected.type).toBe('zip')
      expect(inspected.preview.variantsCount).toBe(1)
      expect(inspected.preview.applicationsCount).toBe(1)
      expect(inspected.preview.archivedPdfsCount).toBe(1)
    })

    it('rejects an invalid or corrupted backup file', async () => {
      const badBlob = new Blob(['{ "corrupted": true }'], { type: 'application/json' })
      const file = new File([badBlob], 'corrupted.json', { type: 'application/json' })

      await expect(validateAndInspectBackup(file)).rejects.toThrow(
        /Invalid backup structure/i
      )
    })
  })

  describe('executeRestore', () => {
    it('restores completely with replace strategy, recreating PDF Blobs intact', async () => {
      const { zipBlob } = await exportCompleteZipBackup()
      const file = new File([zipBlob], 'full-backup.zip', { type: 'application/zip' })
      const inspected = await validateAndInspectBackup(file)

      // Clear the database completely to simulate new device
      await db.variants.clear()
      await db.applications.clear()
      await db.archivedPdfs.clear()

      expect(await db.variants.count()).toBe(0)
      expect(await db.applications.count()).toBe(0)
      expect(await db.archivedPdfs.count()).toBe(0)

      // Execute restore
      const restoreStats = await executeRestore({ backupInspection: inspected, strategy: 'replace' })
      expect(restoreStats.restoredVariants).toBe(1)
      expect(restoreStats.restoredApplications).toBe(1)
      expect(restoreStats.restoredPdfs).toBe(1)

      // Verify records in IndexedDB
      expect(await db.variants.count()).toBe(1)
      expect(await db.applications.count()).toBe(1)
      expect(await db.archivedPdfs.count()).toBe(1)

      const restoredPdf = await db.archivedPdfs.toCollection().first()
      expect(restoredPdf.companyName).toBe('Acme Corp')
      expect(restoredPdf.pdfBlob).toBeInstanceOf(Blob)
      expect(restoredPdf.pdfBlob.size).toBeGreaterThan(0)
    })

    it('restores with merge strategy, retaining existing records while adding incoming non-conflicts', async () => {
      const payload = await createJsonBackupPayload()
      // Modify incoming variant ID and name
      payload.variants[0].id = 'incoming-unique-variant-id'
      payload.variants[0].name = 'Incoming Unique Variant'

      const jsonBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const file = new File([jsonBlob], 'merge-backup.json', { type: 'application/json' })
      const inspected = await validateAndInspectBackup(file)

      const restoreStats = await executeRestore({ backupInspection: inspected, strategy: 'merge' })
      expect(restoreStats.restoredVariants).toBe(1)

      // Verify DB now has 2 variants (existing sampleVariant + incoming-unique-variant-id)
      const allVariants = await db.variants.toArray()
      expect(allVariants.length).toBe(2)
      expect(allVariants.some((v) => v.id === sampleVariant.id)).toBe(true)
      expect(allVariants.some((v) => v.id === 'incoming-unique-variant-id')).toBe(true)
    })
  })
})
