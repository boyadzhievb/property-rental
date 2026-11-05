import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

/** Create the database as app versions before cents left it (schema version 5, decimal money). */
function createVersion5Database(records: { rooms: object[]; reservations: object[]; payments: object[] }): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('property-rental', 5)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('rooms', { keyPath: 'id' })
      db.createObjectStore('guests', { keyPath: 'id' })
      const reservations = db.createObjectStore('reservations', { keyPath: 'id' })
      reservations.createIndex('roomId', 'roomId', { unique: false })
      reservations.createIndex('arrivalDate', 'arrivalDate', { unique: false })
      reservations.createIndex('guestId', 'guestId', { unique: false })
      reservations.createIndex('seriesId', 'seriesId', { unique: false })
      db.createObjectStore('payments', { keyPath: 'id' }).createIndex('reservationId', 'reservationId', { unique: false })
      db.createObjectStore('tasks', { keyPath: 'id' }).createIndex('date', 'date', { unique: false })
      db.createObjectStore('settings', { keyPath: 'id' })
      const tx = request.transaction!
      for (const room of records.rooms) tx.objectStore('rooms').put(room)
      for (const reservation of records.reservations) tx.objectStore('reservations').put(reservation)
      for (const payment of records.payments) tx.objectStore('payments').put(payment)
      tx.objectStore('settings').put({ id: 'property', name: 'Villa', isConfigured: true, currency: 'EUR' })
    }
    request.onsuccess = () => { request.result.close(); resolve() }
    request.onerror = () => reject(request.error)
  })
}

describe('database version 6: money as cents', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('converts decimal prices and amounts of existing records to cents', async () => {
    await createVersion5Database({
      rooms: [{ id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 120.5, maxGuests: 2 }],
      reservations: [{ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', arrivalDate: '2026-12-01', departureDate: '2026-12-05', guestsCount: 1, status: 'Confirmed', price: 482 }],
      payments: [
        { id: 'pay-1', reservationId: 'res-1', amount: 33.333, date: '2026-12-01', method: 'cash', note: '' },
        { id: 'pay-2', reservationId: 'res-1', amount: 0.1, date: '2026-12-01', method: 'card', note: '' },
      ],
    })
    const { api } = await import('../api/client')

    expect(await api.rooms.getAll()).toEqual([{ id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNightCents: 12050, maxGuests: 2 }])
    const [reservation] = await api.reservations.getAll()
    expect(reservation.priceCents).toBe(48200)
    expect(reservation).not.toHaveProperty('price')
    const payments = await api.payments.getAll()
    expect(payments.map(p => [p.id, p.amountCents])).toEqual([['pay-1', 3333], ['pay-2', 10]])
    expect(payments[0]).not.toHaveProperty('amount')
  })

  it('keeps the rest of the data, including settings', async () => {
    await createVersion5Database({ rooms: [], reservations: [], payments: [] })
    const { api } = await import('../api/client')

    expect(await api.settings.getProperty()).toMatchObject({ name: 'Villa', isConfigured: true, currency: 'EUR' })
  })
})
