/**
 * Resume Studio — Variant Repository
 * Encapsulates master resume variant CRUD, independent duplication, and idempotent seeding.
 */

import { db } from './db.js'
import { generateId, normalizeResumeData, cloneResumeData } from '../models/resumeSchema.js'
import { INITIAL_VARIANTS } from './seeds/initialVariants.js'

/**
 * Retrieves all master resume variants.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllVariants() {
  return db.variants.orderBy('createdAt').toArray()
}

/**
 * Retrieves a single master variant by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getVariantById(id) {
  if (!id) return null
  const variant = await db.variants.get(id)
  return variant || null
}

/**
 * Creates a new master resume variant.
 * @param {Object} param0
 * @param {string} param0.name
 * @param {Object} [param0.resumeData]
 * @returns {Promise<Object>}
 */
export async function createVariant({ name, resumeData }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Variant name is required.')
  }

  const now = new Date().toISOString()
  const normalizedResume = normalizeResumeData(resumeData)

  const newVariant = {
    id: generateId(),
    name: name.trim(),
    resumeData: normalizedResume,
    createdAt: now,
    updatedAt: now,
  }

  await db.variants.add(newVariant)
  return newVariant
}

/**
 * Updates an existing master variant.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateVariant(id, updates) {
  if (!id) throw new Error('Variant ID required for update.')

  const existing = await getVariantById(id)
  if (!existing) throw new Error(`Variant not found with ID: ${id}`)

  const now = new Date().toISOString()
  const payload = {
    ...updates,
    updatedAt: now,
  }

  if (updates.resumeData) {
    payload.resumeData = normalizeResumeData(updates.resumeData)
  }
  if (updates.name && typeof updates.name === 'string') {
    payload.name = updates.name.trim()
  }

  await db.variants.update(id, payload)
  return { ...existing, ...payload }
}

/**
 * Renames a master variant.
 * @param {string} id
 * @param {string} newName
 * @returns {Promise<Object>}
 */
export async function renameVariant(id, newName) {
  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    throw new Error('New variant name is required.')
  }
  return updateVariant(id, { name: newName.trim() })
}

/**
 * Creates an independent duplicate of an existing master variant.
 * Zero references are shared between the duplicate and the original.
 * @param {string} id
 * @param {string} [customName]
 * @returns {Promise<Object>}
 */
export async function duplicateVariant(id, customName) {
  const original = await getVariantById(id)
  if (!original) throw new Error(`Source variant not found with ID: ${id}`)

  const name = customName || `${original.name} (Copy)`
  const now = new Date().toISOString()
  const clonedResume = cloneResumeData(original.resumeData, true)

  const duplicate = {
    id: generateId(),
    name,
    resumeData: clonedResume,
    createdAt: now,
    updatedAt: now,
  }

  await db.variants.add(duplicate)
  return duplicate
}

/**
 * Deletes a master variant by ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteVariant(id) {
  if (!id) return
  await db.variants.delete(id)
}

/**
 * Seeds the initial 4 master variants if the variants store is empty.
 * Strictly idempotent: does nothing if records already exist.
 * @returns {Promise<Array<Object>>}
 */
export async function seedInitialVariantsIfEmpty() {
  const count = await db.variants.count()
  if (count > 0) {
    return getAllVariants()
  }

  // Deep-clone seed items so they have fresh IDs
  const seedItems = INITIAL_VARIANTS.map((v) => ({
    ...v,
    resumeData: cloneResumeData(v.resumeData, false),
  }))

  await db.variants.bulkAdd(seedItems)
  return seedItems
}
