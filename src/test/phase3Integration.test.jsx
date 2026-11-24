import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import Root from '../App.jsx'
import { db } from '../database/db.js'
import { seedInitialVariantsIfEmpty } from '../database/variantRepository.js'

async function renderAppAndWait() {
  render(<Root />)
  await screen.findByRole('heading', { level: 1, name: /^my resumes$/i })
}

describe('Phase 3 Integration: Resume Library & Application Creation Flow', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()
    await seedInitialVariantsIfEmpty()
  })

  describe('My Resumes (Master Variant Library)', () => {
    it('renders all 4 seeded variants on startup', async () => {
      await renderAppAndWait()

      expect(await screen.findByText('Product Design')).toBeInTheDocument()
      expect(screen.getByText('IT & Software Operations')).toBeInTheDocument()
      expect(screen.getByText('Business & Administrative Operations')).toBeInTheDocument()
      expect(screen.getByText('Data & Digital Operations')).toBeInTheDocument()
    })

    it('creates a new master resume variant via manual creation modal', async () => {
      await renderAppAndWait()

      const newResumeBtn = screen.getByRole('button', { name: /new resume/i })
      fireEvent.click(newResumeBtn)

      const input = await screen.findByLabelText(/variant name/i)
      fireEvent.change(input, { target: { value: 'Cloud Architecture & DevOps' } })

      const createBtn = screen.getByRole('button', { name: /^create resume$/i })
      await act(async () => {
        fireEvent.click(createBtn)
      })

      expect(await screen.findByText('Cloud Architecture & DevOps')).toBeInTheDocument()

      const inDb = await db.variants.where('name').equals('Cloud Architecture & DevOps').first()
      expect(inDb).toBeDefined()
    })

    it('renames an existing master variant', async () => {
      await renderAppAndWait()

      const renameBtns = await screen.findAllByTitle(/rename master variant/i)
      fireEvent.click(renameBtns[0])

      const input = await screen.findByLabelText(/variant name/i)
      fireEvent.change(input, { target: { value: 'Product UI/UX & Systems' } })

      const saveBtn = screen.getByRole('button', { name: /save changes/i })
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      expect(await screen.findByText('Product UI/UX & Systems')).toBeInTheDocument()
    })

    it('duplicates a master variant into an independent copy', async () => {
      await renderAppAndWait()

      const duplicateBtns = await screen.findAllByTitle(/duplicate master variant/i)
      await act(async () => {
        fireEvent.click(duplicateBtns[0])
      })

      expect(
        await screen.findByText('Product Design (Copy)', {}, { timeout: 3000 })
      ).toBeInTheDocument()

      const copiesInDb = await db.variants.where('name').equals('Product Design (Copy)').toArray()
      expect(copiesInDb).toHaveLength(1)
    })

    it('deletes a master variant guarded by ConfirmDialog', async () => {
      await renderAppAndWait()

      const deleteBtns = await screen.findAllByTitle(/delete master variant/i)
      fireEvent.click(deleteBtns[deleteBtns.length - 1])

      expect(await screen.findByText(/delete "data & digital operations"\?/i)).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: /^delete variant$/i })
      await act(async () => {
        fireEvent.click(confirmBtn)
      })

      await waitFor(() => {
        expect(screen.queryByText('Data & Digital Operations')).not.toBeInTheDocument()
      })
    })

    it('opens master resume in editor session (always master, never tailored)', async () => {
      await renderAppAndWait()

      const openMasterBtns = await screen.findAllByRole('button', { name: /open master/i })
      fireEvent.click(openMasterBtns[0])

      expect(await screen.findByText(/master resume variant \(always independent/i)).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /personal information/i })).toBeInTheDocument()

      const backBtn = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backBtn)

      expect(await screen.findByRole('heading', { level: 1, name: /^my resumes$/i })).toBeInTheDocument()
    })
  })

  describe('New Application Workflow', () => {
    it('pre-selects variant and auto-populates Job Title from headline', async () => {
      await renderAppAndWait()

      const applyBtns = await screen.findAllByRole('button', { name: /apply/i })
      fireEvent.click(applyBtns[0])

      expect(
        await screen.findByRole('heading', { level: 1, name: /^create new application$/i })
      ).toBeInTheDocument()

      const jobTitleInput = await screen.findByLabelText(/job title \/ headline/i)
      expect(jobTitleInput.value).toBe('Product UI/UX Designer')
    })

    it('enforces required Company Name and creates independent application', async () => {
      await renderAppAndWait()

      const newAppNavBtn = screen.getAllByRole('button', { name: /new app/i })
      fireEvent.click(newAppNavBtn[0])

      const submitBtn = await screen.findByRole('button', { name: /create application & open editor/i })
      fireEvent.click(submitBtn)

      expect(await screen.findByText(/company name is required/i)).toBeInTheDocument()

      const companyInput = screen.getByLabelText(/company name/i)
      fireEvent.change(companyInput, { target: { value: 'Linear' } })

      const jobTitleInput = screen.getByLabelText(/job title \/ headline/i)
      fireEvent.change(jobTitleInput, { target: { value: 'Lead Product Designer' } })

      fireEvent.click(submitBtn)

      expect(await screen.findByText(/tailored application for linear/i)).toBeInTheDocument()

      const apps = await db.applications.toArray()
      expect(apps).toHaveLength(1)
      expect(apps[0].companyName).toBe('Linear')
      expect(apps[0].jobTitle).toBe('Lead Product Designer')
      expect(apps[0].resumeData.personalInfo.headline).toBe('Lead Product Designer')
      expect(JSON.stringify(apps[0].resumeData)).not.toContain('Linear')
    })

    it('allows creating multiple applications for the exact same company', async () => {
      await renderAppAndWait()

      // 1. Create first application for "Google"
      const newAppNav = screen.getAllByRole('button', { name: /new app/i })
      fireEvent.click(newAppNav[0])

      const submitBtn1 = await screen.findByRole('button', { name: /create application & open editor/i })
      fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Google' } })
      fireEvent.change(screen.getByLabelText(/job title \/ headline/i), { target: { value: 'Senior UX Designer' } })
      fireEvent.click(submitBtn1)

      await screen.findByText(/tailored application for google/i)

      // Back to navigation (returns to new application view)
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
      await screen.findByRole('heading', { level: 1, name: /^create new application$/i })

      // 2. Create second application for "Google" (different role)
      const submitBtn2 = await screen.findByRole('button', { name: /create application & open editor/i })
      fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Google' } })
      fireEvent.change(screen.getByLabelText(/job title \/ headline/i), { target: { value: 'Design Manager' } })
      fireEvent.click(submitBtn2)

      await screen.findByText(/tailored application for google/i)

      const googleApps = await db.applications.where('companyName').equals('Google').toArray()
      expect(googleApps).toHaveLength(2)
      expect(googleApps[0].id).not.toBe(googleApps[1].id)
    })
  })

  describe('Applications Archive List', () => {
    it('filters applications live by company, job title, and variant', async () => {
      const variants = await db.variants.toArray()
      const variantDesign = variants.find((v) => v.name === 'Product Design')
      const variantIT = variants.find((v) => v.name === 'IT & Software Operations')

      await db.applications.bulkAdd([
        {
          id: 'app-stripe',
          companyName: 'Stripe',
          jobTitle: 'Product Designer',
          variantId: variantDesign.id,
          variantName: variantDesign.name,
          resumeData: variantDesign.resumeData,
          revision: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          exportCount: 0,
        },
        {
          id: 'app-datadog',
          companyName: 'Datadog',
          jobTitle: 'Systems Engineer',
          variantId: variantIT.id,
          variantName: variantIT.name,
          resumeData: variantIT.resumeData,
          revision: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          exportCount: 1,
        },
      ])

      await renderAppAndWait()

      const appsNav = screen.getAllByRole('button', { name: /applications/i })
      fireEvent.click(appsNav[0])

      expect(await screen.findByText('Stripe')).toBeInTheDocument()
      expect(await screen.findByText('Datadog')).toBeInTheDocument()

      // 1. Search by Company
      const searchInput = screen.getByPlaceholderText(/search by company/i)
      fireEvent.change(searchInput, { target: { value: 'stripe' } })

      expect(screen.getByText('Stripe')).toBeInTheDocument()
      expect(screen.queryByText('Datadog')).not.toBeInTheDocument()

      // 2. Search by Job Title
      fireEvent.change(searchInput, { target: { value: 'Systems Engineer' } })
      expect(screen.queryByText('Stripe')).not.toBeInTheDocument()
      expect(screen.getByText('Datadog')).toBeInTheDocument()

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } })

      // 3. Filter by Variant Dropdown
      const variantFilter = screen.getByLabelText(/filter by resume variant/i)
      fireEvent.change(variantFilter, { target: { value: variantDesign.id } })

      expect(screen.getByText('Stripe')).toBeInTheDocument()
      expect(screen.queryByText('Datadog')).not.toBeInTheDocument()
    })

    it('duplicates and deletes applications with confirmation', async () => {
      const variants = await db.variants.toArray()
      const variant = variants[0]

      await db.applications.add({
        id: 'app-figma',
        companyName: 'Figma',
        jobTitle: 'UI Designer',
        variantId: variant.id,
        variantName: variant.name,
        resumeData: variant.resumeData,
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exportCount: 0,
      })

      await renderAppAndWait()

      const appsNav = screen.getAllByRole('button', { name: /applications/i })
      fireEvent.click(appsNav[0])

      expect(await screen.findByText('Figma')).toBeInTheDocument()

      const dupBtn = screen.getByTitle(/duplicate application/i)
      await act(async () => {
        fireEvent.click(dupBtn)
      })

      expect(await screen.findByText('Figma (Copy)')).toBeInTheDocument()

      const deleteBtns = screen.getAllByTitle(/delete application/i)
      // Original Figma application is second because Figma (Copy) has newer updatedAt
      await act(async () => {
        fireEvent.click(deleteBtns[deleteBtns.length - 1])
      })

      expect(await screen.findByText(/delete application for "figma"\?/i)).toBeInTheDocument()

      const dialog = screen.getByRole('dialog')
      const confirmBtn = within(dialog).getByRole('button', { name: /^delete application$/i })
      await act(async () => {
        fireEvent.click(confirmBtn)
      })

      await waitFor(() => {
        expect(screen.queryByText('Figma')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Figma (Copy)')).toBeInTheDocument()
    })
  })
})
