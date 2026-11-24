/**
 * Resume Studio — Pure Smart Import Section Classifier
 * Deterministically classifies HTML (from DOCX) or raw text (from PDF) into normalized resumeData.
 * Strict Rule: Zero silent data loss — unclassified items are preserved in unassignedContent.
 */

import {
  generateId,
  createEmptyResume,
  normalizeResumeData,
  createLink,
} from '../../models/resumeSchema.js'

/**
 * Un-spaces uppercase names like "F A H A D  A S H F A Q" -> "Fahad Ashfaq".
 * @param {string} raw
 * @returns {string}
 */
export function unspaceName(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const trimmed = raw.trim()

  // Case 1: Double-space separated words where each word has spaced letters: "F A H A D  A S H F A Q"
  const multiParts = trimmed.split(/\s{2,}/)
  if (multiParts.length > 1 && multiParts.every((p) => /^([A-Za-z]\s*)+$/.test(p.trim()))) {
    return multiParts
      .map((p) => {
        const w = p.replace(/\s+/g, '')
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      })
      .join(' ')
  }

  // Case 2: Single word spaced: "F A H A D"
  if (/^([A-Za-z]\s+)+[A-Za-z]$/.test(trimmed)) {
    const joined = trimmed.replace(/\s+/g, '')
    return joined.charAt(0).toUpperCase() + joined.slice(1).toLowerCase()
  }

  return trimmed
}

/**
 * Extracts date range strings from text (e.g. "Oct 2025 – Oct 2026", "2022 – 2026").
 * @param {string} text
 * @returns {{ dateStr: string, cleanText: string, startDate: string, endDate: string }}
 */
function extractDatesFromText(text) {
  const dateRegex =
    /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}\s*[–—\-to\s]+\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}|Present|Current)/i

  const match = text.match(dateRegex)
  if (match) {
    const dateStr = match[0].trim()
    const cleanText = text.replace(match[0], '').replace(/\s+/g, ' ').trim()
    const parts = dateStr.split(/[–—-]/).map((s) => s.trim())
    return {
      dateStr,
      cleanText,
      startDate: parts[0] || '',
      endDate: parts[1] || '',
    }
  }

  return { dateStr: '', cleanText: text.trim(), startDate: '', endDate: '' }
}

/**
 * Classifies HTML output produced by Mammoth.js from a DOCX file.
 * Preserves working hyperlinks from <a> tags and bullet lists from <ul>/<li> tags.
 *
 * @param {string} html
 * @returns {{ resumeData: Object, unassignedContent: Array<string> }}
 */
