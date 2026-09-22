import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReservationService } from '../ReservationService'
import { Reservation } from '../../domain/Reservation'
import { Room, RoomStatus } from '../../domain/Room'

vi.mock('../../repositories/ReservationRepository', () => {
  const store = new Map<string, any>()
  return {
    reservationRepository: {
      getAll: vi.fn(async () => {
        const { Reservation } = await import('../../domain/Reservation')
        return [...store.values()].map(d => new Reservation(d))
      }),
      getById: vi.fn(async (id: string) => {
        const d = store.get(id)
        if (!d) return null
        const { Reservation } = await import('../../domain/Reservation')
        return new Reservation(d)
      }),
      save: vi.fn(async (r: any) => {
        const data = r.toData()
        store.set(data.id, data)
        const { Reservation } = await import('../../domain/Reservation')
        return new Reservation(data)
      }),
      getByMonth: vi.fn(async () => []),
      _store: store,
    },
  }
})

vi.mock('../../repositories/RoomRepository', () => {
  const store = new Map<string, any>()
  return {
    roomRepository: {
      getAll: vi.fn(async () => {
        const { Room } = await import('../../domain/Room')
        return [...store.values()].map(d => new Room(d))
      }),
      getById: vi.fn(async (id: string) => {
        const d = store.get(id)
        if (!d) return null
        const { Room } = await import('../../domain/Room')
        return new Room(d)
      }),
      save: vi.fn(async (r: any) => {
        const data = r.toData()
        store.set(data.id, data)
        const { Room } = await import('../../domain/Room')
        return new Room(data)
      }),
      _store: store,
    },
  }
})

vi.mock('../../repositories/GuestRepository', () => {
  const store = new Map<string, any>()
  return {
    guestRepository: {
      getById: vi.fn(async (id: string) => {
        const d = store.get(id)
        if (!d) return null
        const { Guest } = await import('../../domain/Guest')
        return new Guest(d)
      }),
      _store: store,
    },
  }
})

import { reservationRepository } from '../../repositories/ReservationRepository'
import { roomRepository } from '../../repositories/RoomRepository'
import { guestRepository } from '../../repositories/GuestRepository'

const resStore = (reservationRepository as any)._store as Map<string, any>
const roomStore = (roomRepository as any)._store as Map<string, any>
const guestStore = (guestRepository as any)._store as Map<string, any>

vi.mock('../../api/client', () => ({
  batchPut: vi.fn(async (operations: Array<{ store: string; data: any }>) => {
    for (const operation of operations) {
      if (operation.store === 'reservations') resStore.set(operation.data.id, operation.data)
      if (operation.store === 'rooms') roomStore.set(operation.data.id, operation.data)
    }
  }),
}))

function seedRoom(overrides: Partial<any> = {}) {
  const data = { id: 'room-1', name: 'Suite 1', status: RoomStatus.AVAILABLE, pricePerNight: 100, maxGuests: 2, ...overrides }
  roomStore.set(data.id, data)
  return data
}

function seedGuest(overrides: Partial<any> = {}) {
  const data = { id: 'guest-1', name: 'John Smith', phone: '+1 555-0100', email: 'john@test.com', previousStays: 0, notes: '', ...overrides }
  guestStore.set(data.id, data)
  return data
}

function seedReservation(overrides: Partial<any> = {}) {
  const data = {
    id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
    arrivalDate: '2026-09-10', departureDate: '2026-09-15',
    guestsCount: 1, status: 'Confirmed', price: 500, ...overrides,
  }
  resStore.set(data.id, data)
  return data
}

