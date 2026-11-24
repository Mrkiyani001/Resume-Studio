import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../database/db.js'
import { INITIAL_VARIANTS } from '../database/seeds/initialVariants.js'
import { createApplication, updateApplication } from '../database/applicationRepository.js'
import {
  generatePdfBlob,
  exportResumePdf,
} from '../features/pdf-export/exportPipeline.js'
import { getArchivedPdfsByApplicationId } from '../database/archiveRepository.js'
import { ApplicationsView } from '../features/applications/ApplicationsView.jsx'
import { ToastProvider } from '../components/ui/Toast.jsx'
import { cloneResumeData } from '../models/resumeSchema.js'

describe('PDF Generation, Atomic Archiving & Retrieval (Phase 6)', () => {
  let masterVariant
  let application

  beforeEach(async () => {
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()

    masterVariant = {
      id: 'variant-prod-design',
      name: 'Product Design',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      resumeData: cloneResumeData(INITIAL_VARIANTS[0].resumeData),
    }
    await db.variants.add(masterVariant)

    application = await createApplication(masterVariant, {
      companyName: 'Figma Inc.',
      jobTitle: 'Senior Design Systems Lead',
    })
  })

  it('generates a valid selectable-text binary PDF Blob from structured resumeData', async () => {
    const resumeData = cloneResumeData(masterVariant.resumeData)
    // Mark portfolio hidden to verify exclusion
    resumeData.personalInfo.portfolio.isVisible = false

    const blob = await generatePdfBlob(resumeData)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(1000)
    expect(blob.type).toBe('application/pdf')
  })

  it('atomically exports application, persists snapshot + binary Blob to Dexie, and increments exportCount', async () => {
    expect(application.exportCount || 0).toBe(0)

    const result = await exportResumePdf({
      target: { type: 'application', id: application.id },
      resumeData: application.resumeData,
      record: application,
    })

    expect(result.success).toBe(true)
    expect(result.filename).toBe('Fahad Ashfaq - Senior Design Systems Lead.pdf')
    // Strict requirement: Never include company name and never append "Resume"
    expect(result.filename).not.toContain('Figma')
    expect(result.filename.toLowerCase()).not.toContain('resume')

    // Verify Dexie persistence
    const archives = await getArchivedPdfsByApplicationId(application.id)
    expect(archives).toHaveLength(1)

    const archive = archives[0]
    expect(archive.filename).toBe('Fahad Ashfaq - Senior Design Systems Lead.pdf')
    expect(archive.companyName).toBe('Figma Inc.')
    expect(archive.pdfBlob).toBeInstanceOf(Blob)
    expect(archive.pdfBlob.size).toBeGreaterThan(1000)
    expect(archive.resumeSnapshot.summary).toBe(application.resumeData.summary)

    // Verify application record updated in Dexie
    const updatedApp = await db.applications.get(application.id)
    expect(updatedApp.exportCount).toBe(1)
    expect(updatedApp.lastExportedAt).not.toBeNull()
  })

  it('exports master variant cleanly without creating an application archive record', async () => {
    const result = await exportResumePdf({
      target: { type: 'variant', id: masterVariant.id },
      resumeData: masterVariant.resumeData,
      record: masterVariant,
    })

    expect(result.success).toBe(true)
    expect(result.filename).toBe('Fahad Ashfaq - Product UI UX Designer.pdf')
    expect(result.archiveRecord).toBeNull()

    // Archived PDFs in Dexie remains 0
    const allArchives = await db.archivedPdfs.toArray()
    expect(allArchives).toHaveLength(0)
  })

  it('retrieves exact immutable Blob without regeneration after subsequent application edits', async () => {
    // 1. Export initial version
    await exportResumePdf({
      target: { type: 'application', id: application.id },
      resumeData: application.resumeData,
      record: application,
    })

    const initialArchives = await getArchivedPdfsByApplicationId(application.id)
    const initialStoredBlob = initialArchives[0].pdfBlob

    // 2. Modify application in editor
    await updateApplication(application.id, {
      resumeData: {
        ...application.resumeData,
        summary: 'MUTATED: This is a drastically changed post-export summary.',
      },
    })

    // 3. Verify archived record still has the original snapshot and original binary Blob
    const archivesAfterEdit = await getArchivedPdfsByApplicationId(application.id)
    expect(archivesAfterEdit).toHaveLength(1)
    expect(archivesAfterEdit[0].resumeSnapshot.summary).not.toContain('MUTATED')
    expect(archivesAfterEdit[0].pdfBlob.size).toBe(initialStoredBlob.size)
  })

  it('enables View PDF and Download in ApplicationsView for exported applications', async () => {
    // Export first so exportCount > 0
    await exportResumePdf({
      target: { type: 'application', id: application.id },
      resumeData: application.resumeData,
      record: application,
    })

    render(
      <ToastProvider>
        <ApplicationsView onOpenApplication={vi.fn()} onNavigate={vi.fn()} />
      </ToastProvider>
    )

    // Wait for applications to render
    await waitFor(() => {
      expect(screen.getByText('Figma Inc.')).toBeInTheDocument()
      expect(screen.getByText(/Exported \(1\)/i)).toBeInTheDocument()
    })

    // "View PDF" button is visible
    const viewPdfBtn = screen.getByRole('button', { name: /view pdf/i })
    expect(viewPdfBtn).toBeInTheDocument()

    // Click "View PDF"
    fireEvent.click(viewPdfBtn)

    // Opens PdfViewerModal in archived mode
    await waitFor(() => {
      expect(screen.getByText(/Archived PDF:/i)).toBeInTheDocument()
      expect(screen.getByText(/Immutable Stored Blob/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /return to editor/i })).toBeInTheDocument()
    })

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /return to editor/i }))
    await waitFor(() => {
      expect(screen.queryByText(/Immutable Stored Blob/i)).not.toBeInTheDocument()
    })
  })
})
