import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useOnlineStatus } from '../hooks/useOnlineStatus'

describe('useOnlineStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Default to online
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns online true when navigator.onLine is true', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.online).toBe(true)
    expect(result.current.showReconnected).toBe(false)
  })

  it('returns online false when navigator.onLine is false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.online).toBe(false)
    expect(result.current.showReconnected).toBe(false)
  })

  it('transitions to offline when offline event fires', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.online).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.online).toBe(false)
    expect(result.current.showReconnected).toBe(false)
  })

  it('transitions to online and shows reconnected when online event fires', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current.online).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.online).toBe(true)
    expect(result.current.showReconnected).toBe(true)
  })

  it('clears showReconnected after 3000ms timeout', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.showReconnected).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.showReconnected).toBe(false)
  })

  it('does not clear showReconnected before 3000ms', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.showReconnected).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(result.current.showReconnected).toBe(true)
  })

  it('going offline clears showReconnected immediately', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())

    // Go online first
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.showReconnected).toBe(true)

    // Go offline before the 3s timeout
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.online).toBe(false)
    expect(result.current.showReconnected).toBe(false)
  })

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useOnlineStatus())

    unmount()

    const removedEvents = removeEventListenerSpy.mock.calls.map(call => call[0])
    expect(removedEvents).toContain('online')
    expect(removedEvents).toContain('offline')
    removeEventListenerSpy.mockRestore()
  })

  it('clears timeout on unmount to prevent memory leaks', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { result, unmount } = renderHook(() => useOnlineStatus())

    // Trigger reconnection to start the timeout
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.showReconnected).toBe(true)

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('handles multiple online/offline transitions correctly', () => {
    const { result } = renderHook(() => useOnlineStatus())

    // Go offline
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.online).toBe(false)

    // Go online
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.online).toBe(true)
    expect(result.current.showReconnected).toBe(true)

    // Go offline again before timeout
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.online).toBe(false)
    expect(result.current.showReconnected).toBe(false)

    // Go online again
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.online).toBe(true)
    expect(result.current.showReconnected).toBe(true)

    // Let timeout expire
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.showReconnected).toBe(false)
  })
})
