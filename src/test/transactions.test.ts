import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

const room = { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 120, maxGuests: 2 } as const

describe('atomicReadWrite', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('rolls back earlier writes when the callback throws', async () => {
    const { api, atomicReadWrite } = await import('../api/client')

    await expect(atomicReadWrite(['rooms', 'guests'], async (stores) => {
      stores.rooms.put(room)
      await stores.guests.get('guest-1')
      throw new Error('domain rule violated')
    })).rejects.toThrow('domain rule violated')

    expect(await api.rooms.getAll()).toEqual([])
  })

  it('commits writes and returns the callback result', async () => {
    const { api, atomicReadWrite } = await import('../api/client')

    const result = await atomicReadWrite(['rooms'], async (stores) => {
      stores.rooms.put(room)
      return 'done'
    })

    expect(result).toBe('done')
    expect(await api.rooms.getAll()).toEqual([room])
  })

  it('resolves when the callback makes no requests', async () => {
    const { atomicReadWrite } = await import('../api/client')
    await expect(atomicReadWrite(['rooms'], async () => 42)).resolves.toBe(42)
  })
})

describe('waitForTransaction', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('rejects instead of hanging when a transaction is aborted without a request error', async () => {
    const { waitForTransaction } = await import('../api/client')
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('scratch', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('items', { keyPath: 'id' })
      request.onsuccess = () => resolve(request.result)
    })
    const transaction = database.transaction('items', 'readwrite')
    transaction.objectStore('items').put({ id: 'a' })
    const done = waitForTransaction(transaction)
    transaction.abort()

    await expect(done).rejects.toThrow(/abort/i)
  })
})

describe('api update', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it.each(['rooms', 'guests', 'reservations'] as const)('%s.update throws for a missing id and writes nothing', async (store) => {
    const { api } = await import('../api/client')

    await expect(api[store].update('missing', { notes: 'x' } as never)).rejects.toThrow(/not found/)

    expect(await api[store].getAll()).toEqual([])
  })

  it('merges into an existing record', async () => {
    const { api } = await import('../api/client')
    await api.rooms.create({ ...room })

    await api.rooms.update('room-1', { name: 'Renamed' })

    expect(await api.rooms.getById('room-1')).toEqual({ ...room, name: 'Renamed' })
  })
})

describe('repository getById', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  const cases = [
    ['rooms', '../repositories/RoomRepository', 'roomRepository'],
    ['guests', '../repositories/GuestRepository', 'guestRepository'],
    ['reservations', '../repositories/ReservationRepository', 'reservationRepository'],
    ['payments', '../repositories/PaymentRepository', 'paymentRepository'],
    ['tasks', '../repositories/TaskRepository', 'taskRepository'],
  ] as const

  it.each(cases)('%s: returns null for a missing record', async (_store, modulePath, exportName) => {
    const repositoryModule: Record<string, { getById: (id: string) => Promise<unknown> }> = await import(/* @vite-ignore */ modulePath)
    await expect(repositoryModule[exportName].getById('missing')).resolves.toBeNull()
  })

  it.each(cases)('%s: propagates real database errors instead of returning null', async (store, modulePath, exportName) => {
    const { api } = await import('../api/client')
    vi.spyOn(api[store], 'getById').mockRejectedValue(new Error('disk I/O error'))
    const repositoryModule: Record<string, { getById: (id: string) => Promise<unknown> }> = await import(/* @vite-ignore */ modulePath)

    await expect(repositoryModule[exportName].getById('any')).rejects.toThrow('disk I/O error')
  })
})
