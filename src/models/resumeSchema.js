/**
 * Resume Studio — Central Data Schema, Factories & Normalizers
 * Single source of truth for resume data structure.
 */

/**
 * Universal ID generator.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Unified Link Model shared across LinkedIn, Portfolio, and Custom Links.
 * @param {Object} [partial={}]
 * @returns {{ id: string, url: string, displayText: string, isVisible: boolean }}
 */
export function createLink(partial = {}) {
  return {
    id: partial.id || generateId(),
    url: typeof partial.url === 'string' ? partial.url : '',
    displayText: typeof partial.displayText === 'string' ? partial.displayText : '',
    isVisible: typeof partial.isVisible === 'boolean' ? partial.isVisible : true,
  }
}

/**
 * Individual work experience bullet point.
 * @param {string} [text='']
 * @param {string} [id]
 * @returns {{ id: string, text: string }}
 */
export function createEmptyBullet(text = '', id) {
  return {
    id: id || generateId(),
    text: typeof text === 'string' ? text : '',
  }
}

/**
 * Work experience entry with individual bullet inputs.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
export function createEmptyWorkExperience(partial = {}) {
  return {
    id: partial.id || generateId(),
    employer: partial.employer || '',
    jobTitle: partial.jobTitle || '',
    startDate: partial.startDate || '',
    endDate: partial.endDate || '',
    location: partial.location || '',
    bullets: Array.isArray(partial.bullets)
      ? partial.bullets.map((b) => (typeof b === 'string' ? createEmptyBullet(b) : createEmptyBullet(b?.text, b?.id)))
      : [createEmptyBullet()],
  }
}

/**
 * Categorized skills section.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
export function createEmptySkillCategory(partial = {}) {
  return {
    id: partial.id || generateId(),
    categoryName: partial.categoryName || '',
    skills: Array.isArray(partial.skills)
      ? partial.skills.map((s) => (typeof s === 'string' ? { id: generateId(), name: s } : { id: s?.id || generateId(), name: s?.name || '' }))
      : [],
  }
}

/**
 * Education entry.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
export function createEmptyEducation(partial = {}) {
  return {
    id: partial.id || generateId(),
    institution: partial.institution || '',
    degree: partial.degree || '',
    startDate: partial.startDate || '',
    endDate: partial.endDate || '',
    description: partial.description || '',
  }
}

/**
 * Dynamic custom section.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
export function createEmptyCustomSection(partial = {}) {
  return {
    id: partial.id || generateId(),
    title: partial.title || 'Additional Section',
    isVisible: typeof partial.isVisible === 'boolean' ? partial.isVisible : true,
    items: Array.isArray(partial.items)
      ? partial.items.map((item) => ({
          id: item.id || generateId(),
          title: item.title || '',
          subtitle: item.subtitle || '',
          date: item.date || '',
          text: item.text || '',
        }))
      : [],
  }
}

/**
 * Creates an empty, fully initialized resume structure.
 * @returns {Object}
 */
export function createEmptyResume() {
  return {
    personalInfo: {
      fullName: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      linkedin: createLink({ displayText: 'LinkedIn', url: '' }),
      portfolio: createLink({ displayText: 'Portfolio', url: '' }),
      customLinks: [],
    },
    summary: '',
    workExperiences: [createEmptyWorkExperience()],
    skills: [createEmptySkillCategory()],
    education: [createEmptyEducation()],
    additionalSections: [],
  }
}

/**
 * Performs a deep copy of resume data guaranteeing zero reference sharing.
 * @param {Object} resumeData
 * @param {boolean} [regenerateIds=false] If true, generates brand new IDs for all sub-items
 * @returns {Object}
 */
export function cloneResumeData(resumeData, regenerateIds = false) {
  if (!resumeData) return createEmptyResume()
  const rawCopy = JSON.parse(JSON.stringify(resumeData))
  if (!regenerateIds) return normalizeResumeData(rawCopy)

  return {
    ...rawCopy,
    personalInfo: {
      ...rawCopy.personalInfo,
      linkedin: { ...rawCopy.personalInfo.linkedin, id: generateId() },
      portfolio: { ...rawCopy.personalInfo.portfolio, id: generateId() },
      customLinks: (rawCopy.personalInfo.customLinks || []).map((l) => ({ ...l, id: generateId() })),
    },
    workExperiences: (rawCopy.workExperiences || []).map((w) => ({
      ...w,
      id: generateId(),
      bullets: (w.bullets || []).map((b) => ({ ...b, id: generateId() })),
    })),
    skills: (rawCopy.skills || []).map((s) => ({
      ...s,
      id: generateId(),
      skills: (s.skills || []).map((item) => ({ ...item, id: generateId() })),
    })),
    education: (rawCopy.education || []).map((e) => ({ ...e, id: generateId() })),
    additionalSections: (rawCopy.additionalSections || []).map((sec) => ({
      ...sec,
      id: generateId(),
      items: (sec.items || []).map((item) => ({ ...item, id: generateId() })),
    })),
  }
}

/**
 * Universal normalizer: ensures any raw or partial data conform strictly to the resume schema.
 * Handles string bullets, missing link visibility, missing categories, etc.
 * @param {Object} [raw={}]
 * @returns {Object}
 */
export function normalizeResumeData(raw = {}) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const rawInfo = data.personalInfo || {}

  const linkedin = createLink({
    id: rawInfo.linkedin?.id,
    url: rawInfo.linkedin?.url || (typeof rawInfo.linkedin === 'string' ? rawInfo.linkedin : ''),
    displayText: rawInfo.linkedin?.displayText || 'LinkedIn',
    isVisible: typeof rawInfo.linkedin?.isVisible === 'boolean' ? rawInfo.linkedin.isVisible : true,
  })

  const portfolio = createLink({
    id: rawInfo.portfolio?.id,
    url: rawInfo.portfolio?.url || (typeof rawInfo.portfolio === 'string' ? rawInfo.portfolio : ''),
    displayText: rawInfo.portfolio?.displayText || 'Portfolio',
    isVisible: typeof rawInfo.portfolio?.isVisible === 'boolean' ? rawInfo.portfolio.isVisible : true,
  })

  const customLinks = Array.isArray(rawInfo.customLinks)
    ? rawInfo.customLinks.map((l) => createLink(l))
    : []

  const personalInfo = {
    fullName: typeof rawInfo.fullName === 'string' ? rawInfo.fullName : '',
    headline: typeof rawInfo.headline === 'string' ? rawInfo.headline : '',
    email: typeof rawInfo.email === 'string' ? rawInfo.email : '',
    phone: typeof rawInfo.phone === 'string' ? rawInfo.phone : '',
    location: typeof rawInfo.location === 'string' ? rawInfo.location : '',
    linkedin,
    portfolio,
    customLinks,
  }

  const summary = typeof data.summary === 'string' ? data.summary : ''

  const workExperiences = Array.isArray(data.workExperiences)
    ? data.workExperiences.map((w) => createEmptyWorkExperience(w))
    : []

  const skills = Array.isArray(data.skills)
    ? data.skills.map((s) => createEmptySkillCategory(s))
    : []

  const education = Array.isArray(data.education)
    ? data.education.map((e) => createEmptyEducation(e))
    : []

  const additionalSections = Array.isArray(data.additionalSections)
    ? data.additionalSections.map((sec) => createEmptyCustomSection(sec))
    : []

  return {
    personalInfo,
    summary,
    workExperiences,
    skills,
    education,
    additionalSections,
  }
}
