import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ResumeEditorView } from '../features/resume-editor/ResumeEditorView.jsx'
import { ToastProvider } from '../components/ui/Toast.jsx'
import { db } from '../database/db.js'
import { getVariantById } from '../database/variantRepository.js'
import {
  createApplication,
  getApplicationById,
} from '../database/applicationRepository.js'

function renderEditor(target, onBack = vi.fn()) {
  return render(
    <ToastProvider>
      <ResumeEditorView target={target} onBack={onBack} />
    </ToastProvider>
  )
}

describe('Bulk Changes Integration & Review UI (Phase 5)', () => {
  let masterVariant
  let application

  beforeEach(async () => {
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()

    // Seed master variant
    masterVariant = {
      id: 'variant-prod-design',
      name: 'Product Design',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      resumeData: {
        personalInfo: {
          fullName: 'Fahad Ashfaq',
          headline: 'Product UI/UX Designer',
          email: 'fahadashfaq.sh@gmail.com',
          phone: '+92 325 8028150',
          location: 'Lahore, Pakistan',
          linkedin: { id: 'l1', url: 'https://linkedin.com/in/fahad', displayText: 'LinkedIn', isVisible: true },
          portfolio: { id: 'p1', url: 'https://fahadux.com', displayText: 'Portfolio', isVisible: true },
          customLinks: [],
        },
        summary:
          'Product UI/UX designer specialising in complex systems, multi-role SaaS platforms, and enterprise interfaces. I translate ambiguous requirements and layered workflows into structured, scalable product experiences, prioritising system logic and interaction clarity over surface-level styling. Experienced across the full design lifecycle: from workflow mapping and information architecture to high-fidelity UI and design systems.',
        workExperiences: [
          {
            id: 'exp-ghani',
            employer: 'Ghani Branding Agency',
            jobTitle: 'UI/UX Designer & Studio Team Lead',
            startDate: 'Oct 2025',
            endDate: 'Oct 2026',
            location: 'Lahore',
            bullets: [
              {
                id: 'b-ghani-1',
                text: 'Lead UI/UX design across digital product workstreams. Covering user flows, information architecture, wireframes, and high-fidelity interfaces for web and marketplace platforms.',
              },
              {
                id: 'b-ghani-2',
                text: 'Define interaction patterns and component standards in Figma, ensuring layout consistency and design system coherence across concurrent product builds.',
              },
              {
                id: 'b-ghani-3',
                text: 'Collaborate with developers and stakeholders to translate requirements into structured design decisions.',
              },
            ],
          },
        ],
        skills: [
          {
            id: 'cat-ux',
            categoryName: 'Product & UX',
            skills: [
              { id: 's1', name: 'Information Architecture' },
              { id: 's2', name: 'Interaction Design' },
              { id: 's3', name: 'User Flows' },
              { id: 's4', name: 'Workflow Mapping' },
              { id: 's5', name: 'Usability Review' },
              { id: 's6', name: 'Prototyping' },
            ],
          },
        ],
        education: [
          {
            id: 'edu-1',
            institution: 'University of Engineering and Technology',
            degree: 'BS Computer Science',
            startDate: '2019',
            endDate: '2023',
            description: '',
          },
        ],
        additionalSections: [],
      },
    }
    await db.variants.add(masterVariant)

    // Create tailored application from variant
    application = await createApplication(masterVariant, {
      companyName: 'Linear Technologies',
      jobTitle: 'Senior Product Designer',
    })
  })

  it('opens Bulk Changes modal, pastes Part 8.1 fixture, parses and displays diffs', async () => {
    renderEditor({ type: 'application', id: application.id })

    // Wait for editor to load
    await waitFor(() => {
      expect(screen.getByText('Linear Technologies')).toBeInTheDocument()
    })

    // Click "Bulk Changes" FAB button
    const bulkFab = screen.getByRole('button', { name: /bulk changes/i })
    fireEvent.click(bulkFab)

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText('Bulk Changes Engine')).toBeInTheDocument()
      expect(screen.getByText('Supported Paste Format:')).toBeInTheDocument()
    })

    // Click "Paste Part 8.1 Example"
    const pasteBtn = screen.getByRole('button', { name: /paste part 8\.1 example/i })
    fireEvent.click(pasteBtn)

    // Check textarea populated
    const textarea = screen.getByPlaceholderText(/paste your old: \/ new:/i)
    expect(textarea.value).toContain('Resume Changes')
    expect(textarea.value).toContain('[WORK EXPERIENCE: Ghani Branding Agency]')

    // Click "Parse Changes"
    const parseBtn = screen.getByRole('button', { name: /parse changes/i })
    fireEvent.click(parseBtn)

    // Review step displays
    await waitFor(() => {
      expect(screen.getByText('4 Changes:')).toBeInTheDocument()
      expect(screen.getByText('4 Matched')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /apply 4 accepted changes/i })).toBeInTheDocument()
    })

    // Check that all 4 changes show "Accepted" buttons
    const acceptedButtons = screen.getAllByRole('button', { name: /accepted/i })
    expect(acceptedButtons.length).toBeGreaterThanOrEqual(4)

    // Check diff boxes
    expect(screen.getByText(/Mid-level Product UI\/UX Designer with 2\.5 years of experience/i)).toBeInTheDocument()
  })

  it('supports accept/reject toggles and manual target picker', async () => {
    renderEditor({ type: 'application', id: application.id })

    await waitFor(() => {
      expect(screen.getByText('Linear Technologies')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /bulk changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Bulk Changes Engine')).toBeInTheDocument()
    })

    // Paste custom input with an unmatched bullet to test manual target picker
    const customInput = `[WORK EXPERIENCE: Ghani Branding Agency]
Old: Some unknown bullet that does not exist in the database
New: Freshly assigned bullet text via manual picker`

    const textarea = screen.getByPlaceholderText(/paste your old: \/ new:/i)
    fireEvent.change(textarea, { target: { value: customInput } })

    fireEvent.click(screen.getByRole('button', { name: /parse changes/i }))

    // Should show 1 Unmatched
    await waitFor(() => {
      expect(screen.getByText('1 Unmatched')).toBeInTheDocument()
    })

    // Apply button should be disabled because 0 are accepted
    const applyBtn = screen.getByRole('button', { name: /apply 0 accepted changes/i })
    expect(applyBtn).toBeDisabled()

    // Use Manual Target Picker dropdown to assign to Ghani's first bullet
    const targetSelect = screen.getByLabelText(/target for change #1/i)
    expect(targetSelect).toBeInTheDocument()

    // Select the second option (first work experience candidate)
    fireEvent.change(targetSelect, { target: { value: '1' } }) // index 1 is first work bullet (index 0 is summary)

    // Status updates to Matched and auto-accepted!
    await waitFor(() => {
      expect(screen.getByText(/manually assigned target/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /apply 1 accepted change/i })).toBeEnabled()
    })
  })

  it('applies bulk changes to application with snapshot, allows Undo Last Batch, and preserves master variant', async () => {
    renderEditor({ type: 'application', id: application.id })

    await waitFor(() => {
      expect(screen.getByText('Linear Technologies')).toBeInTheDocument()
    })

    // Open Bulk Changes and paste Part 8.1
    fireEvent.click(screen.getByRole('button', { name: /bulk changes/i }))
    await waitFor(() => expect(screen.getByText('Bulk Changes Engine')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /paste part 8\.1 example/i }))
    fireEvent.click(screen.getByRole('button', { name: /parse changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply 4 accepted changes/i })).toBeInTheDocument()
    })

    // Apply the 4 changes
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /apply 4 accepted changes/i }))
    })

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByText('Bulk Changes Engine')).not.toBeInTheDocument()
    })

    // Verify application in editor now contains the new summary
    await waitFor(() => {
      const summaryTextarea = screen.getByDisplayValue(/Mid-level Product UI\/UX Designer with 2\.5 years of experience/i)
      expect(summaryTextarea).toBeInTheDocument()
    })

    // Verify "Undo Last Batch" button appeared in the header!
    const undoButton = await screen.findByRole('button', { name: /undo last batch/i })
    expect(undoButton).toBeInTheDocument()

    // Verify application in Dexie has updated resumeData and a revision snapshot
    const appInDb = await getApplicationById(application.id)
    expect(appInDb.resumeData.summary).toContain('Mid-level Product UI/UX Designer with 2.5 years of experience')
    expect(appInDb.revisions.length).toBeGreaterThanOrEqual(1)
    expect(appInDb.revisions[appInDb.revisions.length - 1].reason).toContain('Bulk change applied')

    // CRITICAL SPEC CHECK: Verify the master variant in Dexie is completely untouched!
    const masterInDb = await getVariantById(masterVariant.id)
    expect(masterInDb.resumeData.summary).toBe(masterVariant.resumeData.summary)
    expect(masterInDb.resumeData.summary).not.toContain('Mid-level Product UI/UX Designer')
    expect(masterInDb.resumeData.workExperiences[0].bullets[0].text).toBe(
      masterVariant.resumeData.workExperiences[0].bullets[0].text
    )

    // Now test UNDO LAST BATCH: click the Undo button
    await act(async () => {
      fireEvent.click(undoButton)
    })

    // Verify editor reverted back to original summary!
    await waitFor(() => {
      const originalSummaryTextarea = screen.getByDisplayValue(
        /Product UI\/UX designer specialising in complex systems/i
      )
      expect(originalSummaryTextarea).toBeInTheDocument()
    })

    // Verify application in Dexie was restored back to the snapshot
    const revertedAppInDb = await getApplicationById(application.id)
    expect(revertedAppInDb.resumeData.summary).toBe(masterVariant.resumeData.summary)
  })
})
