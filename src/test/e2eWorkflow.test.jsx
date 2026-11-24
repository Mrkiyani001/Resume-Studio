import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import JSZip from 'jszip'
import { db } from '../database/db.js'
import { parseImportFile } from '../features/smart-import/importParser.js'
import { createVariant } from '../database/variantRepository.js'
import { createApplication } from '../database/applicationRepository.js'
import { parseBulkChanges } from '../features/bulk-changes/parser.js'
import { matchBulkChanges } from '../features/bulk-changes/matcher.js'
import { applyBulkChanges } from '../features/bulk-changes/applier.js'
import { MATCH_STATUS } from '../models/bulkChangeSchema.js'
import { generatePdfBlob, exportResumePdf } from '../features/pdf-export/exportPipeline.js'
import { getArchivedPdfsByApplicationId } from '../database/archiveRepository.js'
import { exportCompleteZipBackup } from '../features/backup/backupService.js'
import { validateAndInspectBackup, executeRestore } from '../features/backup/restoreService.js'
import { OFFICIAL_BULK_CHANGE_FIXTURE } from './fixtures/bulkChangesFixture.js'
import { pdfjsLib } from '../lib/pdfWorker.js'
import { cloneResumeData } from '../models/resumeSchema.js'

describe('20-Step End-to-End Master Workflow Verification (Part 17)', () => {
  beforeEach(async () => {
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()
    await db.settings.clear()
  })

  it('executes the full 20-step lifecycle from real DOCX import to PDF archive, bulk changes, and ZIP recovery', async () => {
    // =========================================================================
    // STEP 1: Import authoritative reference .docx file
    // =========================================================================
    const docxPath = path.resolve(process.cwd(), 'reference/Fahad Ashfaq - Product UX Designer 2026 .docx')
    expect(fs.existsSync(docxPath)).toBe(true)

    const fileBuffer = fs.readFileSync(docxPath)
    const importFile = new File([fileBuffer], 'Fahad Ashfaq - Product UX Designer 2026 .docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const importResult = await parseImportFile(importFile)
    expect(importResult).toBeDefined()
    expect(importResult.resumeData).toBeDefined()

    // =========================================================================
    // STEP 2: Verify extracted content from reference document
    // =========================================================================
    const importedResume = importResult.resumeData
    expect(importedResume.personalInfo.fullName).toBe('Fahad Ashfaq')
    expect(importedResume.personalInfo.headline).toBe('Product UI/UX Designer')
    expect(importedResume.personalInfo.phone).toBe('+92 325 8028150')
    expect(importedResume.personalInfo.email).toBe('fahadashfaq.sh@gmail.com')
    expect(importedResume.personalInfo.linkedin.url).toContain('linkedin.com/in/fahadashfaq-ux')
    expect(importedResume.personalInfo.portfolio.url).toContain('fahadashfaq.framer.website')
    expect(importedResume.summary).toContain('Product UI/UX designer specialising in complex systems')
    expect(importedResume.workExperiences.length).toBe(3)
    expect(importedResume.workExperiences[0].employer).toContain('Ghani Branding Agency')
    expect(importedResume.education[0].institution).toContain('Virtual University')

    // Snapshot of the original master resume data to prove immutability later
    const originalMasterSnapshot = cloneResumeData(importedResume)

    // =========================================================================
    // STEP 3: Save as master variant in Dexie
    // =========================================================================
    const masterVariant = await createVariant({
      name: 'UX Lead Reference Master',
      resumeData: importedResume,
    })
    expect(masterVariant.id).toBeDefined()
    expect(await db.variants.count()).toBe(1)

    // =========================================================================
    // STEP 4: Create independent application from master variant
    // =========================================================================
    const application = await createApplication(masterVariant, {
      companyName: 'Fintech Solutions Corp',
      jobTitle: 'Senior Product Designer',
    })
    expect(application.id).toBeDefined()
    expect(application.variantId).toBe(masterVariant.id)
    // Guarantee zero reference sharing
    expect(application.resumeData).not.toBe(masterVariant.resumeData)
    expect(application.resumeData.personalInfo).not.toBe(masterVariant.resumeData.personalInfo)

    // =========================================================================
    // STEP 5: Enter and verify company name and job title
    // =========================================================================
    expect(application.companyName).toBe('Fintech Solutions Corp')
    expect(application.jobTitle).toBe('Senior Product Designer')
    // Application headline defaults to target jobTitle
    expect(application.resumeData.personalInfo.headline).toBe('Senior Product Designer')

    // =========================================================================
    // STEP 6: Paste Part 8.1 Old/New bulk change fixture
    // =========================================================================
    const parsedChanges = parseBulkChanges(OFFICIAL_BULK_CHANGE_FIXTURE)
    expect(parsedChanges.length).toBe(4) // Summary, 2 Ghani bullets, 1 Skills entry

    // =========================================================================
    // STEP 7: Review proposed changes (deterministic matching)
    // =========================================================================
    const matchResults = matchBulkChanges(parsedChanges, application.resumeData)
    expect(matchResults).toHaveLength(4)
    // All 4 changes should match cleanly against the imported resume
    expect(matchResults.every((m) => m.status === MATCH_STATUS.MATCHED)).toBe(true)

    // =========================================================================
    // STEP 8: Accept selected changes
    // STEP 9: Reject at least one change
    // =========================================================================
    // Accept Summary (index 0), Ghani Bullet 1 (index 1), Skills (index 3); REJECT Ghani Bullet 2 (index 2)
    matchResults[0].accepted = true // Summary
    matchResults[1].accepted = true // Ghani Bullet 1
    matchResults[2].accepted = false // Ghani Bullet 2 -> REJECTED
    matchResults[3].accepted = true // Skills

    const updatedResumeData = applyBulkChanges(application.resumeData, matchResults)

    // Verify accepted changes applied:
    expect(updatedResumeData.summary).toContain('Mid-level Product UI/UX Designer with 2.5 years')
    const ghaniExp = updatedResumeData.workExperiences.find((w) => w.employer.includes('Ghani'))
    expect(ghaniExp.bullets[0].text).toContain('Design intuitive, user-centered interfaces')

    // Verify rejected change NOT applied (original bullet retained):
    expect(ghaniExp.bullets[1].text).toContain('Define interaction patterns and component standards in Figma')
    expect(ghaniExp.bullets[1].text).not.toContain('Maintain and evolve scalable design systems')

    // Save customized resumeData into application
    application.resumeData = updatedResumeData
    await db.applications.put(application)

    // =========================================================================
    // STEP 10: Generate PDF binary Blob
    // =========================================================================
    const pdfBlob = await generatePdfBlob(application.resumeData)
    expect(pdfBlob).toBeInstanceOf(Blob)
    expect(pdfBlob.size).toBeGreaterThan(1000)

    // Helper to extract text from PDF Blob using pdfjsLib
    const extractPdfText = async (blob) => {
      const buffer = await blob.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      const pdfDoc = await loadingTask.promise
      let text = ''
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((it) => it.str).join(' ') + '\n'
      }
      return text
    }

    const pdfText = await extractPdfText(pdfBlob)

    // =========================================================================
    // STEP 11: Confirm company name does NOT appear in PDF
    // =========================================================================
    expect(pdfText).not.toContain('Fintech Solutions Corp')
    expect(pdfText.toLowerCase()).not.toContain('fintech solutions')

    // =========================================================================
    // STEP 12: Confirm job title appears beneath user's name
    // =========================================================================
    expect(pdfText.toLowerCase()).toContain('fahad ashfaq')
    expect(pdfText.toLowerCase()).toContain('senior product designer')

    // =========================================================================
    // STEP 13: Confirm LinkedIn/Portfolio visibility toggle works
    // =========================================================================
    const toggledResume = cloneResumeData(application.resumeData)
    toggledResume.personalInfo.linkedin.isVisible = false
    toggledResume.personalInfo.portfolio.isVisible = true

    const toggledBlob = await generatePdfBlob(toggledResume)
    const toggledPdfText = await extractPdfText(toggledBlob)

    // LinkedIn should be omitted from contact row, Portfolio must remain
    expect(toggledPdfText).not.toContain('linkedin.com')
    expect(toggledPdfText).toContain('Portfolio')

    // =========================================================================
    // STEP 14: Confirm PDF is saved in archive (atomic export)
    // =========================================================================
    const exportResult = await exportResumePdf({
      target: { type: 'application', id: application.id },
      resumeData: application.resumeData,
      record: application,
    })
    expect(exportResult.success).toBe(true)
    expect(exportResult.filename).toBe('Fahad Ashfaq - Senior Product Designer.pdf')
    expect(exportResult.filename).not.toContain('Fintech')
    expect(exportResult.filename.toLowerCase()).not.toContain('resume')

    const archives = await getArchivedPdfsByApplicationId(application.id)
    expect(archives).toHaveLength(1)
    const archiveRecord = archives[0]
    expect(archiveRecord.companyName).toBe('Fintech Solutions Corp')
    expect(archiveRecord.jobTitle).toBe('Senior Product Designer')
    expect(archiveRecord.pdfBlob).toBeInstanceOf(Blob)

    // =========================================================================
    // STEP 15: Simulate app close & reopen (fresh IndexedDB query)
    // =========================================================================
    // Fresh independent query
    const freshApp = await db.applications.get(application.id)
    const freshArchive = await db.archivedPdfs.get(archiveRecord.id)
    const freshMaster = await db.variants.get(masterVariant.id)

    // =========================================================================
    // STEP 16: Retrieve editable application and verify customization state
    // =========================================================================
    expect(freshApp).toBeDefined()
    expect(freshApp.companyName).toBe('Fintech Solutions Corp')
    expect(freshApp.jobTitle).toBe('Senior Product Designer')
    expect(freshApp.exportCount).toBe(1)
    expect(freshApp.resumeData.summary).toContain('Mid-level Product UI/UX Designer with 2.5 years')

    // =========================================================================
    // STEP 17: Retrieve exact archived PDF binary (never regenerated)
    // =========================================================================
    expect(freshArchive).toBeDefined()
    expect(freshArchive.filename).toBe('Fahad Ashfaq - Senior Product Designer.pdf')
    expect(freshArchive.pdfBlob).toBeInstanceOf(Blob)
    expect(freshArchive.pdfBlob.size).toBe(exportResult.pdfBlob.size)

    // =========================================================================
    // STEP 18: Confirm original master variant is completely unchanged
    // =========================================================================
    expect(freshMaster).toBeDefined()
    expect(freshMaster.name).toBe('UX Lead Reference Master')
    expect(freshMaster.resumeData.summary).toBe(originalMasterSnapshot.summary)
    expect(freshMaster.resumeData.personalInfo.headline).toBe('Product UI/UX Designer')
    const freshMasterGhani = freshMaster.resumeData.workExperiences.find((w) => w.employer.includes('Ghani'))
    expect(freshMasterGhani.bullets[0].text).toContain('Lead UI/UX design across digital product workstreams')
    expect(freshMasterGhani.bullets[0].text).not.toContain('Design intuitive, user-centered interfaces')

    // =========================================================================
    // STEP 19: Export complete ZIP backup (data + PDF binaries)
    // =========================================================================
    const zipExportResult = await exportCompleteZipBackup()
    expect(zipExportResult.filename).toContain('.zip')
    expect(zipExportResult.pdfCount).toBe(1)
    expect(zipExportResult.zipBlob).toBeInstanceOf(Blob)

    // Inspect the generated ZIP
    const zipData = await zipExportResult.zipBlob.arrayBuffer()
    const zip = await JSZip.loadAsync(zipData)
    expect(zip.file('backup.json')).toBeDefined()

    // =========================================================================
    // STEP 20: Clear DB, restore ZIP backup, and verify complete fidelity
    // =========================================================================
    // 20a. Clear all tables completely
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()
    await db.settings.clear()

    expect(await db.variants.count()).toBe(0)
    expect(await db.applications.count()).toBe(0)
    expect(await db.archivedPdfs.count()).toBe(0)

    // 20b. Inspect backup file
    const restoreFile = new File([zipExportResult.zipBlob], 'full-backup.zip', { type: 'application/zip' })
    const backupInspection = await validateAndInspectBackup(restoreFile)
    expect(backupInspection.type).toBe('zip')
    expect(backupInspection.preview.variantsCount).toBe(1)
    expect(backupInspection.preview.applicationsCount).toBe(1)
    expect(backupInspection.preview.archivedPdfsCount).toBe(1)

    // 20c. Execute atomic replace restore
    const restoreResult = await executeRestore({ backupInspection, strategy: 'replace' })
    expect(restoreResult.success).toBe(true)
    expect(restoreResult.restoredVariants).toBe(1)
    expect(restoreResult.restoredApplications).toBe(1)
    expect(restoreResult.restoredPdfs).toBe(1)

    // 20d. Verify restored database records and binary Blob integrity
    const restoredVariants = await db.variants.toArray()
    expect(restoredVariants).toHaveLength(1)
    expect(restoredVariants[0].name).toBe('UX Lead Reference Master')
    expect(restoredVariants[0].resumeData.personalInfo.fullName).toBe('Fahad Ashfaq')

    const restoredApps = await db.applications.toArray()
    expect(restoredApps).toHaveLength(1)
    expect(restoredApps[0].companyName).toBe('Fintech Solutions Corp')
    expect(restoredApps[0].resumeData.summary).toContain('Mid-level Product UI/UX Designer')

    const restoredArchives = await db.archivedPdfs.toArray()
    expect(restoredArchives).toHaveLength(1)
    const restoredArchive = restoredArchives[0]
    expect(restoredArchive.filename).toBe('Fahad Ashfaq - Senior Product Designer.pdf')
    expect(restoredArchive.pdfBlob).toBeInstanceOf(Blob)
    expect(restoredArchive.pdfBlob.size).toBeGreaterThan(1000)

    // Extract text from the restored PDF Blob to confirm it remains valid
    const restoredPdfText = await extractPdfText(restoredArchive.pdfBlob)
    expect(restoredPdfText.toLowerCase()).toContain('fahad ashfaq')
    expect(restoredPdfText.toLowerCase()).not.toContain('fintech solutions')
  })
})
