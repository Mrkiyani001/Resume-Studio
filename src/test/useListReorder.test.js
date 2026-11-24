import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListReorder } from '../hooks/useListReorder.js'

describe('useListReorder Hook', () => {
  it('initializes with default items in uncontrolled mode', () => {
    const initial = [
      { id: '1', text: 'Item 1' },
      { id: '2', text: 'Item 2' },
    ]
    const { result } = renderHook(() => useListReorder(initial))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].text).toBe('Item 1')
  })

  it('adds an item and generates an ID if missing', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useListReorder([], onChange))

    act(() => {
      result.current.add({ text: 'New item' })
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    const passed = onChange.mock.calls[0][0]
    expect(passed).toHaveLength(1)
    expect(passed[0].text).toBe('New item')
    expect(passed[0].id).toBeDefined()
  })

  it('updates an item by index', () => {
    const initial = [
      { id: '1', text: 'Old text' },
      { id: '2', text: 'Item 2' },
    ]
    const onChange = vi.fn()
    const { result } = renderHook(() => useListReorder(initial, onChange))

    act(() => {
      result.current.update(0, { text: 'Updated text' })
    })

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', text: 'Updated text' },
      { id: '2', text: 'Item 2' },
    ])
  })

  it('removes an item by index', () => {
    const initial = [
      { id: '1', text: 'Item 1' },
      { id: '2', text: 'Item 2' },
      { id: '3', text: 'Item 3' },
    ]
    const onChange = vi.fn()
    const { result } = renderHook(() => useListReorder(initial, onChange))

    act(() => {
      result.current.remove(1)
    })

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', text: 'Item 1' },
      { id: '3', text: 'Item 3' },
    ])
  })

  it('duplicates an item and regenerates IDs for item and nested bullets', () => {
    const initial = [
      {
        id: 'exp-1',
        jobTitle: 'Designer',
        bullets: [
          { id: 'b-1', text: 'Bullet 1' },
          { id: 'b-2', text: 'Bullet 2' },
        ],
      },
    ]
    const onChange = vi.fn()
    const { result } = renderHook(() => useListReorder(initial, onChange))

    act(() => {
      result.current.duplicate(0)
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    const passed = onChange.mock.calls[0][0]
    expect(passed).toHaveLength(2)
    expect(passed[0].id).toBe('exp-1')
    expect(passed[1].id).not.toBe('exp-1')
    expect(passed[1].jobTitle).toBe('Designer')
    // Nested bullets IDs should also be freshly generated
    expect(passed[1].bullets[0].id).not.toBe('b-1')
    expect(passed[1].bullets[1].id).not.toBe('b-2')
    expect(passed[1].bullets[0].text).toBe('Bullet 1')
  })

  it('reorders items up and down cleanly', () => {
    const initial = [
      { id: '1', text: 'A' },
      { id: '2', text: 'B' },
      { id: '3', text: 'C' },
    ]
    const onChange = vi.fn()
    const { result } = renderHook(() => useListReorder(initial, onChange))

    // Move index 1 (B) up -> [B, A, C]
    act(() => {
      result.current.moveUp(1)
    })
    expect(onChange).toHaveBeenCalledWith([
      { id: '2', text: 'B' },
      { id: '1', text: 'A' },
      { id: '3', text: 'C' },
    ])

    // Move index 0 up -> No-op (boundary)
    onChange.mockClear()
    act(() => {
      result.current.moveUp(0)
    })
    expect(onChange).not.toHaveBeenCalled()

    // Move index 1 down -> [A, C, B]
    act(() => {
      result.current.moveDown(1)
    })
    expect(onChange).toHaveBeenCalledWith([
      { id: '1', text: 'A' },
      { id: '3', text: 'C' },
      { id: '2', text: 'B' },
    ])

    // Move last index down -> No-op (boundary)
    onChange.mockClear()
    act(() => {
      result.current.moveDown(2)
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})
