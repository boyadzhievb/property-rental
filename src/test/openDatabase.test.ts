import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

describe('database connection lifecycle', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(navigator, 'storage')

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  afterEach(() => {
    if (originalStorage) Object.defineProperty(navigator, 'storage', originalStorage)
    else Reflect.deleteProperty(navigator, 'storage')
  })

  it('requests persistent storage when the database is first opened', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true })
    const { api } = await import('../api/client')

    await api.rooms.getAll()
    await api.guests.getAll()

    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('still works when the storage API is unavailable', async () => {
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true })
    const { api } = await import('../api/client')

    await expect(api.rooms.getAll()).resolves.toEqual([])
  })

  it('closes its connection so a newer app version in another tab can upgrade', async () => {
    const { api } = await import('../api/client')
    await api.rooms.getAll()

    const outcome = await new Promise<string>((resolve) => {
      const request = indexedDB.open('property-rental', 99)
      request.onsuccess = () => { request.result.close(); resolve('upgraded') }
      request.onblocked = () => resolve('blocked')
      request.onerror = () => resolve('error')
    })

    expect(outcome).toBe('upgraded')
  })
})
