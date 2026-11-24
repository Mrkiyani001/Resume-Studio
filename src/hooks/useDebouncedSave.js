import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Debounced Auto-Save Hook with Real State Machine.
 *
 * States:
 * - 'idle': Initial state before any edits occur
 * - 'saving': Save operation in-flight (or debounce timer actively pending)
 * - 'saved': Dexie commit succeeded while online
 * - 'offline': Dexie commit succeeded while offline (saved locally)
 * - 'error': Dexie transaction failed
 *
 * Strict Rule: Never show "Saved" before the IndexedDB commit resolves.
 *
 * @param {Object} options
 * @param {any} options.data Current resume/application data
 * @param {Function} options.onSave Async save handler: (latestData) => Promise<any>
 * @param {number} [options.delay=600] Debounce delay in milliseconds
 * @param {boolean} [options.enabled=true] Whether auto-saving is active
 * @returns {{ saveState: string, isSaving: boolean, lastSavedAt: Date|null, error: Error|null, flush: Function }}
 */
export function useDebouncedSave({ data, onSave, delay = 600, enabled = true }) {
  const [saveState, setSaveState] = useState('idle')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [error, setError] = useState(null)

  const latestDataRef = useRef(data)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    latestDataRef.current = data
    onSaveRef.current = onSave
  }, [data, onSave])

  const timerRef = useRef(null)
  const isMountedRef = useRef(true)
  const isInitialMountRef = useRef(true)
  const hasPendingChangesRef = useRef(false)

  // Track online / offline status
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
    }
    function handleOffline() {
      setIsOffline(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // Core execution of the save operation
  const executeSave = useCallback(async (dataToSave) => {
    if (!onSaveRef.current) return
    try {
      if (isMountedRef.current) {
        setSaveState('saving')
        setError(null)
      }

      await onSaveRef.current(dataToSave)
      hasPendingChangesRef.current = false

      if (isMountedRef.current) {
        const offlineNow = typeof navigator !== 'undefined' ? !navigator.onLine : false
        setSaveState(offlineNow ? 'offline' : 'saved')
        setLastSavedAt(new Date())
      }
    } catch (err) {
      hasPendingChangesRef.current = true
      if (isMountedRef.current) {
        setError(err)
        setSaveState('error')
      }
    }
  }, [])

  // Debounced trigger whenever data changes
  useEffect(() => {
    if (!enabled) return

    // Skip auto-save on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }

    hasPendingChangesRef.current = true
    setSaveState('saving')

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      executeSave(latestDataRef.current)
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [data, delay, enabled, executeSave])

  // Flush pending changes immediately
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (hasPendingChangesRef.current) {
      await executeSave(latestDataRef.current)
    }
  }, [executeSave])

  // Safe flush on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (hasPendingChangesRef.current && onSaveRef.current) {
        // Fire final save without blocking unmount
        onSaveRef.current(latestDataRef.current).catch(() => {})
      }
    }
  }, [])

  return {
    saveState,
    isSaving: saveState === 'saving',
    isOffline,
    lastSavedAt,
    error,
    flush,
  }
}