export function classifyDocxHtml(html) {
  const baseResume = createEmptyResume()
  const unassignedContent = []

  if (!html || typeof html !== 'string' || !html.trim()) {
    return { resumeData: baseResume, unassignedContent }
  }

  // Parse HTML DOM
  let doc
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    doc = parser.parseFromString(html, 'text/html')
  } else if (typeof document !== 'undefined') {
    doc = document.implementation.createHTMLDocument('')
    doc.body.innerHTML = html
  } else {
    // Fallback if no DOM available
    return classifyPlainText(html.replace(/<[^>]+>/g, ' '))
  }

  const elements = Array.from(doc.body.children)
  if (elements.length === 0) {
    return { resumeData: baseResume, unassignedContent }
  }

  let currentSection = 'header'
  let currentExperience = null
  let currentSkillCategory = null
  let currentEducation = null

  // Helper to normalize heading tokens
  function detectSectionHeading(text) {
    const clean = text.replace(/\s+/g, '').toUpperCase()
    if (clean === 'SUMMARY' || clean === 'PROFESSIONALSUMMARY' || clean === 'EXECUTIVESUMMARY') {
      return 'summary'
    }
    if (clean === 'WORKEXPERIENCE' || clean === 'EXPERIENCE' || clean === 'EMPLOYMENT') {
      return 'experience'
    }
    if (clean === 'SKILLS' || clean === 'SKILLSCATEGORIZATION' || clean === 'CORESKILLS') {
      return 'skills'
    }
    if (clean === 'EDUCATION' || clean === 'EDUCATIONCREDENTIALS') {
      return 'education'
    }
    return null
  }

  // Iterate top-level DOM nodes
  elements.forEach((el, index) => {
    const text = el.textContent ? el.textContent.trim() : ''
    if (!text) return

    const headingType = detectSectionHeading(text)

    // Check if element is a section heading
    if (headingType) {
      currentSection = headingType
      if (headingType === 'skills') {
        baseResume.skills = []
      } else if (headingType === 'experience') {
        baseResume.workExperiences = []
      } else if (headingType === 'education') {
        baseResume.education = []
      }
      return
    }

    // SECTION 1: HEADER (Name, Headline, Contact)
    if (currentSection === 'header') {
      if (!baseResume.personalInfo.fullName) {
        baseResume.personalInfo.fullName = unspaceName(text)
        return
      }
      if (!baseResume.personalInfo.headline && index === 1) {
        baseResume.personalInfo.headline = text
        return
      }

      let matchedContact = false

      // Check contact row (emails, phones, links)
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) {
        baseResume.personalInfo.email = emailMatch[0]
        matchedContact = true
      }

      const phoneMatch = text.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\+\d[\d\s-]{8,}\d/)
      if (phoneMatch) {
        baseResume.personalInfo.phone = phoneMatch[0].trim()
        matchedContact = true
      }

      // Extract all <a> links
      const links = Array.from(el.querySelectorAll('a'))
      if (links.length > 0) {
        matchedContact = true
      }
      links.forEach((a) => {
        const href = a.getAttribute('href') || ''
        const linkText = a.textContent ? a.textContent.trim() : ''
        if (href.startsWith('mailto:')) {
          baseResume.personalInfo.email = href.replace(/^mailto:/, '').trim()
        } else if (href.includes('linkedin.com')) {
          baseResume.personalInfo.linkedin = createLink({
            url: href,
            displayText: linkText || 'LinkedIn',
            isVisible: true,
          })
        } else if (
          linkText.toLowerCase().includes('portfolio') ||
          href.includes('framer') ||
          href.includes('github.io') ||
          !baseResume.personalInfo.portfolio?.url
        ) {
          baseResume.personalInfo.portfolio = createLink({
            url: href,
            displayText: linkText || 'Portfolio',
            isVisible: true,
          })
        } else {
          baseResume.personalInfo.customLinks.push(
            createLink({
              url: href,
              displayText: linkText || href,
              isVisible: true,
            })
          )
        }
      })

      // If text has location
      if (text.includes(',') && !baseResume.personalInfo.location && !emailMatch && !phoneMatch) {
        baseResume.personalInfo.location = text
        matchedContact = true
      }

      if (matchedContact) return

      unassignedContent.push(text)
      return
    }

    // SECTION 2: SUMMARY
    if (currentSection === 'summary') {
      baseResume.summary = baseResume.summary ? `${baseResume.summary}\n${text}` : text
      return
    }

    // SECTION 3: WORK EXPERIENCE
    if (currentSection === 'experience') {
      // If it's a <ul> of bullets
      if (el.tagName === 'UL') {
        const liItems = Array.from(el.querySelectorAll('li'))
        liItems.forEach((li) => {
          const bulletText = li.textContent ? li.textContent.trim() : ''
          if (bulletText) {
            if (currentExperience) {
              currentExperience.bullets.push({ id: generateId(), text: bulletText })
            } else {
              unassignedContent.push(bulletText)
            }
          }
        })
        return
      }

      // Check if it's a role / employer line (contains pipe | or strong)
      if (text.includes('|') || el.querySelector('strong')) {
        const { cleanText, startDate, endDate } = extractDatesFromText(text)
        let jobTitle
        let employer = ''

        if (cleanText.includes('|')) {
          const parts = cleanText.split('|').map((s) => s.trim())
          jobTitle = parts[0] || ''
          employer = parts.slice(1).join('|').trim()
        } else {
          const strong = el.querySelector('strong')
          if (strong) {
            jobTitle = strong.textContent ? strong.textContent.trim() : ''
            employer = cleanText.replace(jobTitle, '').trim()
          } else {
            jobTitle = cleanText
          }
        }

        currentExperience = {
          id: generateId(),
          employer: employer || 'Employer',
          jobTitle: jobTitle || 'Role',
          startDate,
          endDate,
          location: '',
          bullets: [],
        }
        baseResume.workExperiences.push(currentExperience)
        return
      }

      // If regular paragraph bullet under an experience
      if (currentExperience && (text.startsWith('–') || text.startsWith('•') || text.startsWith('-'))) {
        const cleanBullet = text.replace(/^[–•\-*\s]+/, '').trim()
        if (cleanBullet) {
          currentExperience.bullets.push({ id: generateId(), text: cleanBullet })
          return
        }
      }

      unassignedContent.push(text)
      return
    }

    // SECTION 4: SKILLS
    if (currentSection === 'skills') {
      if (text.includes(':')) {
        const colonIdx = text.indexOf(':')
        const categoryName = text.substring(0, colonIdx).trim()
        const skillsString = text.substring(colonIdx + 1).trim()
        const skillTokens = skillsString
          .split(/[\n,·|•\u2022\u00b7]+/)
          .map((s) => s.trim())
          .filter(Boolean)

        currentSkillCategory = {
          id: generateId(),
          categoryName: categoryName || 'Skills',
          skills: skillTokens.map((name) => ({ id: generateId(), name })),
        }
        baseResume.skills.push(currentSkillCategory)
        return
      }

      unassignedContent.push(text)
      return
    }

    // SECTION 5: EDUCATION
    if (currentSection === 'education') {
      const { cleanText, startDate, endDate } = extractDatesFromText(text)
      let degree
      let institution = ''

      if (cleanText.includes('|')) {
        const parts = cleanText.split('|').map((s) => s.trim())
        degree = parts[0] || ''
        institution = parts.slice(1).join('|').trim()
      } else {
        const strong = el.querySelector('strong')
        if (strong) {
          degree = strong.textContent ? strong.textContent.trim() : ''
          institution = cleanText.replace(degree, '').trim()
        } else {
          degree = cleanText
        }
      }

      currentEducation = {
        id: generateId(),
        degree: degree || 'Degree',
        institution: institution || '',
        startDate,
        endDate,
        description: '',
      }
      baseResume.education.push(currentEducation)
      return
    }

    // Any other text
    unassignedContent.push(text)
  })

  // Ensure default structure
  if (baseResume.workExperiences.length === 0) {
    baseResume.workExperiences = [
      { id: generateId(), employer: '', jobTitle: '', startDate: '', endDate: '', bullets: [{ id: generateId(), text: '' }] },
    ]
  }
  if (baseResume.skills.length === 0) {
    baseResume.skills = [{ id: generateId(), categoryName: 'Core Skills', skills: [] }]
  }

  return {
    resumeData: normalizeResumeData(baseResume),
    unassignedContent,
  }
}

