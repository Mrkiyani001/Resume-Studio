import { describe, it, expect } from 'vitest'
import {
  createApplicationFromVariant,
  createRevisionSnapshot,
  rollbackToLastRevision,
} from '../models/applicationSchema.js'
import { createEmptyResume, createEmptyBullet, createEmptyWorkExperience } from '../models/resumeSchema.js'

describe('applicationSchema & Revision Lifecycle', () => {
  const masterVariant = {
    id: 'var-123',
    name: 'Product Design',
    resumeData: {
      ...createEmptyResume(),
      personalInfo: {
        ...createEmptyResume().personalInfo,
        fullName: 'Fahad Ashfaq',
        headline: 'Product UI/UX Designer',
      },
      workExperiences: [
        createEmptyWorkExperience({
          employer: 'Original Studio',
          bullets: [createEmptyBullet('Master bullet')],
        }),
      ],
    },
  }

  it('creates an independent application from a variant with correct metadata rules', () => {
    const app = createApplicationFromVariant(masterVariant, {
      companyName: 'Acme SaaS Corp',
      jobTitle: 'Senior Product Designer',
    })

    expect(app.id).toBeDefined()
    expect(app.variantId).toBe('var-123')
    expect(app.variantName).toBe('Product Design')
    expect(app.companyName).toBe('Acme SaaS Corp')
    expect(app.jobTitle).toBe('Senior Product Designer')

    // Rule: jobTitle populates headline
    expect(app.resumeData.personalInfo.headline).toBe('Senior Product Designer')

    // Rule: companyName is strictly metadata and NOT in resume content
    expect(JSON.stringify(app.resumeData)).not.toContain('Acme SaaS Corp')

    // Rule: deep copy independence
    app.resumeData.workExperiences[0].employer = 'Altered Application Employer'
    expect(masterVariant.resumeData.workExperiences[0].employer).toBe('Original Studio')
  })

  it('defaults headline to variant headline when jobTitle is omitted', () => {
    const app = createApplicationFromVariant(masterVariant, {
      companyName: 'Beta Startup',
    })

    expect(app.jobTitle).toBe('Product UI/UX Designer')
    expect(app.resumeData.personalInfo.headline).toBe('Product UI/UX Designer')
  })

  it('requires company name and valid variant', () => {
    expect(() => createApplicationFromVariant(null, { companyName: 'Test' })).toThrow(
      /Valid master variant is required/
    )
    expect(() => createApplicationFromVariant(masterVariant, { companyName: '' })).toThrow(
      /Company name is required/
    )
  })

  it('manages revision snapshots and rollback (Undo Last Batch)', () => {
    const app = createApplicationFromVariant(masterVariant, {
      companyName: 'Gamma AI',
      jobTitle: 'Design Lead',
    })

    expect(app.revision).toBe(1)
    expect(app.revisions).toHaveLength(1)

    // Snapshot created before bulk mutation
    const preMutationApp = createRevisionSnapshot(app, 'Before AI Suggestions')
    expect(preMutationApp.revision).toBe(2)
    expect(preMutationApp.revisions).toHaveLength(2)

    // Mutate application resumeData
    preMutationApp.resumeData.summary = 'Updated summary from bulk diff'
    preMutationApp.resumeData.workExperiences[0].bullets[0].text = 'Altered bullet from batch'

    // Rollback
    const rolledBack = rollbackToLastRevision(preMutationApp)
    expect(rolledBack.revision).toBe(1)
    expect(rolledBack.revisions).toHaveLength(1)
    expect(rolledBack.resumeData.summary).toBe('')
    expect(rolledBack.resumeData.workExperiences[0].bullets[0].text).toBe('Master bullet')
  })
})
