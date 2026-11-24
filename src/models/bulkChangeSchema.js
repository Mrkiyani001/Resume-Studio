/**
 * Resume Studio — Bulk Change Data Model & Normalization Helpers
 * Defines the change schema, extensible operations, match statuses, and text comparison helpers.
 */

import { generateId } from './resumeSchema.js'

export const BULK_OPERATIONS = {
  REPLACE: 'REPLACE',
  ADD: 'ADD',
  DELETE: 'DELETE',
  INSERT: 'INSERT',
  REORDER: 'REORDER',
}

export const MATCH_STATUS = {
  MATCHED: 'Matched',
  NEEDS_REVIEW: 'Needs review',
  UNMATCHED: 'Unmatched',
  AMBIGUOUS: 'Ambiguous',
  INVALID: 'Invalid',
}

export const SUPPORTED_SECTIONS = {
  SUMMARY: 'SUMMARY',
  WORK_EXPERIENCE: 'WORK EXPERIENCE',
  SKILLS: 'SKILLS',
  EDUCATION: 'EDUCATION',
  PERSONAL_INFO: 'PERSONAL INFORMATION',
  ADDITIONAL_SECTIONS: 'ADDITIONAL SECTIONS',
}

/**
 * Creates a structured Bulk Change item.
 * @param {Object} partial
 * @returns {Object}
 */
export function createBulkChange(partial = {}) {
  return {
    id: partial.id || generateId(),
    operation: partial.operation || BULK_OPERATIONS.REPLACE,
    section: partial.section || SUPPORTED_SECTIONS.SUMMARY,
    targetContext: partial.targetContext || {}, // e.g. { employer: 'Ghani Branding Agency' }, { categoryName: 'Product & UX' }
    oldText: typeof partial.oldText === 'string' ? partial.oldText : '',
    newText: typeof partial.newText === 'string' ? partial.newText : '',
    status: partial.status || MATCH_STATUS.UNMATCHED,
    statusReason: partial.statusReason || '',
    suggestedTarget: partial.suggestedTarget || null, // { section, field, id, currentText, previewLabel }
    selectedTarget: partial.selectedTarget || null,
    accepted: typeof partial.accepted === 'boolean' ? partial.accepted : false,
  }
}

/**
 * Normalizes regular text for deterministic comparison:
 * - Collapses multiple spaces, tabs, and newlines into a single space
 * - Trims leading/trailing whitespace
 * - Strips leading bullet symbols (•, -, *, ·)
 * - Lowercases
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/^[\s•\-*·\u2022\u00b7]+/, '') // strip leading bullet symbols
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Normalizes skills text by converting all delimiters (·, ,, |, newlines) into unified tokens:
 * @param {string} text
 * @returns {Array<string>} List of lowercase normalized skill tokens
 */
export function extractSkillTokens(text) {
  if (!text || typeof text !== 'string') return []
  // Strip category prefix if present (e.g. "Product & UX: ")
  const clean = text.includes(':') ? text.split(':').slice(1).join(':') : text

  return clean
    .split(/[\n,·|•\u2022\u00b7]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Calculates string similarity using Sørensen–Dice coefficient (bigram similarity).
 * Returns a score between 0.0 (completely dissimilar) and 1.0 (identical).
 * @param {string} str1
 * @param {string} str2
 * @returns {number}
 */
export function calculateDiceSimilarity(str1, str2) {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)

  if (s1 === s2) return 1.0
  if (s1.length < 2 || s2.length < 2) return 0.0

  const bigrams1 = new Map()
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2)
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1)
  }

  let intersectionSize = 0
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2)
    const count = bigrams1.get(bigram) || 0
    if (count > 0) {
      bigrams1.set(bigram, count - 1)
      intersectionSize++
    }
  }

  return (2.0 * intersectionSize) / (s1.length - 1 + s2.length - 1)
}