/**
 * Classifies raw text extracted from digital PDF or text file.
 * @param {string} rawText
 * @returns {{ resumeData: Object, unassignedContent: Array<string> }}
 */
export function classifyPlainText(rawText) {
  const baseResume = createEmptyResume()
  const unassignedContent = []

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { resumeData: baseResume, unassignedContent }
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    return { resumeData: baseResume, unassignedContent }
  }

  let currentSection = 'header'
  let currentExperience = null

  function detectHeading(line) {
    const clean = line.replace(/\s+/g, '').toUpperCase()
    if (clean === 'SUMMARY' || clean === 'PROFESSIONALSUMMARY') return 'summary'
    if (clean === 'WORKEXPERIENCE' || clean === 'EXPERIENCE') return 'experience'
    if (clean === 'SKILLS') return 'skills'
    if (clean === 'EDUCATION') return 'education'
    return null
  }

  lines.forEach((line, index) => {
    const heading = detectHeading(line)
    if (heading) {
      currentSection = heading
      if (heading === 'experience') baseResume.workExperiences = []
      if (heading === 'skills') baseResume.skills = []
      if (heading === 'education') baseResume.education = []
      return
    }

    if (currentSection === 'header') {
      if (!baseResume.personalInfo.fullName) {
        baseResume.personalInfo.fullName = unspaceName(line)
        return
      }
      if (!baseResume.personalInfo.headline && index === 1) {
        baseResume.personalInfo.headline = line
        return
      }

      let matchedContact = false
      const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) {
        baseResume.personalInfo.email = emailMatch[0]
        matchedContact = true
      }

      const phoneMatch = line.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\+\d[\d\s-]{8,}\d/)
      if (phoneMatch) {
        baseResume.personalInfo.phone = phoneMatch[0].trim()
        matchedContact = true
      }

      if (line.includes('linkedin.com')) {
        baseResume.personalInfo.linkedin = createLink({
          url: line.includes('http') ? line : `https://${line}`,
          displayText: 'LinkedIn',
          isVisible: true,
        })
        matchedContact = true
      }

      if (matchedContact) return

      unassignedContent.push(line)
      return
    }

    if (currentSection === 'summary') {
      baseResume.summary = baseResume.summary ? `${baseResume.summary} ${line}` : line
      return
    }

    if (currentSection === 'experience') {
      if (line.includes('|')) {
        const { startDate, endDate, cleanText } = extractDatesFromText(line)
        const parts = cleanText.split('|').map((s) => s.trim())
        currentExperience = {
          id: generateId(),
          jobTitle: parts[0] || 'Role',
          employer: parts.slice(1).join('|').trim() || 'Company',
          startDate,
          endDate,
          bullets: [],
        }
        baseResume.workExperiences.push(currentExperience)
        return
      }

      if (currentExperience && (line.startsWith('–') || line.startsWith('•') || line.startsWith('-'))) {
        const bulletText = line.replace(/^[–•\-*\s]+/, '').trim()
        if (bulletText) {
          currentExperience.bullets.push({ id: generateId(), text: bulletText })
          return
        }
      }

      unassignedContent.push(line)
      return
    }

    if (currentSection === 'skills') {
      if (line.includes(':')) {
        const parts = line.split(':')
        const categoryName = parts[0].trim()
        const skillTokens = parts
          .slice(1)
          .join(':')
          .split(/[\n,·|•\u2022\u00b7]+/)
          .map((s) => s.trim())
          .filter(Boolean)

        baseResume.skills.push({
          id: generateId(),
          categoryName,
          skills: skillTokens.map((name) => ({ id: generateId(), name })),
        })
        return
      }
      unassignedContent.push(line)
      return
    }

    if (currentSection === 'education') {
      const { startDate, endDate, cleanText } = extractDatesFromText(line)
      const parts = cleanText.split('|').map((s) => s.trim())
      baseResume.education.push({
        id: generateId(),
        degree: parts[0] || cleanText,
        institution: parts.slice(1).join('|').trim() || '',
        startDate,
        endDate,
        description: '',
      })
      return
    }

    unassignedContent.push(line)
  })

  return {
    resumeData: normalizeResumeData(baseResume),
    unassignedContent,
  }
}
