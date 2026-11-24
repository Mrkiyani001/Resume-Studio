/**
 * Centralized Date Formatting Utilities
 * Reusable across variants, applications, and archives.
 */

/**
 * Formats an ISO date string into a user-friendly format e.g. "Nov 24, 2026".
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return 'Never'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Formats an ISO date string with time e.g. "Nov 24, 2026, 3:30 PM".
 * @param {string} dateString
 * @returns {string}
 */
export function formatDateTime(dateString) {
  if (!dateString) return 'Never'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

/**
 * Returns a humanized relative time string (e.g., "Just now", "5m ago", "2h ago", "3d ago").
 * @param {string} dateString
 * @returns {string}
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return ''
    const diffMs = Date.now() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  } catch {
    return formatDate(dateString)
  }
}
