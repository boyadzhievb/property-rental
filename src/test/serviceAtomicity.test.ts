import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

const room = { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 100, maxGuests: 2 } as const
const guest = { id: 'guest-1', name: 'Maria Ivanova', phone: '+359888123456', email: 'maria@example.com', previousStays: 0, notes: '' }
const booking = (id: string) => ({
  id, roomId: 'room-1', guestId: 'guest-1', arrivalDate: '2026-12-01', departureDate: '2026-12-05', guestsCount: 1, status: 'Confirmed' as const, price: 400,
})

async function setup() {
  const { api } = await import('../api/client')
  await api.rooms.create({ ...room })
  await api.guests.create({ ...guest })
  const { reservationService } = await import('../services/ReservationService')
  const { taskService } = await import('../services/TaskService')
  return { api, reservationService, taskService }
}

describe('service writes are atomic under concurrency', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('two simultaneous bookings for the same room and dates cannot both succeed', async () => {
    const { api, reservationService } = await setup()

    const results = await Promise.allSettled([
      reservationService.createReservation(booking('res-a')),
      reservationService.createReservation(booking('res-b')),
    ])

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(await api.reservations.getAll()).toHaveLength(1)
  })

  it('simultaneous check-in and cancel never leave a cancelled reservation in an occupied room', async () => {
    const { api, reservationService } = await setup()
    await api.reservations.create(booking('res-1'))

    await Promise.allSettled([reservationService.checkIn('res-1'), reservationService.cancel('res-1')])

    const reservation = await api.reservations.getById('res-1')
    const storedRoom = await api.rooms.getById('room-1')
    expect(reservation?.status === 'Cancelled' && storedRoom?.status === 'Occupied').toBe(false)
  })

  it('toggling a cleaning task twice at once ends where it started', async () => {
    const { api, taskService } = await setup()
    await api.rooms.update('room-1', { status: 'Cleaning' })
    await api.tasks.put({ id: 'task-1', title: 'Clean', category: 'cleaning', completed: false, date: '2026-12-01', linkedRoomId: 'room-1', auto: false })

    await Promise.allSettled([taskService.toggleTask('task-1'), taskService.toggleTask('task-1')])

    expect((await api.tasks.getById('task-1'))?.completed).toBe(false)
  })

  it('deleteReservation removes the reservation, its payments and linked tasks together', async () => {
    const { api, reservationService } = await setup()
    await api.reservations.create(booking('res-1'))
    await api.payments.create({ id: 'pay-1', reservationId: 'res-1', amount: 100, date: '2026-12-01', method: 'cash', note: '' })
    await api.tasks.put({ id: 'task-1', title: 'Prepare', category: 'preparation', completed: false, date: '2026-12-01', linkedReservationId: 'res-1', auto: true })
    await api.tasks.put({ id: 'task-2', title: 'Other', category: 'custom', completed: false, date: '2026-12-01', auto: false })

    await reservationService.deleteReservation('res-1')

    expect(await api.reservations.getAll()).toEqual([])
    expect(await api.payments.getAll()).toEqual([])
    expect((await api.tasks.getAll()).map(task => task.id)).toEqual(['task-2'])
  })
})
