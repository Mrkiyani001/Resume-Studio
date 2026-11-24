import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedSave } from '../hooks/useDebouncedSave.js'

describe('useDebouncedSave Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes in idle state without saving on initial render', () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useDebouncedSave({ data: { text: 'initial' }, onSave, delay: 500 })
    )

    expect(result.current.saveState).toBe('idle')
    expect(result.current.isSaving).toBe(false)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('debounces multiple rapid edits and transitions saving -> saved only after commit', async () => {
    let resolveSavePromise
    const onSave = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveSavePromise = resolve
      })
    })

    let currentData = { text: 'v1' }
    const { result, rerender } = renderHook(
      ({ data }) => useDebouncedSave({ data, onSave, delay: 400 }),
      { initialProps: { data: currentData } }
    )

    // Edit 1
    currentData = { text: 'v2' }
    rerender({ data: currentData })
    expect(result.current.saveState).toBe('saving')
    expect(onSave).not.toHaveBeenCalled()

    // Rapid Edit 2 (before 400ms passes)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    currentData = { text: 'v3' }
    rerender({ data: currentData })
    expect(onSave).not.toHaveBeenCalled()

    // Advance remaining time for Edit 2
    act(() => {
      vi.advanceTimersByTime(400)
    })

    // onSave was called with latest data 'v3'
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({ text: 'v3' })

    // STRICT SPEC RULE: Still 'saving' while Dexie transaction promise is in-flight
    expect(result.current.saveState).toBe('saving')

    // Resolve Dexie commit
    await act(async () => {
      resolveSavePromise(true)
    })

    // Now state transitions to 'saved'
    expect(result.current.saveState).toBe('saved')
    expect(result.current.lastSavedAt).toBeInstanceOf(Date)
  })

  it('handles save errors cleanly by transitioning to error state', async () => {
    let rejectSavePromise
    const onSave = vi.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        rejectSavePromise = reject
      })
    })

    let currentData = { text: 'initial' }
    const { result, rerender } = renderHook(
      ({ data }) => useDebouncedSave({ data, onSave, delay: 300 }),
      { initialProps: { data: currentData } }
    )

    currentData = { text: 'new text' }
    rerender({ data: currentData })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.saveState).toBe('saving')

    const testError = new Error('IndexedDB QuotaExceededError')
    await act(async () => {
      rejectSavePromise(testError)
    })

    expect(result.current.saveState).toBe('error')
    expect(result.current.error).toBe(testError)
  })

  it('flushes pending changes immediately on demand', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    let currentData = { text: 'start' }

    const { result, rerender } = renderHook(
      ({ data }) => useDebouncedSave({ data, onSave, delay: 500 }),
      { initialProps: { data: currentData } }
    )

    currentData = { text: 'unflushed edit' }
    rerender({ data: currentData })

    expect(onSave).not.toHaveBeenCalled()

    // Trigger flush immediately before timer expires
    await act(async () => {
      await result.current.flush()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({ text: 'unflushed edit' })
    expect(result.current.saveState).toBe('saved')
  })
})