describe('ReservationService', () => {
  let service: ReservationService

  beforeEach(() => {
    resStore.clear()
    roomStore.clear()
    guestStore.clear()
    service = new ReservationService()
  })

  describe('createReservation', () => {
    it('creates a valid reservation', async () => {
      seedRoom()
      seedGuest()
      const result = await service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 1, status: 'Confirmed', price: 500,
      })
      expect(result.id).toBe('res-1')
      expect(result.status).toBe('Confirmed')
    })

    it('rejects when room does not exist', async () => {
      seedGuest()
      await expect(service.createReservation({
        id: 'res-1', roomId: 'no-room', guestId: 'guest-1',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 1, status: 'Confirmed', price: 500,
      })).rejects.toThrow('Room not found')
    })

    it('rejects when guest does not exist', async () => {
      seedRoom()
      await expect(service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'no-guest',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 1, status: 'Confirmed', price: 500,
      })).rejects.toThrow('Guest not found')
    })

    it('rejects when guest count exceeds room capacity', async () => {
      seedRoom({ maxGuests: 2 })
      seedGuest()
      await expect(service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 5, status: 'Confirmed', price: 500,
      })).rejects.toThrow('exceeds room capacity')
    })

    it('rejects overlapping active reservations', async () => {
      seedRoom()
      seedGuest()
      seedGuest({ id: 'guest-2', name: 'Jane Doe' })
      seedReservation()
      await expect(service.createReservation({
        id: 'res-2', roomId: 'room-1', guestId: 'guest-2',
        arrivalDate: '2026-09-12', departureDate: '2026-09-18',
        guestsCount: 1, status: 'Confirmed', price: 600,
      })).rejects.toThrow('already booked')
    })

    it('allows booking after cancelled reservation dates', async () => {
      seedRoom()
      seedGuest()
      seedGuest({ id: 'guest-2', name: 'Jane Doe' })
      seedReservation({ status: 'Cancelled' })
      const result = await service.createReservation({
        id: 'res-2', roomId: 'room-1', guestId: 'guest-2',
        arrivalDate: '2026-09-12', departureDate: '2026-09-18',
        guestsCount: 1, status: 'Confirmed', price: 600,
      })
      expect(result.id).toBe('res-2')
    })

    it('rejects invalid data via schema', async () => {
      seedRoom()
      seedGuest()
      await expect(service.createReservation({
        id: '', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 1, status: 'Confirmed', price: 500,
      })).rejects.toThrow()
    })

    it('rejects when departure is before arrival', async () => {
      seedRoom()
      seedGuest()
      await expect(service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-09-15', departureDate: '2026-09-10',
        guestsCount: 1, status: 'Confirmed', price: 500,
      })).rejects.toThrow()
    })
  })

  describe('checkIn', () => {
    it('sets reservation to Checked In and room to Occupied', async () => {
      seedRoom()
      seedReservation()
      const result = await service.checkIn('res-1')
      expect(result!.status).toBe('Checked In')
      const roomData = roomStore.get('room-1')
      expect(roomData.status).toBe(RoomStatus.OCCUPIED)
    })

    it('returns null for non-existent reservation', async () => {
      const result = await service.checkIn('no-such-id')
      expect(result).toBeNull()
    })
  })

  describe('checkOut', () => {
    it('sets reservation to Checked Out and room to Cleaning', async () => {
      seedRoom({ status: RoomStatus.OCCUPIED })
      seedReservation({ status: 'Checked In' })
      const result = await service.checkOut('res-1')
      expect(result!.status).toBe('Checked Out')
      const roomData = roomStore.get('room-1')
      expect(roomData.status).toBe(RoomStatus.CLEANING)
    })

    it('returns null for non-existent reservation', async () => {
      const result = await service.checkOut('no-such-id')
      expect(result).toBeNull()
    })
  })

  describe('cancel', () => {
    it('cancels a confirmed reservation without changing room', async () => {
      seedRoom()
      seedReservation()
      const result = await service.cancel('res-1')
      expect(result!.status).toBe('Cancelled')
      const roomData = roomStore.get('room-1')
      expect(roomData.status).toBe(RoomStatus.AVAILABLE)
    })

    it('cancels a checked-in reservation and sets room to Cleaning', async () => {
      seedRoom({ status: RoomStatus.OCCUPIED })
      seedReservation({ status: 'Checked In' })
      const result = await service.cancel('res-1')
      expect(result!.status).toBe('Cancelled')
      const roomData = roomStore.get('room-1')
      expect(roomData.status).toBe(RoomStatus.CLEANING)
    })

    it('returns null for non-existent reservation', async () => {
      const result = await service.cancel('no-such-id')
      expect(result).toBeNull()
    })
  })

  describe('createReservation with recurrence', () => {
    it('creates multiple reservations for a weekly series', async () => {
      seedRoom()
      seedGuest()
      const result = await service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-10-01', departureDate: '2026-10-03',
        guestsCount: 1, status: 'Confirmed', price: 200,
        recurrence: { pattern: 'weekly', endDate: '2026-10-22' },
      })
      expect(result.id).toBe('res-1')
      expect(resStore.size).toBe(3)
    })

    it('all series reservations share the same seriesId', async () => {
      seedRoom()
      seedGuest()
      await service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-10-01', departureDate: '2026-10-03',
        guestsCount: 1, status: 'Confirmed', price: 200,
        recurrence: { pattern: 'weekly', endDate: '2026-10-22' },
      })
      const seriesIds = [...resStore.values()].map(r => r.seriesId)
      expect(new Set(seriesIds).size).toBe(1)
      expect(seriesIds[0]).toBeTruthy()
    })

    it('rejects recurring series if any occurrence conflicts', async () => {
      seedRoom()
      seedGuest()
      seedReservation({ id: 'existing', arrivalDate: '2026-10-08', departureDate: '2026-10-10' })
      await expect(service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-10-01', departureDate: '2026-10-03',
        guestsCount: 1, status: 'Confirmed', price: 200,
        recurrence: { pattern: 'weekly', endDate: '2026-10-22' },
      })).rejects.toThrow('conflicts')
    })

    it('rejects recurring series if guest count exceeds capacity', async () => {
      seedRoom({ maxGuests: 2 })
      seedGuest()
      await expect(service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-10-01', departureDate: '2026-10-03',
        guestsCount: 5, status: 'Confirmed', price: 200,
        recurrence: { pattern: 'weekly', endDate: '2026-10-22' },
      })).rejects.toThrow('exceeds room capacity')
    })
  })

  describe('cancelSeries', () => {
    it('cancels all active reservations in a series', async () => {
      seedRoom()
      seedGuest()
      await service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-10-01', departureDate: '2026-10-03',
        guestsCount: 1, status: 'Confirmed', price: 200,
        recurrence: { pattern: 'weekly', endDate: '2026-10-22' },
      })

      const seriesId = resStore.values().next().value.seriesId
      const cancelled = await service.cancelSeries(seriesId)
      expect(cancelled.length).toBe(3)
      for (const reservation of cancelled) {
        expect(reservation.status).toBe('Cancelled')
      }
    })

    it('skips already terminal reservations', async () => {
      seedRoom()
      seedGuest()
      await service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-10-01', departureDate: '2026-10-03',
        guestsCount: 1, status: 'Confirmed', price: 200,
        recurrence: { pattern: 'weekly', endDate: '2026-10-15' },
      })

      const seriesId = resStore.values().next().value.seriesId
      await service.cancel('res-1')
      const cancelled = await service.cancelSeries(seriesId)
      expect(cancelled.length).toBe(1)
    })
  })
})
