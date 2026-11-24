/**
 * Resume Studio — Deterministic 4-Step Matcher
 * Matches parsed bulk changes against resumeData with zero UI coupling.
 */

import {
  MATCH_STATUS,
  SUPPORTED_SECTIONS,
  normalizeText,
  extractSkillTokens,
  calculateDiceSimilarity,
} from '../../models/bulkChangeSchema.js'

/**
 * Strips punctuation and delimiters for Step 2 matching.
 * @param {string} text
 * @returns {string}
 */
function stripPunctuation(text) {
  return normalizeText(text).replace(/[.,;:·|•\-–—]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Builds candidate targets from resumeData for a given section.
 * @param {Object} resumeData
 * @param {string} section
 * @param {Object} targetContext
 * @returns {Array<Object>} List of candidate targets
 */
export function getCandidatesForSection(resumeData, section, targetContext = {}) {
  if (!resumeData) return []

  const candidates = []

  switch (section) {
    case SUPPORTED_SECTIONS.SUMMARY: {
      candidates.push({
        section: SUPPORTED_SECTIONS.SUMMARY,
        field: 'summary',
        id: 'summary-field',
        text: resumeData.summary || '',
        previewLabel: 'Executive Summary',
      })
      break
    }

    case SUPPORTED_SECTIONS.WORK_EXPERIENCE: {
      const experiences = resumeData.workExperiences || []
      const targetEmployerNorm = targetContext.employer
        ? normalizeText(targetContext.employer)
        : null

      // Filter by employer if specified
      const relevantExps = targetEmployerNorm
        ? experiences.filter((exp) => {
            const empNorm = normalizeText(exp.employer)
            const titleNorm = normalizeText(exp.jobTitle)
            return empNorm.includes(targetEmployerNorm) || targetEmployerNorm.includes(empNorm) || titleNorm.includes(targetEmployerNorm)
          })
        : experiences

      relevantExps.forEach((exp) => {
        ;(exp.bullets || []).forEach((b) => {
          candidates.push({
            section: SUPPORTED_SECTIONS.WORK_EXPERIENCE,
            experienceId: exp.id,
            employer: exp.employer,
            jobTitle: exp.jobTitle,
            bulletId: b.id,
            text: b.text || '',
            previewLabel: `${exp.employer || 'Role'}: "${(b.text || '').substring(0, 50)}..."`,
          })
        })
      })
      break
    }

    case SUPPORTED_SECTIONS.SKILLS: {
      const categories = resumeData.skills || []
      const targetCatNorm = targetContext.categoryName
        ? normalizeText(targetContext.categoryName)
        : null

      const relevantCats = targetCatNorm
        ? categories.filter((cat) => {
            const catNorm = normalizeText(cat.categoryName)
            return catNorm.includes(targetCatNorm) || targetCatNorm.includes(catNorm)
          })
        : categories

      relevantCats.forEach((cat) => {
        const skillsString = (cat.skills || []).map((s) => s.name).join(' ')
        candidates.push({
          section: SUPPORTED_SECTIONS.SKILLS,
          categoryId: cat.id,
          categoryName: cat.categoryName,
          text: `${cat.categoryName}: ${skillsString}`,
          skillsList: cat.skills || [],
          previewLabel: `Skills Category: ${cat.categoryName}`,
        })
      })
      break
    }

    case SUPPORTED_SECTIONS.EDUCATION: {
      const education = resumeData.education || []
      education.forEach((edu) => {
        candidates.push({
          section: SUPPORTED_SECTIONS.EDUCATION,
          educationId: edu.id,
          field: 'degree',
          text: `${edu.degree || ''} ${edu.institution || ''} ${edu.description || ''}`,
          previewLabel: `${edu.degree || 'Degree'} (${edu.institution || 'School'})`,
        })
      })
      break
    }

    case SUPPORTED_SECTIONS.PERSONAL_INFO: {
      const p = resumeData.personalInfo || {}
      candidates.push({
        section: SUPPORTED_SECTIONS.PERSONAL_INFO,
        field: 'headline',
        text: p.headline || '',
        previewLabel: 'Professional Headline',
      })
      candidates.push({
        section: SUPPORTED_SECTIONS.PERSONAL_INFO,
        field: 'fullName',
        text: p.fullName || '',
        previewLabel: 'Full Name',
      })
      break
    }

    case SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS: {
      const sections = resumeData.additionalSections || []
      sections.forEach((sec) => {
        ;(sec.items || []).forEach((item) => {
          candidates.push({
            section: SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS,
            sectionId: sec.id,
            sectionTitle: sec.title,
            itemId: item.id,
            text: `${item.title || ''} ${item.subtitle || ''} ${item.text || ''}`,
            previewLabel: `${sec.title}: ${item.title || 'Item'}`,
          })
        })
      })
      break
    }

    default:
      break
  }

  return candidates
}

/**
 * Returns all selectable candidate targets across the entire resumeData.
 * Used by the Manual Target Picker dropdown in the Review UI.
 * @param {Object} resumeData
 * @returns {Array<Object>}
 */
export function getAllCandidateTargets(resumeData) {
  if (!resumeData) return []
  const all = [
    ...getCandidatesForSection(resumeData, SUPPORTED_SECTIONS.SUMMARY),
    ...getCandidatesForSection(resumeData, SUPPORTED_SECTIONS.WORK_EXPERIENCE),
    ...getCandidatesForSection(resumeData, SUPPORTED_SECTIONS.SKILLS),
    ...getCandidatesForSection(resumeData, SUPPORTED_SECTIONS.EDUCATION),
    ...getCandidatesForSection(resumeData, SUPPORTED_SECTIONS.PERSONAL_INFO),
    ...getCandidatesForSection(resumeData, SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS),
  ]
  return all
}

/**
 * Checks if a bullet text appears in multiple different experiences across the entire resume.
 * @param {Object} resumeData
 * @param {string} text
 * @returns {boolean}
 */
function isDuplicateTextAcrossExperiences(resumeData, text) {
  const norm = normalizeText(text)
  if (!norm) return false

  let matchCount = 0
  const experiences = resumeData.workExperiences || []
  for (const exp of experiences) {
    for (const b of exp.bullets || []) {
      if (normalizeText(b.text) === norm) {
        matchCount++
      }
    }
  }
  return matchCount > 1
}

/**
 * Deterministic 4-Step Matcher.
 * Matches an array of parsed changes against current resumeData.
 *
 * @param {Array<Object>} parsedChanges
 * @param {Object} resumeData
 * @returns {Array<Object>} Changes with match status and suggestedTarget
 */
export function matchBulkChanges(parsedChanges, resumeData) {
  if (!Array.isArray(parsedChanges) || parsedChanges.length === 0) {
    return []
  }

  return parsedChanges.map((change) => {
    // 1. If already flagged as invalid (missing Old, missing New, malformed header), preserve status
    if (change.status === MATCH_STATUS.INVALID) {
      return {
        ...change,
        accepted: false,
      }
    }

    const normOld = normalizeText(change.oldText)
    const strippedOld = stripPunctuation(change.oldText)

    // Check duplicate bullet across experiences requirement
    if (
      change.section === SUPPORTED_SECTIONS.WORK_EXPERIENCE &&
      isDuplicateTextAcrossExperiences(resumeData, change.oldText) &&
      !change.targetContext?.employer
    ) {
      return {
        ...change,
        status: MATCH_STATUS.AMBIGUOUS,
        statusReason: 'Identical bullet text appears in multiple work experiences',
        accepted: false,
      }
    }

    const candidates = getCandidatesForSection(
      resumeData,
      change.section,
      change.targetContext
    )

    if (candidates.length === 0) {
      // Check if employer in header was not found
      if (change.section === SUPPORTED_SECTIONS.WORK_EXPERIENCE && change.targetContext?.employer) {
        // Fallback: check if bullet matches anywhere else in other experiences
        const allExpCandidates = getCandidatesForSection(resumeData, change.section, {})
        const fallbackMatch = allExpCandidates.find(
          (c) => normalizeText(c.text) === normOld
        )
        if (fallbackMatch) {
          return {
            ...change,
            status: MATCH_STATUS.NEEDS_REVIEW,
            statusReason: `Target employer "${change.targetContext.employer}" not found, but bullet matched under "${fallbackMatch.employer}"`,
            suggestedTarget: fallbackMatch,
            accepted: false,
          }
        }
      }

      return {
        ...change,
        status: MATCH_STATUS.UNMATCHED,
        statusReason: `No candidate targets found in section ${change.section}`,
        accepted: false,
      }
    }

    // Step 1: Exact Normalized Match
    const exactMatches = candidates.filter(
      (c) => normalizeText(c.text) === normOld
    )

    if (exactMatches.length === 1) {
      return {
        ...change,
        status: MATCH_STATUS.MATCHED,
        statusReason: 'Exact match',
        suggestedTarget: exactMatches[0],
        accepted: true,
      }
    }

    if (exactMatches.length > 1) {
      return {
        ...change,
        status: MATCH_STATUS.AMBIGUOUS,
        statusReason: `Identical text found in ${exactMatches.length} candidate positions`,
        suggestedTarget: exactMatches[0],
        accepted: false,
      }
    }

    // Step 2: Whitespace / Punctuation-Normalized Match
    if (change.section === SUPPORTED_SECTIONS.SKILLS) {
      // Specialized token match for skills with ·, ,, |, whitespace
      const oldTokens = extractSkillTokens(change.oldText)

      let bestSkillCandidate = null
      let maxOverlap = 0

      candidates.forEach((cand) => {
        const candTokens =
          cand.skillsList && cand.skillsList.length > 0
            ? cand.skillsList.map((s) => s.name.trim().toLowerCase())
            : extractSkillTokens(cand.text)
        const overlap = oldTokens.filter((t) => candTokens.includes(t)).length
        if (overlap > maxOverlap) {
          maxOverlap = overlap
          bestSkillCandidate = cand
        }
      })

      const targetCat = normalizeText(change.targetContext?.categoryName)
      const isTargetCatMatch = bestSkillCandidate && normalizeText(bestSkillCandidate.categoryName) === targetCat

      // If category name matched or at least 50% of tokens match or at least 2 tokens
      if (
        bestSkillCandidate &&
        (isTargetCatMatch || maxOverlap >= Math.ceil(oldTokens.length * 0.5) || maxOverlap >= 2)
      ) {
        return {
          ...change,
          status: MATCH_STATUS.MATCHED,
          statusReason: 'Matched skill category with normalized delimiters (·, commas, spaces)',
          suggestedTarget: bestSkillCandidate,
          accepted: true,
        }
      }
    }

    const punctMatches = candidates.filter(
      (c) => stripPunctuation(c.text) === strippedOld
    )

    if (punctMatches.length === 1) {
      return {
        ...change,
        status: MATCH_STATUS.MATCHED,
        statusReason: 'Matched with normalized punctuation/whitespace',
        suggestedTarget: punctMatches[0],
        accepted: true,
      }
    }

    if (punctMatches.length > 1) {
      return {
        ...change,
        status: MATCH_STATUS.AMBIGUOUS,
        statusReason: `Multiple matches (${punctMatches.length}) after punctuation normalization`,
        suggestedTarget: punctMatches[0],
        accepted: false,
      }
    }

    // Step 3: Conservative Similarity Match (Threshold >= 0.70)
    let bestCandidate = null
    let bestScore = 0

    candidates.forEach((cand) => {
      const score = calculateDiceSimilarity(cand.text, change.oldText)
      if (score > bestScore) {
        bestScore = score
        bestCandidate = cand
      }
    })

    if (bestScore >= 0.7) {
      return {
        ...change,
        status: MATCH_STATUS.NEEDS_REVIEW,
        statusReason: `Conservative similarity match (${Math.round(bestScore * 100)}% match) — requires user review`,
        suggestedTarget: bestCandidate,
        accepted: false,
      }
    }

    // Step 4: Unresolved
    return {
      ...change,
      status: MATCH_STATUS.UNMATCHED,
      statusReason: 'No matching text found in this section',
      suggestedTarget: null,
      accepted: false,
    }
  })
}
