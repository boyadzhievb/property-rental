import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const isNativePlatform = vi.fn(() => false)
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNativePlatform() } }))

const activateWaitingVersion = vi.fn(async () => {})
const registerSW = vi.fn((_options: { onNeedRefresh?: () => void }) => activateWaitingVersion)
vi.mock('virtual:pwa-register', () => ({ registerSW: (options: { onNeedRefresh?: () => void }) => registerSW(options) }))

const unregister = vi.fn(async () => true)
const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

describe('service worker setup', () => {
  beforeEach(() => {
    vi.resetModules()
    isNativePlatform.mockReturnValue(false)
    registerSW.mockClear()
    unregister.mockClear()
    activateWaitingVersion.mockClear()
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: async () => [{ unregister }, { unregister }] },
      configurable: true,
    })
  })

  afterEach(() => {
    if (originalServiceWorker) Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
    else Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('registers the generated worker on the web', async () => {
    const { setUpServiceWorker } = await import('../pwa')
    await setUpServiceWorker()
    expect(registerSW).toHaveBeenCalledTimes(1)
    expect(unregister).not.toHaveBeenCalled()
  })

  it('does not register in the native app, and removes workers left by older builds', async () => {
    isNativePlatform.mockReturnValue(true)
    const { setUpServiceWorker } = await import('../pwa')
    await setUpServiceWorker()
    expect(registerSW).not.toHaveBeenCalled()
    expect(unregister).toHaveBeenCalledTimes(2)
  })

  it('announces a waiting update, and applying it activates the new version', async () => {
    const { setUpServiceWorker, applyUpdate, UPDATE_AVAILABLE_EVENT } = await import('../pwa')
    const announced = vi.fn()
    window.addEventListener(UPDATE_AVAILABLE_EVENT, announced)
    await setUpServiceWorker()

    registerSW.mock.calls[0][0].onNeedRefresh?.()
    applyUpdate()

    expect(announced).toHaveBeenCalledTimes(1)
    expect(activateWaitingVersion).toHaveBeenCalledWith(true)
    window.removeEventListener(UPDATE_AVAILABLE_EVENT, announced)
  })
})
