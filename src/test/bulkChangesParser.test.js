import { describe, it, expect } from 'vitest'
import { parseBulkChanges } from '../features/bulk-changes/parser.js'
import { matchBulkChanges } from '../features/bulk-changes/matcher.js'
import { applyBulkChanges } from '../features/bulk-changes/applier.js'
import { MATCH_STATUS, SUPPORTED_SECTIONS } from '../models/bulkChangeSchema.js'
import { INITIAL_VARIANTS } from '../database/seeds/initialVariants.js'
import { OFFICIAL_BULK_CHANGE_FIXTURE } from './fixtures/bulkChangesFixture.js'
import { cloneResumeData } from '../models/resumeSchema.js'

describe('Bulk Changes Engine (Phase 5 Unit Tests)', () => {
  const baseResume = cloneResumeData(INITIAL_VARIANTS[0].resumeData)

  // Scenario 1: Single summary replacement
  it('Scenario 1: parses and matches a single summary replacement', () => {
    const raw = `[SUMMARY]
Old: ${baseResume.summary}
New: Senior UX Architect with 10 years of experience leading enterprise software design.`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].section).toBe(SUPPORTED_SECTIONS.SUMMARY)
    expect(parsed[0].operation).toBe('REPLACE')

    const matched = matchBulkChanges(parsed, baseResume)
    expect(matched[0].status).toBe(MATCH_STATUS.MATCHED)
    expect(matched[0].accepted).toBe(true)

    const updated = applyBulkChanges(baseResume, matched)
    expect(updated.summary).toBe('Senior UX Architect with 10 years of experience leading enterprise software design.')
  })

  // Scenario 2: Multiple summary replacements
  it('Scenario 2: parses multiple summary replacements sequentially', () => {
    const raw = `[SUMMARY]
Old: ${baseResume.summary}
New: First revision of summary.
Old: First revision of summary.
New: Second final revision of summary.`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(2)

    // Match first against base
    const matched1 = matchBulkChanges([parsed[0]], baseResume)
    expect(matched1[0].status).toBe(MATCH_STATUS.MATCHED)
    const updated1 = applyBulkChanges(baseResume, matched1)
    expect(updated1.summary).toBe('First revision of summary.')

    // Match second against updated1
    const matched2 = matchBulkChanges([parsed[1]], updated1)
    expect(matched2[0].status).toBe(MATCH_STATUS.MATCHED)
    const updated2 = applyBulkChanges(updated1, matched2)
    expect(updated2.summary).toBe('Second final revision of summary.')
  })

  // Scenario 3: Multiple bullets in one experience
  it('Scenario 3: parses and matches multiple bullets within one work experience', () => {
    const ghani = baseResume.workExperiences[0]
    const raw = `[WORK EXPERIENCE: Ghani Branding Agency]
Old: ${ghani.bullets[0].text}
New: Designed multi-tenant SaaS dashboards for enterprise customers.
Old: ${ghani.bullets[1].text}
New: Scaled company design system to 200+ accessible components.`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].targetContext.employer).toBe('Ghani Branding Agency')

    const matched = matchBulkChanges(parsed, baseResume)
    expect(matched[0].status).toBe(MATCH_STATUS.MATCHED)
    expect(matched[1].status).toBe(MATCH_STATUS.MATCHED)

    const updated = applyBulkChanges(baseResume, matched)
    expect(updated.workExperiences[0].bullets[0].text).toBe(
      'Designed multi-tenant SaaS dashboards for enterprise customers.'
    )
    expect(updated.workExperiences[0].bullets[1].text).toBe(
      'Scaled company design system to 200+ accessible components.'
    )
    // Other bullets unchanged
    expect(updated.workExperiences[0].bullets[2].text).toBe(ghani.bullets[2].text)
  })

  // Scenario 4: Multiple experiences
  it('Scenario 4: parses and matches bullets across multiple different experiences', () => {
    const exp1 = baseResume.workExperiences[0]
    const exp2 = baseResume.workExperiences[1]

    const raw = `[WORK EXPERIENCE: Ghani Branding Agency]
Old: ${exp1.bullets[0].text}
New: First bullet updated in Ghani.
[WORK EXPERIENCE: AI Orbit]
Old: ${exp2.bullets[0].text}
New: First bullet updated in AI Orbit.`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(2)

    const matched = matchBulkChanges(parsed, baseResume)
    expect(matched[0].status).toBe(MATCH_STATUS.MATCHED)
    expect(matched[0].suggestedTarget.employer).toBe('Ghani Branding Agency')
    expect(matched[1].status).toBe(MATCH_STATUS.MATCHED)
    expect(matched[1].suggestedTarget.employer).toBe('AI Orbit')

    const updated = applyBulkChanges(baseResume, matched)
    expect(updated.workExperiences[0].bullets[0].text).toBe('First bullet updated in Ghani.')
    expect(updated.workExperiences[1].bullets[0].text).toBe('First bullet updated in AI Orbit.')
  })

  // Scenario 5: Skills replacements (including · vs space/comma normalization)
  it('Scenario 5: normalizes delimiter variations in skills (· vs spaces and commas)', () => {
    // Master variant has category 'Product & UX' with skills: Information Architecture, Interaction Design, User Flows, Workflow Mapping, Usability Review, Prototyping
    const rawWithDots = `[SKILLS]
Old: Product & UX: Information Architecture · Interaction Design · User Flows · Workflow Mapping · Usability Review · Prototyping
New: Product & UX: Design Strategy, Service Blueprinting, Advanced Prototyping`

    const parsed = parseBulkChanges(rawWithDots)
    const matched = matchBulkChanges(parsed, baseResume)

    expect(matched[0].status).toBe(MATCH_STATUS.MATCHED)
    expect(matched[0].accepted).toBe(true)

    const updated = applyBulkChanges(baseResume, matched)
    const productUxCat = updated.skills.find((c) => c.categoryName === 'Product & UX')
    expect(productUxCat).toBeDefined()
    expect(productUxCat.skills.map((s) => s.name)).toEqual([
      'Design Strategy',
      'Service Blueprinting',
      'Advanced Prototyping',
    ])
  })

  // Scenario 6: Missing Old: value (Invalid)
  it('Scenario 6: flags missing Old: value as Invalid', () => {
    const raw = `[SUMMARY]
New: Replaced summary without old target.`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].status).toBe(MATCH_STATUS.INVALID)
    expect(parsed[0].statusReason).toContain('Missing Old')

    const matched = matchBulkChanges(parsed, baseResume)
    expect(matched[0].status).toBe(MATCH_STATUS.INVALID)
    expect(matched[0].accepted).toBe(false)
  })

  // Scenario 7: Missing New: value (Invalid)
  it('Scenario 7: flags missing New: value as Invalid', () => {
    const raw = `[SUMMARY]
Old: ${baseResume.summary}`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].status).toBe(MATCH_STATUS.INVALID)
    expect(parsed[0].statusReason).toContain('Missing New')

    const matched = matchBulkChanges(parsed, baseResume)
    expect(matched[0].status).toBe(MATCH_STATUS.INVALID)
    expect(matched[0].accepted).toBe(false)
  })

  // Scenario 8: Duplicate original text across experiences (Ambiguous)
  it('Scenario 8: flags identical bullet across multiple experiences as Ambiguous when employer is omitted', () => {
    // Create test resume with duplicate bullet in two different roles
    const resumeWithDup = cloneResumeData(baseResume)
    const dupText = 'Shared duplicate bullet text across companies.'
    resumeWithDup.workExperiences[0].bullets.push({ id: 'b-dup-1', text: dupText })
    resumeWithDup.workExperiences[1].bullets.push({ id: 'b-dup-2', text: dupText })

    const raw = `[WORK EXPERIENCE]
Old: ${dupText}
New: Unique replacement text.`

    const parsed = parseBulkChanges(raw)
    const matched = matchBulkChanges(parsed, resumeWithDup)

    expect(matched[0].status).toBe(MATCH_STATUS.AMBIGUOUS)
    expect(matched[0].accepted).toBe(false)
    expect(matched[0].statusReason).toContain('Identical bullet text appears in multiple work experiences')
  })

  // Scenario 9: Whitespace differences
  it('Scenario 9: resolves whitespace differences and extra line breaks deterministically', () => {
    // Add extra spaces and tabs
    const raw = `[WORK EXPERIENCE: Ghani Branding Agency]
Old:   Lead UI/UX design    across   digital product workstreams.   Covering user flows,   information architecture, wireframes, and high-fidelity interfaces for web and marketplace platforms.  
New: Clean updated bullet text.`

    const parsed = parseBulkChanges(raw)
    const matched = matchBulkChanges(parsed, baseResume)

    expect(matched[0].status).toBe(MATCH_STATUS.MATCHED)
    expect(matched[0].accepted).toBe(true)

    const updated = applyBulkChanges(baseResume, matched)
    expect(updated.workExperiences[0].bullets[0].text).toBe('Clean updated bullet text.')
  })

  // Scenario 10: Unmatched text (Unmatched)
  it('Scenario 10: marks completely non-existent text as Unmatched', () => {
    const raw = `[SUMMARY]
Old: Totally fabricated summary text that does not exist anywhere in this resume at all.
New: Some new summary.`

    const parsed = parseBulkChanges(raw)
    const matched = matchBulkChanges(parsed, baseResume)

    expect(matched[0].status).toBe(MATCH_STATUS.UNMATCHED)
    expect(matched[0].accepted).toBe(false)
  })

  // Scenario 11: Malformed headings (Invalid)
  it('Scenario 11: flags malformed or unrecognized bracket section headings as Invalid', () => {
    const raw = `[NON_EXISTENT_SECTION_HEADER_1234]
Old: Some text
New: Some new text`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].status).toBe(MATCH_STATUS.INVALID)
    expect(parsed[0].statusReason).toContain('Malformed or unrecognized section heading')
  })

  // Scenario 12: Multiple sections in one paste
  it('Scenario 12: parses and correctly groups changes spanning multiple sections', () => {
    const raw = `[SUMMARY]
Old: ${baseResume.summary}
New: Multi-section summary update.

[WORK EXPERIENCE: Ghani Branding Agency]
Old: ${baseResume.workExperiences[0].bullets[0].text}
New: Multi-section work experience update.

[SKILLS]
Old: Product & UX: Information Architecture Interaction Design User Flows Workflow Mapping Usability Review Prototyping
New: Product & UX: Rapid Prototyping, Design Systems`

    const parsed = parseBulkChanges(raw)
    expect(parsed).toHaveLength(3)
    expect(parsed[0].section).toBe(SUPPORTED_SECTIONS.SUMMARY)
    expect(parsed[1].section).toBe(SUPPORTED_SECTIONS.WORK_EXPERIENCE)
    expect(parsed[2].section).toBe(SUPPORTED_SECTIONS.SKILLS)

    const matched = matchBulkChanges(parsed, baseResume)
    expect(matched.every((m) => m.status === MATCH_STATUS.MATCHED)).toBe(true)

    const updated = applyBulkChanges(baseResume, matched)
    expect(updated.summary).toBe('Multi-section summary update.')
    expect(updated.workExperiences[0].bullets[0].text).toBe('Multi-section work experience update.')
    expect(updated.skills[0].skills.map((s) => s.name)).toEqual(['Rapid Prototyping', 'Design Systems'])
  })

  // Scenario 13: Empty input
  it('Scenario 13: returns empty array for empty, null, or whitespace-only inputs', () => {
    expect(parseBulkChanges('')).toEqual([])
    expect(parseBulkChanges('   \n\n  \t  ')).toEqual([])
    expect(parseBulkChanges(null)).toEqual([])
    expect(parseBulkChanges(undefined)).toEqual([])
  })

  // Official Part 8.1 Specification Fixture Verification
  it('verifies the official Part 8.1 fixture parses, matches 100%, and applies cleanly', () => {
    const parsed = parseBulkChanges(OFFICIAL_BULK_CHANGE_FIXTURE)
    expect(parsed).toHaveLength(4)

    // Change 0: Summary
    expect(parsed[0].section).toBe(SUPPORTED_SECTIONS.SUMMARY)
    // Change 1: Work Experience Ghani bullet 1
    expect(parsed[1].section).toBe(SUPPORTED_SECTIONS.WORK_EXPERIENCE)
    expect(parsed[1].targetContext.employer).toBe('Ghani Branding Agency')
    // Change 2: Work Experience Ghani bullet 2
    expect(parsed[2].section).toBe(SUPPORTED_SECTIONS.WORK_EXPERIENCE)
    expect(parsed[2].targetContext.employer).toBe('Ghani Branding Agency')
    // Change 3: Skills
    expect(parsed[3].section).toBe(SUPPORTED_SECTIONS.SKILLS)

    const matched = matchBulkChanges(parsed, baseResume)
    expect(matched).toHaveLength(4)

    // All 4 changes should be matched and accepted
    matched.forEach((m) => {
      expect(m.status).toBe(MATCH_STATUS.MATCHED)
      expect(m.accepted).toBe(true)
      expect(m.suggestedTarget).not.toBeNull()
    })

    // Apply all 4 changes
    const updated = applyBulkChanges(baseResume, matched)

    // Check Summary
    expect(updated.summary).toContain('Mid-level Product UI/UX Designer with 2.5 years of experience')

    // Check Work Experience bullets
    const ghani = updated.workExperiences.find((w) => w.employer === 'Ghani Branding Agency')
    expect(ghani.bullets[0].text).toBe(
      'Design intuitive, user-centered interfaces for web and mobile applications, delivering structured wireframes, interactive prototypes, and high-fidelity mockups in Figma.'
    )
    expect(ghani.bullets[1].text).toBe(
      'Maintain and evolve scalable design systems to ensure visual consistency, responsive behavior, and accessibility across concurrent product releases.'
    )
    // Third and fourth bullets should remain untouched
    expect(ghani.bullets[2].text).toBe(baseResume.workExperiences[0].bullets[2].text)
    expect(ghani.bullets[3].text).toBe(baseResume.workExperiences[0].bullets[3].text)

    // Check Skills
    const uxSkills = updated.skills.find((s) => s.categoryName === 'Product & UX')
    expect(uxSkills.skills.map((s) => s.name)).toEqual([
      'User Research & Insights',
      'Usability Principles',
      'Wireframes & Prototypes',
      'High-Fidelity Mockups',
      'Real-World Design Process',
    ])

    // Other categories untouched
    const uiSystems = updated.skills.find((s) => s.categoryName === 'UI & Systems')
    expect(uiSystems.skills.map((s) => s.name)).toEqual(
      baseResume.skills.find((s) => s.categoryName === 'UI & Systems').skills.map((s) => s.name)
    )

    // Original baseResume was never mutated
    expect(baseResume.summary).not.toBe(updated.summary)
  })
})
