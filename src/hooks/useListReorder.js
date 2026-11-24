import { useState, useCallback, useMemo } from 'react'
import { generateId } from '../models/resumeSchema.js'

/**
 * Universal deep clone helper that regenerates IDs for an item and any nested child collections.
 * @param {Object} item
 * @returns {Object}
 */
function cloneItemWithNewIds(item) {
  if (!item || typeof item !== 'object') return item

  const cloned = { ...item, id: generateId() }

  // Nested bullet points in work experiences
  if (Array.isArray(cloned.bullets)) {
    cloned.bullets = cloned.bullets.map((b) => ({
      ...b,
      id: generateId(),
    }))
  }

  // Nested skills in skill categories
  if (Array.isArray(cloned.skills)) {
    cloned.skills = cloned.skills.map((s) => ({
      ...s,
      id: generateId(),
    }))
  }

  // Nested items in custom sections
  if (Array.isArray(cloned.items)) {
    cloned.items = cloned.items.map((it) => ({
      ...it,
      id: generateId(),
    }))
  }

  return cloned
}

/**
 * Reusable DRY array reordering and item management hook.
 * Reusable across Work Experiences, Bullet Points, Skill Categories,
 * Individual Skills, Education entries, Custom Sections, and Custom Links.
 *
 * @param {Array} [controlledItems] Optional controlled items array
 * @param {Function} [onChange] Optional callback receiving updated items array: (nextItems) => void
 * @returns {Object} Helper operations and items
 */
export function useListReorder(controlledItems, onChange) {
  const [internalItems, setInternalItems] = useState(
    Array.isArray(controlledItems) ? controlledItems : []
  )

  const isControlled = typeof onChange === 'function'
  const items = useMemo(() => {
    return isControlled ? controlledItems || [] : internalItems
  }, [isControlled, controlledItems, internalItems])

  const commit = useCallback(
    (nextItems) => {
      if (isControlled) {
        onChange(nextItems)
      } else {
        setInternalItems(nextItems)
      }
    },
    [isControlled, onChange]
  )

  const add = useCallback(
    (newItem) => {
      const itemWithId = newItem.id ? newItem : { ...newItem, id: generateId() }
      const next = [...items, itemWithId]
      commit(next)
      return itemWithId
    },
    [items, commit]
  )

  const update = useCallback(
    (index, updates) => {
      if (index < 0 || index >= items.length) return
      const next = items.map((item, i) => {
        if (i !== index) return item
        return typeof updates === 'function' ? updates(item) : { ...item, ...updates }
      })
      commit(next)
    },
    [items, commit]
  )

  const remove = useCallback(
    (index) => {
      if (index < 0 || index >= items.length) return
      const next = items.filter((_, i) => i !== index)
      commit(next)
    },
    [items, commit]
  )

  const duplicate = useCallback(
    (index, customCloneFn) => {
      if (index < 0 || index >= items.length) return
      const source = items[index]
      const duplicateItem = customCloneFn
        ? customCloneFn(source)
        : cloneItemWithNewIds(source)

      const next = [
        ...items.slice(0, index + 1),
        duplicateItem,
        ...items.slice(index + 1),
      ]
      commit(next)
      return duplicateItem
    },
    [items, commit]
  )

  const moveUp = useCallback(
    (index) => {
      if (index <= 0 || index >= items.length) return
      const next = [...items]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      commit(next)
    },
    [items, commit]
  )

  const moveDown = useCallback(
    (index) => {
      if (index < 0 || index >= items.length - 1) return
      const next = [...items]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      commit(next)
    },
    [items, commit]
  )

  return {
    items,
    add,
    update,
    remove,
    duplicate,
    moveUp,
    moveDown,
  }
}
