import { describe, it, expect } from 'vitest'
import { sanitizeFilename, getUniqueFilename } from '../lib/sanitizers.js'

describe('Sanitizers & Filename Generation (Phase 6)', () => {
  it('formats filename strictly as [Full Name] - [Job Title].pdf', () => {
    const filename = sanitizeFilename('Fahad Ashfaq', 'Product UX Designer')
    expect(filename).toBe('Fahad Ashfaq - Product UX Designer.pdf')
    // Verify it does NOT append the word "Resume"
    expect(filename.toLowerCase()).not.toContain('resume')

    // Verify slashes in title (e.g. UI/UX) are sanitized to prevent illegal filesystem paths
    expect(sanitizeFilename('Fahad Ashfaq', 'Product UI/UX Designer')).toBe(
      'Fahad Ashfaq - Product UI UX Designer.pdf'
    )
  })

  it('strips invalid filesystem characters and collapses whitespace', () => {
    const filename = sanitizeFilename('Jane/Doe: Senior*Designer?', 'Lead <Architect> | UX\\Specialist')
    expect(filename).toBe('Jane Doe Senior Designer - Lead Architect UX Specialist.pdf')
    expect(filename).not.toMatch(/[\\/:*?"<>|]/)
  })

  it('provides safe fallbacks for empty or null inputs', () => {
    expect(sanitizeFilename('', '')).toBe('Candidate - Professional.pdf')
    expect(sanitizeFilename(null, null)).toBe('Candidate - Professional.pdf')
    expect(sanitizeFilename('   ', '   ')).toBe('Candidate - Professional.pdf')
    expect(sanitizeFilename('John Doe', '')).toBe('John Doe - Professional.pdf')
  })

  it('resolves collisions by appending incrementing index (1), (2)', () => {
    const base = 'Fahad Ashfaq - Product Designer.pdf'
    const existing = [
      'Fahad Ashfaq - Product Designer.pdf',
      'Fahad Ashfaq - Product Designer (1).pdf',
    ]

    const unique1 = getUniqueFilename(base, ['Other File.pdf'])
    expect(unique1).toBe(base)

    const unique2 = getUniqueFilename(base, existing)
    expect(unique2).toBe('Fahad Ashfaq - Product Designer (2).pdf')
  })
})
