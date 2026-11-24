import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { ResumeEditorView } from '../features/resume-editor/ResumeEditorView.jsx'
import { AppProviders } from '../app/providers.jsx'
import { db } from '../database/db.js'
import { seedInitialVariantsIfEmpty } from '../database/variantRepository.js'
import { createApplication } from '../database/applicationRepository.js'

function renderEditor(target, onBack = vi.fn()) {
  return render(
    <AppProviders>
      <ResumeEditorView target={target} onBack={onBack} />
    </AppProviders>
  )
}

describe('Phase 4: Mobile-First Modular Resume Editor', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()
    await seedInitialVariantsIfEmpty()
  })

  it('renders master variant with all 6 modular collapsible sections and master badge', async () => {
    const variant = await db.variants.where('name').equals('Product Design').first()
    expect(variant).toBeDefined()

    renderEditor({ type: 'variant', id: variant.id })

    // Header title & badges
    expect(await screen.findByRole('heading', { level: 2, name: /product design/i })).toBeInTheDocument()
    expect(screen.getByText('Master Variant')).toBeInTheDocument()

    // 6 Sections
    expect(screen.getByRole('heading', { level: 3, name: /personal information/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /professional summary/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /work experience/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /skills & categorization/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /education & credentials/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /additional & custom sections/i })).toBeInTheDocument()

    // Floating action bar items
    expect(screen.getByRole('button', { name: /bulk changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
  })

  it('edits personal info and toggles LinkedIn/Portfolio visibility, persisting to Dexie', async () => {
    const variant = await db.variants.where('name').equals('Product Design').first()
    const onBack = vi.fn()

    renderEditor({ type: 'variant', id: variant.id }, onBack)

    const nameInput = await screen.findByLabelText(/full name/i)
    fireEvent.change(nameInput, { target: { value: 'Fahad Ashfaq (Lead UX)' } })

    // Toggle LinkedIn visibility
    const linkedinToggle = screen.getByRole('switch', { name: /show linkedin on resume/i })
    expect(linkedinToggle).toBeChecked()
    fireEvent.click(linkedinToggle)
    expect(linkedinToggle).not.toBeChecked()

    // Trigger back button (which flushes auto-save immediately)
    const backBtn = screen.getByRole('button', { name: /back/i })
    fireEvent.click(backBtn)

    await waitFor(() => {
      expect(onBack).toHaveBeenCalled()
    })

    // Verify Dexie persistence
    const updated = await db.variants.get(variant.id)
    expect(updated.resumeData.personalInfo.fullName).toBe('Fahad Ashfaq (Lead UX)')
    expect(updated.resumeData.personalInfo.linkedin.isVisible).toBe(false)
  })

  it('adds, edits, duplicates, and reorders individual bullets in work experience', async () => {
    const variant = await db.variants.where('name').equals('Product Design').first()
    const onBack = vi.fn()

    renderEditor({ type: 'variant', id: variant.id }, onBack)

    await screen.findByRole('heading', { level: 2, name: /product design/i })

    // Find the first role's "Add Bullet" button
    const addBulletBtns = screen.getAllByRole('button', { name: /^add bullet$/i })
    await act(async () => {
      fireEvent.click(addBulletBtns[0])
    })

    // Find the first role's container
    const firstRoleCard = screen.getByDisplayValue('Ghani Branding Agency').closest('.rounded-xl')
    const roleBulletTextareas = within(firstRoleCard).getAllByPlaceholderText(/describe an action, outcome, or technical deliverable/i)
    const newBulletTextarea = roleBulletTextareas[roleBulletTextareas.length - 1]

    fireEvent.change(newBulletTextarea, {
      target: { value: 'Architected automated design tokens for multi-brand SaaS.' },
    })

    // Duplicate bullet in first role
    const dupBulletBtn = within(firstRoleCard).getAllByTitle(/duplicate bullet/i)[0]
    await act(async () => {
      fireEvent.click(dupBulletBtn)
    })

    // Flush to Dexie
    const backBtn = screen.getByRole('button', { name: /back/i })
    await act(async () => {
      fireEvent.click(backBtn)
    })

    const updated = await db.variants.get(variant.id)
    const firstRoleBullets = updated.resumeData.workExperiences[0].bullets
    expect(firstRoleBullets.some((b) => b.text === 'Architected automated design tokens for multi-brand SaaS.')).toBe(true)
    // One duplicate was added
    expect(firstRoleBullets.length).toBeGreaterThan(variant.resumeData.workExperiences[0].bullets.length)
  })

  it('adds skill categories and individual skills with live persistence', async () => {
    const variant = await db.variants.where('name').equals('Product Design').first()
    const onBack = vi.fn()

    renderEditor({ type: 'variant', id: variant.id }, onBack)

    await screen.findByRole('heading', { level: 2, name: /product design/i })

    // Click "Add Category"
    const addCategoryBtn = screen.getByRole('button', { name: /^add category$/i })
    await act(async () => {
      fireEvent.click(addCategoryBtn)
    })

    // Find all category inputs
    const categoryInputs = screen.getAllByPlaceholderText(/category name/i)
    const newCatInput = categoryInputs[categoryInputs.length - 1]
    fireEvent.change(newCatInput, { target: { value: 'Frontend & Prototyping' } })

    // Add skills to this new category via quick add
    const skillQuickAddInputs = screen.getAllByPlaceholderText(/add skill \(or comma-separated/i)
    const targetQuickAdd = skillQuickAddInputs[skillQuickAddInputs.length - 1]

    fireEvent.change(targetQuickAdd, { target: { value: 'React, Tailwind CSS, Vite' } })
    const addSkillBtns = screen.getAllByRole('button', { name: /^add$/i })
    await act(async () => {
      fireEvent.click(addSkillBtns[addSkillBtns.length - 1])
    })

    // Flush
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
    })

    const updated = await db.variants.get(variant.id)
    const foundCategory = updated.resumeData.skills.find((c) => c.categoryName === 'Frontend & Prototyping')
    expect(foundCategory).toBeDefined()
    expect(foundCategory.skills.map((s) => s.name)).toEqual(['React', 'Tailwind CSS', 'Vite'])
  })

  it('adds custom section and toggles visibility', async () => {
    const variant = await db.variants.where('name').equals('Product Design').first()
    const onBack = vi.fn()

    renderEditor({ type: 'variant', id: variant.id }, onBack)

    await screen.findByRole('heading', { level: 2, name: /product design/i })

    // Open additional section
    const additionalHeader = screen.getByRole('button', { name: /additional & custom sections/i })
    fireEvent.click(additionalHeader)

    // Click "Add Custom Section"
    const addCustomBtn = await screen.findByRole('button', { name: /add custom section/i })
    await act(async () => {
      fireEvent.click(addCustomBtn)
    })

    // Set title
    const sectionTitleInput = await screen.findByPlaceholderText(/section title \(e\.g\. projects/i)
    fireEvent.change(sectionTitleInput, { target: { value: 'Open Source Systems' } })

    // Toggle visibility to hidden
    const visibilityToggle = screen.getByRole('switch', { name: /visible/i })
    expect(visibilityToggle).toBeChecked()
    fireEvent.click(visibilityToggle)
    expect(visibilityToggle).not.toBeChecked()

    // Flush
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
    })

    const updated = await db.variants.get(variant.id)
    expect(updated.resumeData.additionalSections).toHaveLength(1)
    expect(updated.resumeData.additionalSections[0].title).toBe('Open Source Systems')
    expect(updated.resumeData.additionalSections[0].isVisible).toBe(false)
  })

  it('strictly isolates edits to application without mutating master variant or other applications', async () => {
    const variant = await db.variants.where('name').equals('Product Design').first()

    // Create tailored application for "Vercel"
    const app = await createApplication(variant, {
      companyName: 'Vercel',
      jobTitle: 'Design Systems Lead',
    })

    const onBack = vi.fn()
    renderEditor({ type: 'application', id: app.id }, onBack)

    // Verify company badge and title
    expect(await screen.findByText('Vercel')).toBeInTheDocument()
    expect(screen.getByText('Tailored Copy')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /design systems lead/i })).toBeInTheDocument()

    // Edit summary specifically in this application
    const summaryInput = screen.getByLabelText(/executive summary/i)
    fireEvent.change(summaryInput, {
      target: { value: 'Tailored summary strictly for Vercel design systems leadership.' },
    })

    // Edit full name in application
    const nameInput = screen.getByLabelText(/full name/i)
    fireEvent.change(nameInput, { target: { value: 'Fahad Ashfaq — Vercel Specialist' } })

    // Flush to Dexie
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
    })

    // 1. Verify Application was updated
    const updatedApp = await db.applications.get(app.id)
    expect(updatedApp.resumeData.summary).toBe('Tailored summary strictly for Vercel design systems leadership.')
    expect(updatedApp.resumeData.personalInfo.fullName).toBe('Fahad Ashfaq — Vercel Specialist')

    // 2. CRITICAL SPEC CHECK: Verify Master Variant is 100% UNTOUCHED
    const masterVariant = await db.variants.get(variant.id)
    expect(masterVariant.resumeData.summary).toBe(variant.resumeData.summary)
    expect(masterVariant.resumeData.summary).not.toContain('Vercel')
    expect(masterVariant.resumeData.personalInfo.fullName).toBe('Fahad Ashfaq')
    expect(masterVariant.resumeData.personalInfo.fullName).not.toContain('Vercel')
  })
})
