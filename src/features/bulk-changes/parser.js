/**
 * Resume Studio — Deterministic Bulk Change Parser
 * Pure decoupled function that parses Old:/New: change blocks from raw text.
 */

import {
  createBulkChange,
  MATCH_STATUS,
  SUPPORTED_SECTIONS,
} from '../../models/bulkChangeSchema.js'

// Standard section aliases mapping to canonical section names
const SECTION_ALIASES = {
  summary: SUPPORTED_SECTIONS.SUMMARY,
  'professional summary': SUPPORTED_SECTIONS.SUMMARY,
  'executive summary': SUPPORTED_SECTIONS.SUMMARY,

  'work experience': SUPPORTED_SECTIONS.WORK_EXPERIENCE,
  experience: SUPPORTED_SECTIONS.WORK_EXPERIENCE,
  employment: SUPPORTED_SECTIONS.WORK_EXPERIENCE,
  positions: SUPPORTED_SECTIONS.WORK_EXPERIENCE,

  skills: SUPPORTED_SECTIONS.SKILLS,
  'skills & categorization': SUPPORTED_SECTIONS.SKILLS,
  'core skills': SUPPORTED_SECTIONS.SKILLS,

  education: SUPPORTED_SECTIONS.EDUCATION,
  'education & credentials': SUPPORTED_SECTIONS.EDUCATION,

  'personal information': SUPPORTED_SECTIONS.PERSONAL_INFO,
  'personal info': SUPPORTED_SECTIONS.PERSONAL_INFO,
  contact: SUPPORTED_SECTIONS.PERSONAL_INFO,

  'additional sections': SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS,
  additional: SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS,
  custom: SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS,
  projects: SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS,
}

/**
 * Parses raw input text into structured change objects.
 * @param {string} rawInput
 * @returns {Array<Object>} List of BulkChange objects
 */
