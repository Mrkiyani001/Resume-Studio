import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../database/db.js'
import {
  seedInitialVariantsIfEmpty,
  getAllVariants,
  getVariantById,
  createVariant,
  updateVariant,
  renameVariant,
  duplicateVariant,
  deleteVariant,
} from '../database/variantRepository.js'
import {
  createApplication,
  getApplicationById,
  getAllApplications,
  searchApplications,
  updateApplication,
  duplicateApplication,
  deleteApplication,
  rollbackApplicationBatch,
} from '../database/applicationRepository.js'
import {
  archivePdfExport,
  getArchivedPdfById,
  getArchivedPdfsByApplicationId,
  getAllArchivedPdfs,
} from '../database/archiveRepository.js'
import { createEmptyResume } from '../models/resumeSchema.js'

describe('Database Repositories (Dexie + fake-indexeddb)', () => {
  beforeEach(async () => {
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()
  })

  describe('Variant Repository', () => {
    it('seeds 4 initial master variants idempotently', async () => {
      const firstSeed = await seedInitialVariantsIfEmpty()
      expect(firstSeed).toHaveLength(4)

      const names = firstSeed.map((v) => v.name)
      expect(names).toContain('Product Design')
      expect(names).toContain('IT & Software Operations')
      expect(names).toContain('Business & Administrative Operations')
      expect(names).toContain('Data & Digital Operations')

      // Second run must not duplicate
      const secondSeed = await seedInitialVariantsIfEmpty()
      expect(secondSeed).toHaveLength(4)
      const count = await db.variants.count()
      expect(count).toBe(4)
    })

    it('performs CRUD operations on variants', async () => {
      const created = await createVariant({
        name: 'Custom Mobile Engineering',
        resumeData: createEmptyResume(),
      })

      expect(created.id).toBeDefined()
      expect(created.name).toBe('Custom Mobile Engineering')

      const retrieved = await getVariantById(created.id)
      expect(retrieved).toBeDefined()
      expect(retrieved.name).toBe('Custom Mobile Engineering')

      await renameVariant(created.id, 'Mobile Lead Engineering')
      const renamed = await getVariantById(created.id)
      expect(renamed.name).toBe('Mobile Lead Engineering')

      await deleteVariant(created.id)
      const deleted = await getVariantById(created.id)
      expect(deleted).toBeNull()
    })

    it('guarantees strict variant independence on duplication', async () => {
      const original = await createVariant({
        name: 'Design Ops',
        resumeData: {
          ...createEmptyResume(),
          personalInfo: {
            ...createEmptyResume().personalInfo,
            fullName: 'Fahad Ashfaq',
          },
        },
      })

      const duplicate = await duplicateVariant(original.id)
      expect(duplicate.id).not.toBe(original.id)
      expect(duplicate.name).toBe('Design Ops (Copy)')

      // Mutate duplicate in database
      await updateVariant(duplicate.id, {
        resumeData: {
          ...duplicate.resumeData,
          personalInfo: {
            ...duplicate.resumeData.personalInfo,
            fullName: 'Modified In Duplicate Only',
          },
        },
      })

      // Verify original is untouched
      const originalCheck = await getVariantById(original.id)
      expect(originalCheck.resumeData.personalInfo.fullName).toBe('Fahad Ashfaq')
    })
  })

  describe('Application Repository & Master/Application Isolation', () => {
    it('guarantees strict master/application deep-copy isolation in both directions', async () => {
      await seedInitialVariantsIfEmpty()
      const variants = await getAllVariants()
      const master = variants.find((v) => v.name === 'Product Design')

      // 1. Create Application from Master
      const app = await createApplication(master, {
        companyName: 'Linear App',
        jobTitle: 'Senior Product Designer',
      })

      expect(app.id).toBeDefined()
      expect(app.companyName).toBe('Linear App')
      expect(app.jobTitle).toBe('Senior Product Designer')
      expect(app.resumeData.personalInfo.headline).toBe('Senior Product Designer')

      // 2. Mutate application
      await updateApplication(app.id, {
        resumeData: {
          ...app.resumeData,
          summary: 'Application-specific tailored summary',
        },
      })

      // 3. Verify master variant remains untouched
      const masterCheck = await getVariantById(master.id)
      expect(masterCheck.resumeData.summary).not.toBe('Application-specific tailored summary')
      expect(masterCheck.resumeData.summary).toContain('Product UI/UX designer')

      // 4. Mutate master variant
      await updateVariant(master.id, {
        name: 'Product Design (Renamed)',
        resumeData: {
          ...masterCheck.resumeData,
          personalInfo: {
            ...masterCheck.resumeData.personalInfo,
            fullName: 'Updated Master Name',
          },
        },
      })

      // 5. Verify existing application is NOT retroactively changed
      const appCheck = await getApplicationById(app.id)
      expect(appCheck.resumeData.personalInfo.fullName).toBe('Fahad Ashfaq')
      expect(appCheck.variantName).toBe('Product Design')
    })

    it('searches and filters applications accurately', async () => {
      const v = await createVariant({ name: 'Ops', resumeData: createEmptyResume() })
      await createApplication(v, { companyName: 'Stripe', jobTitle: 'Product Designer' })
      await createApplication(v, { companyName: 'Airbnb', jobTitle: 'Design System Lead' })
      await createApplication(v, { companyName: 'Figma', jobTitle: 'Product Manager' })

      const stripeResults = await searchApplications({ query: 'stripe' })
      expect(stripeResults).toHaveLength(1)
      expect(stripeResults[0].companyName).toBe('Stripe')

      const designResults = await searchApplications({ query: 'Design' })
      expect(designResults).toHaveLength(2)

      const all = await getAllApplications()
      expect(all).toHaveLength(3)
    })

    it('duplicates and deletes applications independently', async () => {
      const v = await createVariant({ name: 'Ops', resumeData: createEmptyResume() })
      const app = await createApplication(v, { companyName: 'Notion', jobTitle: 'Lead' })

      const dup = await duplicateApplication(app.id)
      expect(dup.companyName).toBe('Notion (Copy)')
      expect(dup.id).not.toBe(app.id)

      await deleteApplication(app.id)
      const check = await getApplicationById(app.id)
      expect(check).toBeNull()

      const dupCheck = await getApplicationById(dup.id)
      expect(dupCheck).toBeDefined()
    })

    it('rolls back batch mutations via rollbackApplicationBatch', async () => {
      const v = await createVariant({ name: 'Ops', resumeData: createEmptyResume() })
      const app = await createApplication(v, { companyName: 'OpenAI', jobTitle: 'UI Designer' })

      // Create snapshot before batch changes
      await updateApplication(app.id, {
        resumeData: {
          ...app.resumeData,
          summary: 'Bulk modified text',
        },
      }, { createSnapshot: true, snapshotReason: 'Bulk Parser Batch' })

      const modifiedApp = await getApplicationById(app.id)
      expect(modifiedApp.revision).toBe(2)
      expect(modifiedApp.resumeData.summary).toBe('Bulk modified text')

      // Rollback
      const rolledBack = await rollbackApplicationBatch(app.id)
      expect(rolledBack.revision).toBe(1)
      expect(rolledBack.resumeData.summary).toBe('')
    })
  })

  describe('Archive Repository (Immutable PDF Binary Blobs)', () => {
    it('persists and retrieves exact binary PDF Blob without regenerating', async () => {
      const v = await createVariant({ name: 'Ops', resumeData: createEmptyResume() })
      const app = await createApplication(v, {
        companyName: 'Datadog',
        jobTitle: 'Product Designer',
      })

      const mockPdfBinary = new Blob(['%PDF-1.4 Mock Binary PDF Stream Content'], {
        type: 'application/pdf',
      })

      const archive = await archivePdfExport({
        applicationId: app.id,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        variantId: app.variantId,
        revision: 1,
        filename: 'Fahad Ashfaq - Product Designer.pdf',
        pdfBlob: mockPdfBinary,
        resumeSnapshot: app.resumeData,
      })

      expect(archive.id).toBeDefined()
      expect(archive.filename).toBe('Fahad Ashfaq - Product Designer.pdf')

      // Retrieve by ID
      const retrieved = await getArchivedPdfById(archive.id)
      expect(retrieved).toBeDefined()
      expect(retrieved.filename).toBe('Fahad Ashfaq - Product Designer.pdf')
      expect(retrieved.pdfBlob).toBeInstanceOf(Blob)
      expect(retrieved.pdfBlob.size).toBe(mockPdfBinary.size)

      // Verify binary content
      const text = await retrieved.pdfBlob.text()
      expect(text).toBe('%PDF-1.4 Mock Binary PDF Stream Content')

      // Verify application export metadata was updated
      const updatedApp = await getApplicationById(app.id)
      expect(updatedApp.exportCount).toBe(1)
      expect(updatedApp.lastExportedAt).toBeDefined()

      // Re-exporting creates a new revision without overwriting prior archive
      const secondPdfBinary = new Blob(['%PDF-1.4 Second Revision Binary Stream'], {
        type: 'application/pdf',
      })
      const archive2 = await archivePdfExport({
        applicationId: app.id,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        variantId: app.variantId,
        revision: 2,
        filename: 'Fahad Ashfaq - Product Designer.pdf',
        pdfBlob: secondPdfBinary,
        resumeSnapshot: app.resumeData,
      })
      expect(archive2.id).toBeDefined()

      const allArchives = await getArchivedPdfsByApplicationId(app.id)
      expect(allArchives).toHaveLength(2)
      expect(allArchives[0].id).not.toBe(allArchives[1].id)

      const totalArchives = await getAllArchivedPdfs()
      expect(totalArchives).toHaveLength(2)
    })
  })
})
