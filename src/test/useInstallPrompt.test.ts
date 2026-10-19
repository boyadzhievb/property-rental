import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useInstallPrompt } from '../hooks/useInstallPrompt'

const DISMISSED_KEY = 'pwa-install-dismissed'

function createBeforeInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  const promptMock = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(event, 'prompt', { value: promptMock })
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome }),
  })
  return { event, promptMock }
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('initially reports canInstall as false when no event has fired', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)
  })

  it('sets canInstall to true after beforeinstallprompt event fires', () => {
    const { result } = renderHook(() => useInstallPrompt())

    const { event } = createBeforeInstallPromptEvent()
    act(() => {
      window.dispatchEvent(event)
    })

    expect(result.current.canInstall).toBe(true)
  })

  it('calls preventDefault on the beforeinstallprompt event', () => {
    renderHook(() => useInstallPrompt())

    const { event } = createBeforeInstallPromptEvent()
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('returns canInstall false when dismissed flag is set in localStorage', () => {
    localStorage.setItem(DISMISSED_KEY, '1')

    const { result } = renderHook(() => useInstallPrompt())

    const { event } = createBeforeInstallPromptEvent()
    act(() => {
      window.dispatchEvent(event)
    })

    expect(result.current.canInstall).toBe(false)
  })

  it('dismiss sets localStorage flag and hides the prompt', () => {
    const { result } = renderHook(() => useInstallPrompt())

    const { event } = createBeforeInstallPromptEvent()
    act(() => {
      window.dispatchEvent(event)
    })
    expect(result.current.canInstall).toBe(true)

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.canInstall).toBe(false)
    expect(localStorage.getItem(DISMISSED_KEY)).toBe('1')
  })

  it('install calls prompt() and clears deferred prompt on acceptance', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    const { event, promptMock } = createBeforeInstallPromptEvent('accepted')
    act(() => {
      window.dispatchEvent(event)
    })
    expect(result.current.canInstall).toBe(true)

    await act(async () => {
      await result.current.install()
    })

    expect(promptMock).toHaveBeenCalled()
    expect(result.current.canInstall).toBe(false)
  })

  it('install calls prompt() but keeps deferred prompt on dismissal', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    const { event, promptMock } = createBeforeInstallPromptEvent('dismissed')
    act(() => {
      window.dispatchEvent(event)
    })
    expect(result.current.canInstall).toBe(true)

    await act(async () => {
      await result.current.install()
    })

    expect(promptMock).toHaveBeenCalled()
    // User dismissed the native prompt, so canInstall remains true
    expect(result.current.canInstall).toBe(true)
  })

  it('install does nothing when no deferred prompt exists', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    await act(async () => {
      await result.current.install()
    })

    // No error thrown, canInstall remains false
    expect(result.current.canInstall).toBe(false)
  })

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useInstallPrompt())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    )
    removeEventListenerSpy.mockRestore()
  })
})