export function parseBulkChanges(rawInput) {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return []
  }

  const lines = rawInput.split(/\r?\n/)
  const changes = []

  let currentSection = null
  let currentTargetContext = {}
  let currentOldText = null
  let currentNewText = null
  let currentReadingMode = null // 'old' | 'new'

  function flushCurrentPair() {
    if (currentTargetContext?.isInvalidHeader && currentOldText === null && currentNewText === null) {
      changes.push(
        createBulkChange({
          section: currentTargetContext.rawHeader,
          targetContext: currentTargetContext,
          oldText: '',
          newText: '',
          status: MATCH_STATUS.INVALID,
          statusReason: `Malformed or unrecognized section heading: [${currentTargetContext.rawHeader}]`,
        })
      )
      currentTargetContext = {}
      return
    }

    if (currentOldText === null && currentNewText === null) {
      return
    }

    const oldStr = currentOldText ? currentOldText.trim() : ''
    const newStr = currentNewText ? currentNewText.trim() : ''

    // If section heading was invalid, mark this change invalid
    if (currentTargetContext?.isInvalidHeader) {
      changes.push(
        createBulkChange({
          section: currentTargetContext.rawHeader,
          targetContext: currentTargetContext,
          oldText: oldStr,
          newText: newStr,
          status: MATCH_STATUS.INVALID,
          statusReason: `Malformed or unrecognized section heading: [${currentTargetContext.rawHeader}]`,
        })
      )
      currentOldText = null
      currentNewText = null
      currentReadingMode = null
      return
    }

    // Detect category name in Skills if specified as "CategoryName: Skills..."
    const context = { ...currentTargetContext }
    if (currentSection === SUPPORTED_SECTIONS.SKILLS && !context.categoryName) {
      if (oldStr.includes(':')) {
        context.categoryName = oldStr.split(':')[0].trim()
      } else if (newStr.includes(':')) {
        context.categoryName = newStr.split(':')[0].trim()
      }
    }

    if (!oldStr && newStr) {
      changes.push(
        createBulkChange({
          section: currentSection || SUPPORTED_SECTIONS.SUMMARY,
          targetContext: context,
          oldText: '',
          newText: newStr,
          status: MATCH_STATUS.INVALID,
          statusReason: 'Missing Old: target text',
        })
      )
    } else if (oldStr && !newStr) {
      changes.push(
        createBulkChange({
          section: currentSection || SUPPORTED_SECTIONS.SUMMARY,
          targetContext: context,
          oldText: oldStr,
          newText: '',
          status: MATCH_STATUS.INVALID,
          statusReason: 'Missing New: replacement text',
        })
      )
    } else if (oldStr && newStr) {
      changes.push(
        createBulkChange({
          section: currentSection || SUPPORTED_SECTIONS.SUMMARY,
          targetContext: context,
          oldText: oldStr,
          newText: newStr,
        })
      )
    }

    currentOldText = null
    currentNewText = null
    currentReadingMode = null
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      // Empty line: if currently reading Old or New, preserve paragraph separation if needed,
      // or continue reading multiline text
      if (currentReadingMode === 'old' && currentOldText !== null) {
        currentOldText += '\n'
      } else if (currentReadingMode === 'new' && currentNewText !== null) {
        currentNewText += '\n'
      }
      continue
    }

    // 1. Check for Section Header, e.g. [SUMMARY], [WORK EXPERIENCE: Ghani Branding Agency], [SKILLS]
    const bracketHeaderMatch = trimmed.match(/^\[([^\]]+)\]$/)

    if (bracketHeaderMatch) {
      const headerContent = bracketHeaderMatch[1].trim()
      let sectionName = headerContent
      let targetParam = ''

      if (headerContent.includes(':')) {
        const parts = headerContent.split(':')
        sectionName = parts[0].trim()
        targetParam = parts.slice(1).join(':').trim()
      }

      const canonicalSection = SECTION_ALIASES[sectionName.toLowerCase()]
      if (canonicalSection) {
        flushCurrentPair()
        currentSection = canonicalSection
        currentTargetContext = {}

        if (targetParam) {
          if (canonicalSection === SUPPORTED_SECTIONS.WORK_EXPERIENCE) {
            currentTargetContext.employer = targetParam
          } else if (canonicalSection === SUPPORTED_SECTIONS.SKILLS) {
            currentTargetContext.categoryName = targetParam
          } else if (canonicalSection === SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS) {
            currentTargetContext.title = targetParam
          }
        }
        continue
      } else {
        // Malformed or unrecognized bracket heading
        flushCurrentPair()
        currentSection = headerContent
        currentTargetContext = { isInvalidHeader: true, rawHeader: headerContent }
        continue
      }
    }

    // Check if line is "Old:" or "Old :" (case-insensitive)
    const oldPrefixMatch = trimmed.match(/^old\s*:\s*(.*)$/i)
    if (oldPrefixMatch) {
      // If we were already reading an Old without a New, flush it as invalid
      if (currentOldText !== null && currentNewText === null) {
        flushCurrentPair()
      } else if (currentOldText !== null && currentNewText !== null) {
        flushCurrentPair()
      }
      currentOldText = oldPrefixMatch[1]
      currentReadingMode = 'old'
      continue
    }

    // Check if line is "New:" or "New :" (case-insensitive)
    const newPrefixMatch = trimmed.match(/^new\s*:\s*(.*)$/i)
    if (newPrefixMatch) {
      currentNewText = newPrefixMatch[1]
      currentReadingMode = 'new'
      continue
    }

    // Line does not start with Old: or New: or section header.
    // If we are currently reading Old text, append this line
    if (currentReadingMode === 'old') {
      currentOldText = currentOldText ? `${currentOldText} ${trimmed}` : trimmed
    } else if (currentReadingMode === 'new') {
      currentNewText = currentNewText ? `${currentNewText} ${trimmed}` : trimmed
    }
  }

  // Flush any final pending pair at end of input
  flushCurrentPair()

  return changes
}
