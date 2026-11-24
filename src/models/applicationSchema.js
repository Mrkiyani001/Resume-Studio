/**
 * Resume Studio — Application Schema & Deep-Clone Factory
 * Encapsulates application model rules, metadata separation, and revision snapshotting.
 */

import { generateId, cloneResumeData, normalizeResumeData } from './resumeSchema.js'

/**
 * Creates an independent application copy from a master resume variant.
 * 
 * Strict Specification Rules:
 * 1. Deep-copies the master resume (zero shared references).
 * 2. companyName is strictly internal metadata (never placed in resume content or PDF).
 * 3. jobTitle auto-populates the visible headline beneath the user's name (defaults to variant headline).
 * 4. Master variant and other applications remain completely untouched.
 * 
 * @param {Object} variant - Master variant record { id, name, resumeData }
 * @param {Object} options - { companyName: string, jobTitle?: string }
 * @returns {Object} Application object
 */
export function createApplicationFromVariant(variant, { companyName, jobTitle }) {
  if (!variant || !variant.id) {
    throw new Error('Valid master variant is required to create an application.')
  }
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    throw new Error('Company name is required for internal application archiving.')
  }

  const cleanCompanyName = companyName.trim()
  const sourceResume = variant.resumeData ? cloneResumeData(variant.resumeData) : null
  const normalizedResume = normalizeResumeData(sourceResume)

  // Job title defaults to variant headline if omitted or empty
  const defaultHeadline = normalizedResume.personalInfo.headline || ''
  const targetJobTitle = jobTitle && typeof jobTitle === 'string' && jobTitle.trim()
    ? jobTitle.trim()
    : defaultHeadline

  // Update visible professional headline on the application's resume copy
  normalizedResume.personalInfo.headline = targetJobTitle

  const now = new Date().toISOString()
  const initialSnapshot = cloneResumeData(normalizedResume)

  return {
    id: generateId(),
    variantId: variant.id,
    variantName: variant.name || 'Untitled Variant',
    companyName: cleanCompanyName,
    jobTitle: targetJobTitle,
    resumeData: normalizedResume,
    revisions: [
      {
        revisionNumber: 1,
        timestamp: now,
        reason: 'Initial application creation from variant',
        snapshot: initialSnapshot,
      },
    ],
    revision: 1,
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
    exportCount: 0,
  }
}

/**
 * Creates a pre-mutation revision snapshot for an application.
 * Used before applying bulk changes or major edits to guarantee instant rollback.
 * 
 * @param {Object} application
 * @param {string} reason
 * @returns {Object} Updated application with new snapshot
 */
export function createRevisionSnapshot(application, reason = 'Pre-batch snapshot') {
  if (!application || !application.resumeData) {
    throw new Error('Valid application object required to create revision snapshot.')
  }

  const now = new Date().toISOString()
  const newRevisionNumber = (application.revision || 1) + 1
  const snapshotCopy = cloneResumeData(application.resumeData)

  const revisions = Array.isArray(application.revisions) ? [...application.revisions] : []
  // Keep up to 25 historic revisions to preserve IndexedDB storage efficiency
  if (revisions.length >= 25) {
    revisions.shift()
  }

  revisions.push({
    revisionNumber: newRevisionNumber,
    timestamp: now,
    reason,
    snapshot: snapshotCopy,
  })

  return {
    ...application,
    revision: newRevisionNumber,
    revisions,
    updatedAt: now,
  }
}

/**
 * Rolls back an application to its previous revision snapshot (Undo Last Batch).
 * 
 * @param {Object} application
 * @returns {Object} Application restored to prior state
 */
export function rollbackToLastRevision(application) {
  if (!application || !Array.isArray(application.revisions) || application.revisions.length < 2) {
    throw new Error('No previous revision available to rollback.')
  }

  const revisions = [...application.revisions]
  // Remove current state
  revisions.pop()
  // Retrieve previous snapshot
  const previousRevision = revisions[revisions.length - 1]
  const restoredResumeData = cloneResumeData(previousRevision.snapshot)
  const now = new Date().toISOString()

  return {
    ...application,
    resumeData: restoredResumeData,
    jobTitle: restoredResumeData.personalInfo.headline || application.jobTitle,
    revision: previousRevision.revisionNumber,
    revisions,
    updatedAt: now,
  }
}
