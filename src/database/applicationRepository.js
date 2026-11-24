/**
 * Resume Studio — Application Repository
 * Manages independent application lifecycle, search/filters, snapshots, and batch rollback.
 */

import { db } from './db.js'
import {
  createApplicationFromVariant,
  createRevisionSnapshot,
  rollbackToLastRevision,
} from '../models/applicationSchema.js'
import { generateId, cloneResumeData, normalizeResumeData } from '../models/resumeSchema.js'

/**
 * Creates and persists an independent application from a master variant.
 * @param {Object} variant - Master variant record
 * @param {Object} params - { companyName: string, jobTitle?: string }
 * @returns {Promise<Object>}
 */
export async function createApplication(variant, { companyName, jobTitle }) {
  const application = createApplicationFromVariant(variant, { companyName, jobTitle })
  await db.applications.add(application)
  return application
}

/**
 * Retrieves an application by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getApplicationById(id) {
  if (!id) return null
  const app = await db.applications.get(id)
  return app || null
}

/**
 * Retrieves all applications, sorted by most recently updated.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllApplications() {
  return db.applications.orderBy('updatedAt').reverse().toArray()
}

/**
 * Searches and filters applications with multi-criteria support.
 * @param {Object} options
 * @param {string} [options.query] - Matches companyName, jobTitle, or variantName
 * @param {string} [options.variantId] - Filter by specific variant ID
 * @param {string} [options.sortBy='updatedAt'] - Field to sort by
 * @param {'asc'|'desc'} [options.order='desc']
 * @returns {Promise<Array<Object>>}
 */
export async function searchApplications({ query = '', variantId = '', sortBy = 'updatedAt', order = 'desc' } = {}) {
  let results = await getAllApplications()

  if (variantId) {
    results = results.filter((app) => app.variantId === variantId)
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase()
    results = results.filter((app) =>
      (app.companyName || '').toLowerCase().includes(q) ||
      (app.jobTitle || '').toLowerCase().includes(q) ||
      (app.variantName || '').toLowerCase().includes(q)
    )
  }

  results.sort((a, b) => {
    let valA = a[sortBy] || ''
    let valB = b[sortBy] || ''
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()

    if (valA < valB) return order === 'asc' ? -1 : 1
    if (valA > valB) return order === 'asc' ? 1 : -1
    return 0
  })

  return results
}

/**
 * Updates an application with optional revision snapshotting.
 * @param {string} id
 * @param {Object} updates
 * @param {Object} [options={}]
 * @param {boolean} [options.createSnapshot=false]
 * @param {string} [options.snapshotReason]
 * @returns {Promise<Object>}
 */
export async function updateApplication(id, updates, { createSnapshot = false, snapshotReason = 'Manual edit' } = {}) {
  const existing = await getApplicationById(id)
  if (!existing) throw new Error(`Application not found with ID: ${id}`)

  let base = existing
  if (createSnapshot) {
    base = createRevisionSnapshot(existing, snapshotReason)
  }

  const now = new Date().toISOString()
  const payload = {
    ...base,
    ...updates,
    updatedAt: now,
  }

  if (updates.resumeData) {
    payload.resumeData = normalizeResumeData(updates.resumeData)
  }
  if (updates.companyName && typeof updates.companyName === 'string') {
    payload.companyName = updates.companyName.trim()
  }
  if (updates.jobTitle && typeof updates.jobTitle === 'string') {
    payload.jobTitle = updates.jobTitle.trim()
  }

  await db.applications.put(payload)
  return payload
}

/**
 * Duplicates an existing application into an independent record.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function duplicateApplication(id) {
  const original = await getApplicationById(id)
  if (!original) throw new Error(`Application not found with ID: ${id}`)

  const now = new Date().toISOString()
  const clonedResume = cloneResumeData(original.resumeData, true)

  const duplicate = {
    ...original,
    id: generateId(),
    companyName: `${original.companyName} (Copy)`,
    resumeData: clonedResume,
    revisions: [
      {
        revisionNumber: 1,
        timestamp: now,
        reason: `Duplicated from ${original.companyName}`,
        snapshot: cloneResumeData(clonedResume),
      },
    ],
    revision: 1,
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
    exportCount: 0,
  }

  await db.applications.add(duplicate)
  return duplicate
}

/**
 * Deletes an application.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteApplication(id) {
  if (!id) return
  await db.applications.delete(id)
}

/**
 * Rolls back an application to its previous revision snapshot (Undo Last Batch).
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function rollbackApplicationBatch(id) {
  const app = await getApplicationById(id)
  if (!app) throw new Error(`Application not found with ID: ${id}`)

  const restored = rollbackToLastRevision(app)
  await db.applications.put(restored)
  return restored
}
