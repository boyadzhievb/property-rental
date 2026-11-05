import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import type { StoreName } from '../api/client'

const room = { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 100, maxGuests: 2 } as const
const guest = { id: 'guest-1', name: 'Maria Ivanova', phone: '+359888123456', email: '', previousStays: 0, notes: '' }
const booking = { id: 'res-1', roomId: 'room-1', guestId: 'guest-1', arrivalDate: '2026-12-01', departureDate: '2026-12-05', guestsCount: 1, status: 'Confirmed' as const, price: 400 }

/** Load a fresh data layer and record every change announcement made in this tab. */
async function setup() {
  const client = await import('../api/client')
  const announcements: StoreName[][] = []
  const stop = client.onDataChange((changed) => announcements.push([...changed].sort()))
  return { client, announcements, stop }
}

describe('data change announcements', () => {
  const channels: BroadcastChannel[] = []

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  afterEach(() => {
    for (const channel of channels.splice(0)) channel.close()
  })

  /** Plays the part of another tab of the app. */
  function otherTab() {
    const channel = new BroadcastChannel('property-rental-sync')
    channels.push(channel)
    return channel
  }

  it('announces the store of a single write after it commits', async () => {
    const { client, announcements } = await setup()

    await client.api.rooms.create({ ...room })
    await client.api.rooms.delete(room.id)

    expect(announcements).toEqual([['rooms'], ['rooms']])
  })

  it('announces only the stores an atomic write actually wrote to', async () => {
    const { client, announcements } = await setup()

    await client.atomicReadWrite(['rooms', 'guests'], async (stores) => {
      await stores.guests.get('guest-1')
      stores.rooms.put({ ...room })
    })
    await client.atomicReadWrite(['rooms'], async (stores) => stores.rooms.get(room.id))

    expect(announcements).toEqual([['rooms']])
  })

  it('announces nothing when the transaction fails', async () => {
    const { client, announcements } = await setup()

    await expect(client.atomicReadWrite(['rooms'], async (stores) => {
      stores.rooms.put({ ...room })
      throw new Error('domain rule violated')
    })).rejects.toThrow('domain rule violated')
    // An update of a missing record fails inside its transaction too.
    await expect(client.api.rooms.update('missing', { name: 'X' })).rejects.toThrow()

    expect(announcements).toEqual([])
  })

  it('announces bulk operations once, after they finish', async () => {
    const { client, announcements } = await setup()

    await client.seedDemoData()
    await client.resetData()
    await client.configureProperty('Villa', [{ ...room }], 'EUR')
    await client.importBackup({ rooms: [{ ...room }], guests: [guest] })

    expect(announcements).toEqual([
      ['guests', 'payments', 'reservations', 'rooms', 'settings'],
      ['guests', 'payments', 'reservations', 'rooms', 'settings', 'tasks'],
      ['rooms', 'settings'],
      ['guests', 'payments', 'reservations', 'rooms', 'settings', 'tasks'],
    ])
  })

  it('check-in announces reservations and rooms, nothing else', async () => {
    const { client, announcements } = await setup()
    await client.api.rooms.create({ ...room })
    await client.api.guests.create({ ...guest })
    const { reservationService } = await import('../services/ReservationService')
    await reservationService.createReservation({ ...booking })
    announcements.length = 0

    await reservationService.checkIn(booking.id)
    await reservationService.checkOut(booking.id)

    expect(announcements).toEqual([['reservations', 'rooms'], ['reservations', 'rooms']])
  })

  it('tells other tabs which stores changed', async () => {
    const { client } = await setup()
    const received = new Promise<unknown>((resolve) => { otherTab().onmessage = (event) => resolve(event.data) })

    await client.api.guests.create({ ...guest })

    expect(await received).toEqual({ stores: ['guests'] })
  })

  it('passes on changes announced by another tab', async () => {
    const { announcements } = await setup()

    otherTab().postMessage({ stores: ['payments'] })

    await vi.waitFor(() => expect(announcements).toEqual([['payments']]))
  })

  it('treats an unreadable message from another tab as a change to every store', async () => {
    const { announcements } = await setup()

    otherTab().postMessage('refresh')

    await vi.waitFor(() => expect(announcements).toEqual([['guests', 'payments', 'reservations', 'rooms', 'settings', 'tasks']]))
  })

  it('keeps notifying other listeners when one of them throws', async () => {
    const { client, announcements } = await setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    client.onDataChange(() => { throw new Error('listener bug') })

    await client.api.rooms.create({ ...room })

    expect(announcements).toEqual([['rooms']])
  })

  it('stops calling a listener after it unsubscribes', async () => {
    const { client, announcements, stop } = await setup()
    stop()

    await client.api.rooms.create({ ...room })

    expect(announcements).toEqual([])
  })
})

describe('dataChangeService', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('calls a subscriber only for the stores it asked for', async () => {
    const { api } = await import('../api/client')
    const { dataChangeService } = await import('../services/DataChangeService')
    const roomListener = vi.fn()
    const guestListener = vi.fn()
    dataChangeService.subscribe(['rooms'], roomListener)
    dataChangeService.subscribe(['guests'], guestListener)

    await api.rooms.create({ ...room })

    expect(roomListener).toHaveBeenCalledTimes(1)
    expect(guestListener).not.toHaveBeenCalled()
  })
})
