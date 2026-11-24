import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import React from 'react'
import { Document, Page, pdf } from '@react-pdf/renderer'
import { unspaceName, classifyDocxHtml, classifyPlainText } from '../features/smart-import/classifier.js'
import { parseImportFile } from '../features/smart-import/importParser.js'

describe('Smart Import — Pure Classifier & File Parser', () => {
  describe('unspaceName', () => {
    it('correctly unspaces uppercase letter-spaced names', () => {
      expect(unspaceName('F A H A D  A S H F A Q')).toBe('Fahad Ashfaq')
      expect(unspaceName('J O H N  D O E')).toBe('John Doe')
      expect(unspaceName('M A R Y  J A N E  W A T S O N')).toBe('Mary Jane Watson')
    })

    it('preserves normally formatted names without distortion', () => {
      expect(unspaceName('Fahad Ashfaq')).toBe('Fahad Ashfaq')
      expect(unspaceName('John Doe')).toBe('John Doe')
      expect(unspaceName('')).toBe('')
      expect(unspaceName(null)).toBe('')
    })
  })

  describe('Real Reference DOCX Import', () => {
    it('parses the authoritative reference DOCX file with exact field fidelity', async () => {
      const docxPath = path.resolve(process.cwd(), 'reference/Fahad Ashfaq - Product UX Designer 2026 .docx')
      expect(fs.existsSync(docxPath)).toBe(true)

      const fileBuffer = fs.readFileSync(docxPath)
      const file = new File([fileBuffer], 'Fahad Ashfaq - Product UX Designer 2026 .docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const result = await parseImportFile(file)
      expect(result).toBeDefined()
      expect(result.filename).toBe('Fahad Ashfaq - Product UX Designer 2026 .docx')

      const resume = result.resumeData
      expect(resume).toBeDefined()

      // 1. Personal Information
      expect(resume.personalInfo.fullName).toBe('Fahad Ashfaq')
      expect(resume.personalInfo.headline).toBe('Product UI/UX Designer')
      expect(resume.personalInfo.phone).toBe('+92 325 8028150')
      expect(resume.personalInfo.email).toBe('fahadashfaq.sh@gmail.com')
      expect(resume.personalInfo.location).toBe('')

      // Links: LinkedIn & Portfolio
      expect(resume.personalInfo.linkedin).toBeDefined()
      expect(resume.personalInfo.linkedin.url).toContain('linkedin.com')
      expect(resume.personalInfo.linkedin.isVisible).toBe(true)

      expect(resume.personalInfo.portfolio).toBeDefined()
      expect(resume.personalInfo.portfolio.url).toContain('framer.website')
      expect(resume.personalInfo.portfolio.isVisible).toBe(true)

      // 2. Summary
      expect(resume.summary.length).toBeGreaterThan(50)
      expect(resume.summary).toContain('Product UI/UX designer')

      // 3. Work Experience
      expect(resume.workExperiences.length).toBe(3)

      // Experience 1
      const exp1 = resume.workExperiences[0]
      expect(exp1.jobTitle).toContain('UI/UX Designer')
      expect(exp1.employer).toContain('Ghani Branding Agency')
      expect(exp1.bullets.length).toBeGreaterThan(0)

      // Experience 2
      const exp2 = resume.workExperiences[1]
      expect(exp2.employer).toContain('AI Orbit')
      expect(exp2.bullets.length).toBeGreaterThan(0)

      // Experience 3
      const exp3 = resume.workExperiences[2]
      expect(exp3.employer).toContain('Graphic View')
      expect(exp3.bullets.length).toBeGreaterThan(0)

      // 4. Skills
      expect(resume.skills.length).toBeGreaterThanOrEqual(2)
      const skillNames = resume.skills.map((s) => s.categoryName.toLowerCase())
      expect(skillNames.some((cat) => cat.includes('design') || cat.includes('competencies') || cat.includes('tools'))).toBe(true)

      // 5. Education
      expect(resume.education.length).toBeGreaterThanOrEqual(1)
      const edu = resume.education[0]
      expect(edu.degree).toContain('Bachelor of Science')
      expect(edu.institution).toContain('Virtual University')
    })
  })

  describe('Scanned PDF Detection', () => {
    it('throws a descriptive error when a PDF contains no or under 50 characters of selectable text', async () => {
      // Create a valid digital PDF with NO text elements (simulating a pure scanned image / empty document)
      const emptyDoc = React.createElement(Document, null, React.createElement(Page, { size: 'A4' }))
      const blob = await pdf(emptyDoc).toBlob()
      const file = new File([blob], 'scanned-or-empty.pdf', { type: 'application/pdf' })

      await expect(parseImportFile(file)).rejects.toThrow(
        /Scanned PDF detected/i
      )
    })
  })

  describe('Unassigned Content Preservation (Zero Silent Data Loss)', () => {
    it('preserves unrecognized headings and body text in unassignedContent tray', () => {
      const mockHtml = `
        <p><strong>F A H A D  A S H F A Q</strong></p>
        <p>Product Designer</p>
        <p>+123456789</p>
        <p><strong>UNKNOWN CUSTOM SECTION HEADER</strong></p>
        <p>This is unique custom content that does not match standard schemas and must not be silently discarded.</p>
      `

      const { resumeData, unassignedContent } = classifyDocxHtml(mockHtml)

      expect(resumeData.personalInfo.fullName).toBe('Fahad Ashfaq')
      expect(unassignedContent.length).toBeGreaterThan(0)
      const unassignedText = unassignedContent.join(' ')
      expect(unassignedText).toContain('UNKNOWN CUSTOM SECTION HEADER')
      expect(unassignedText).toContain('This is unique custom content')
    })

    it('plain text classifier preserves unassigned lines cleanly', () => {
      const rawText = `
        Jane Doe
        Software Engineer
        jane@example.com

        PATENTS & AWARDS
        US Patent 12345 - Distributed Consensus Protocol
        Winner of Hackathon 2024
      `

      const { resumeData, unassignedContent } = classifyPlainText(rawText)
      expect(resumeData.personalInfo.fullName).toBe('Jane Doe')
      expect(unassignedContent.length).toBeGreaterThan(0)
      expect(unassignedContent.some((line) => line.includes('Patent 12345'))).toBe(true)
    })
  })
})
