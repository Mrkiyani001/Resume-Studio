/**
 * Resume Studio — Sanitization Utilities
 * Pure helpers for filename sanitization and collision prevention.
 */

/**
 * Cleans illegal filesystem and ASCII control characters from a string.
 * @param {string} str
 * @returns {string}
 */
function cleanFilesystemString(str) {
  if (!str || typeof str !== 'string') return ''
  const illegal = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])
  return str
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code < 32 || code === 127 || illegal.has(ch)) {
        return ' '
      }
      return ch
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generates a clean, valid filesystem filename strictly matching the specification:
 * [Full Name] - [Job Title].pdf
 *
 * Rules:
 * - Strips invalid filesystem characters: \ / : * ? " < > | and control chars
 * - Trims extra whitespace
 * - NEVER includes companyName
 * - NEVER appends "Resume"
 * - Provides sensible defaults if fullName or jobTitle is blank
 *
 * @param {string} fullName
 * @param {string} jobTitle
 * @returns {string}
 */
export function sanitizeFilename(fullName, jobTitle) {
  const cleanName = cleanFilesystemString(fullName) || 'Candidate'
  const cleanTitle = cleanFilesystemString(jobTitle) || 'Professional'

  return `${cleanName} - ${cleanTitle}.pdf`
}

/**
 * Prevents collisions against existing filenames by appending an incrementing index (1), (2), etc.
 * @param {string} baseFilename e.g. "Fahad Ashfaq - Product Designer.pdf"
 * @param {Array<string>} [existingFilenames=[]]
 * @returns {string}
 */
export function getUniqueFilename(baseFilename, existingFilenames = []) {
  if (!Array.isArray(existingFilenames) || !existingFilenames.includes(baseFilename)) {
    return baseFilename
  }

  const dotIdx = baseFilename.lastIndexOf('.')
  const namePart = dotIdx !== -1 ? baseFilename.substring(0, dotIdx) : baseFilename
  const extPart = dotIdx !== -1 ? baseFilename.substring(dotIdx) : '.pdf'

  let counter = 1
  let candidate = `${namePart} (${counter})${extPart}`
  while (existingFilenames.includes(candidate)) {
    counter++
    candidate = `${namePart} (${counter})${extPart}`
  }

  return candidate
}
