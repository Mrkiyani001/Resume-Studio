/**
 * Resume Studio — Deterministic Bulk Change Applier
 * Pure decoupled function that applies accepted bulk changes onto a deep copy of resumeData.
 */

import { cloneResumeData, generateId } from '../../models/resumeSchema.js'
import { MATCH_STATUS, SUPPORTED_SECTIONS, normalizeText } from '../../models/bulkChangeSchema.js'

/**
 * Parses a skill replacement string into an array of { id, name } objects.
 * Handles delimiters: \n, ,, ·, |, •
 * If the string contains "CategoryName: Skills...", splits into categoryName and skills.
 * @param {string} raw
 * @returns {{ categoryName: string|null, skills: Array<{ id: string, name: string }> }}
 */
export function parseSkillReplacement(raw) {
  if (!raw || typeof raw !== 'string') {
    return { categoryName: null, skills: [] }
  }

  let text = raw.trim()
  let categoryName = null

  if (text.includes(':')) {
    const parts = text.split(':')
    categoryName = parts[0].trim()
    text = parts.slice(1).join(':').trim()
  }

  // Split on delimiters
  const rawTokens = text.split(/[\n,·|•\u2022\u00b7]+/).map((s) => s.trim()).filter(Boolean)
  const skills = rawTokens.map((name) => ({
    id: generateId(),
    name,
  }))

  return { categoryName, skills }
}

/**
 * Pure function that applies an array of accepted bulk changes onto resumeData.
 * Guarantees zero mutation of the input resumeData object.
 *
 * @param {Object} resumeData Current resume structure
 * @param {Array<Object>} changes List of BulkChange items
 * @returns {Object} Deep-copied updated resumeData
 */
export function applyBulkChanges(resumeData, changes = []) {
  if (!resumeData) return resumeData
  const result = cloneResumeData(resumeData, false)

  if (!Array.isArray(changes) || changes.length === 0) {
    return result
  }

  // Filter only accepted changes that are not Invalid
  const acceptedChanges = changes.filter(
    (c) => c.accepted && c.status !== MATCH_STATUS.INVALID
  )

  for (const change of acceptedChanges) {
    const target = change.selectedTarget || change.suggestedTarget
    const section = target?.section || change.section
    const newText = change.newText || ''

    switch (section) {
      case SUPPORTED_SECTIONS.SUMMARY: {
        result.summary = newText
        break
      }

      case SUPPORTED_SECTIONS.WORK_EXPERIENCE: {
        const experiences = result.workExperiences || []
        let targetExp = null
        let targetBullet = null

        if (target?.experienceId) {
          targetExp = experiences.find((e) => e.id === target.experienceId)
        }
        if (!targetExp && change.targetContext?.employer) {
          const empNorm = normalizeText(change.targetContext.employer)
          targetExp = experiences.find(
            (e) => normalizeText(e.employer).includes(empNorm) || empNorm.includes(normalizeText(e.employer))
          )
        }

        if (targetExp) {
          if (target?.bulletId) {
            targetBullet = (targetExp.bullets || []).find((b) => b.id === target.bulletId)
          }
          if (!targetBullet && change.oldText) {
            const oldNorm = normalizeText(change.oldText)
            targetBullet = (targetExp.bullets || []).find(
              (b) => normalizeText(b.text) === oldNorm
            )
          }
        } else {
          // If experience was not resolved, search all experiences for matching bullet
          const oldNorm = normalizeText(change.oldText)
          for (const exp of experiences) {
            const foundBullet = (exp.bullets || []).find(
              (b) => normalizeText(b.text) === oldNorm
            )
            if (foundBullet) {
              targetBullet = foundBullet
              break
            }
          }
        }

        if (targetBullet) {
          targetBullet.text = newText
        }
        break
      }

      case SUPPORTED_SECTIONS.SKILLS: {
        const categories = result.skills || []
        let targetCat = null

        if (target?.categoryId) {
          targetCat = categories.find((c) => c.id === target.categoryId)
        }
        if (!targetCat && (target?.categoryName || change.targetContext?.categoryName)) {
          const catNorm = normalizeText(target?.categoryName || change.targetContext.categoryName)
          targetCat = categories.find(
            (c) => normalizeText(c.categoryName).includes(catNorm) || catNorm.includes(normalizeText(c.categoryName))
          )
        }

        const { categoryName: parsedCatName, skills: parsedSkills } = parseSkillReplacement(newText)

        if (targetCat) {
          if (parsedCatName) {
            targetCat.categoryName = parsedCatName
          }
          if (parsedSkills.length > 0) {
            targetCat.skills = parsedSkills
          }
        } else if (categories.length > 0) {
          if (parsedCatName) {
            categories[0].categoryName = parsedCatName
          }
          if (parsedSkills.length > 0) {
            categories[0].skills = parsedSkills
          }
        }
        break
      }

      case SUPPORTED_SECTIONS.EDUCATION: {
        const education = result.education || []
        let targetEdu = null

        if (target?.educationId) {
          targetEdu = education.find((e) => e.id === target.educationId)
        } else if (education.length > 0) {
          targetEdu = education[0]
        }

        if (targetEdu) {
          const field = target?.field || 'degree'
          if (field in targetEdu) {
            targetEdu[field] = newText
          } else {
            targetEdu.degree = newText
          }
        }
        break
      }

      case SUPPORTED_SECTIONS.PERSONAL_INFO: {
        const field = target?.field || 'headline'
        if (result.personalInfo && field in result.personalInfo) {
          result.personalInfo[field] = newText
        }
        break
      }

      case SUPPORTED_SECTIONS.ADDITIONAL_SECTIONS: {
        const sections = result.additionalSections || []
        let targetSec = null

        if (target?.sectionId) {
          targetSec = sections.find((s) => s.id === target.sectionId)
        } else if (sections.length > 0) {
          targetSec = sections[0]
        }

        if (targetSec) {
          let targetItem = null
          if (target?.itemId) {
            targetItem = (targetSec.items || []).find((i) => i.id === target.itemId)
          } else if ((targetSec.items || []).length > 0) {
            targetItem = targetSec.items[0]
          }

          if (targetItem) {
            targetItem.text = newText
          }
        }
        break
      }

      default:
        break
    }
  }

  return result
}
