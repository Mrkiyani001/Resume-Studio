import { describe, it, expect } from 'vitest'
import {
  createEmptyResume,
  createEmptyWorkExperience,
  createEmptyBullet,
  createLink,
  normalizeResumeData,
  cloneResumeData,
} from '../models/resumeSchema.js'

describe('resumeSchema & Normalizers', () => {
  it('creates an empty resume conforming to schema', () => {
    const resume = createEmptyResume()
    expect(resume.personalInfo).toBeDefined()
    expect(resume.personalInfo.fullName).toBe('')
    expect(resume.personalInfo.linkedin).toEqual({
      id: expect.any(String),
      url: '',
      displayText: 'LinkedIn',
      isVisible: true,
    })
    expect(resume.personalInfo.portfolio).toEqual({
      id: expect.any(String),
      url: '',
      displayText: 'Portfolio',
      isVisible: true,
    })
    expect(resume.personalInfo.customLinks).toEqual([])
    expect(Array.isArray(resume.workExperiences)).toBe(true)
    expect(Array.isArray(resume.skills)).toBe(true)
    expect(Array.isArray(resume.education)).toBe(true)
    expect(Array.isArray(resume.additionalSections)).toBe(true)
  })

  it('normalizes string bullets and partial data into structured objects', () => {
    const raw = {
      personalInfo: {
        fullName: 'Jane Doe',
        linkedin: 'https://linkedin.com/in/janedoe',
      },
      workExperiences: [
        {
          employer: 'Acme Corp',
          bullets: ['Built scalable frontend', 'Optimized performance'],
        },
      ],
      skills: [
        {
          categoryName: 'Frontend',
          skills: ['React', 'JavaScript'],
        },
      ],
    }

    const normalized = normalizeResumeData(raw)
    expect(normalized.personalInfo.fullName).toBe('Jane Doe')
    expect(normalized.personalInfo.linkedin.url).toBe('https://linkedin.com/in/janedoe')
    expect(normalized.personalInfo.linkedin.isVisible).toBe(true)
    expect(normalized.personalInfo.portfolio.url).toBe('')

    // Bullets converted from strings to { id, text }
    expect(normalized.workExperiences[0].bullets).toHaveLength(2)
    expect(normalized.workExperiences[0].bullets[0]).toEqual({
      id: expect.any(String),
      text: 'Built scalable frontend',
    })

    // Skills converted from strings to { id, name }
    expect(normalized.skills[0].skills[0]).toEqual({
      id: expect.any(String),
      name: 'React',
    })
  })

  it('creates unified links with independent visibility toggles', () => {
    const link = createLink({
      url: 'https://github.com/janedoe',
      displayText: 'GitHub',
      isVisible: false,
    })
    expect(link.id).toBeDefined()
    expect(link.url).toBe('https://github.com/janedoe')
    expect(link.displayText).toBe('GitHub')
    expect(link.isVisible).toBe(false)
  })

  it('deep-clones resume data with zero reference sharing', () => {
    const original = createEmptyResume()
    original.personalInfo.fullName = 'Original Name'
    original.workExperiences = [
      createEmptyWorkExperience({
        employer: 'Test Employer',
        bullets: [createEmptyBullet('Original bullet')],
      }),
    ]

    const clone = cloneResumeData(original)
    expect(clone).toEqual(original)

    // Mutate clone
    clone.personalInfo.fullName = 'Mutated Clone Name'
    clone.workExperiences[0].employer = 'Mutated Employer'
    clone.workExperiences[0].bullets[0].text = 'Mutated bullet'

    // Original must remain untouched
    expect(original.personalInfo.fullName).toBe('Original Name')
    expect(original.workExperiences[0].employer).toBe('Test Employer')
    expect(original.workExperiences[0].bullets[0].text).toBe('Original bullet')
  })
})
