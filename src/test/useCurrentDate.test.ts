import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCurrentDate } from '../hooks/useCurrentDate'

describe('useCurrentDate', () => {
  afterEach(() => vi.useRealTimers())

  it('returns today and stays stable across re-renders', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 4, 15, 30))
    const { result, rerender } = renderHook(() => useCurrentDate())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
    expect(result.current.getDate()).toBe(4)
  })

  it('rolls over to the next day at midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 4, 23, 59, 30))
    const { result } = renderHook(() => useCurrentDate())

    act(() => { vi.advanceTimersByTime(31_000) })

    expect(result.current.getDate()).toBe(5)
  })

  it('keeps rolling over on following days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 4, 23, 0))
    const { result } = renderHook(() => useCurrentDate())

    act(() => { vi.advanceTimersByTime(61 * 60 * 1000) })
    expect(result.current.getDate()).toBe(5)

    act(() => { vi.advanceTimersByTime(24 * 60 * 60 * 1000) })
    expect(result.current.getDate()).toBe(6)
  })
})
