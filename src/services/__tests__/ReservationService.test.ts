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

import { reservationRepository } from '../../repositories/ReservationRepository'
import { roomRepository } from '../../repositories/RoomRepository'

const resStore = (reservationRepository as any)._store as Map<string, any>
const roomStore = (roomRepository as any)._store as Map<string, any>

function seedRoom(overrides: Partial<any> = {}) {
  const data = { id: 'room-1', name: 'Suite 1', status: RoomStatus.AVAILABLE, pricePerNight: 100, maxGuests: 2, ...overrides }
  roomStore.set(data.id, data)
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
    service = new ReservationService()
  })

  describe('createReservation', () => {
    it('creates a valid reservation', async () => {
      seedRoom()
      const result = await service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 1, status: 'Confirmed', price: 500,
      })
      expect(result.id).toBe('res-1')
      expect(result.status).toBe('Confirmed')
    })

    it('rejects when guest count exceeds room capacity', async () => {
      seedRoom({ maxGuests: 2 })
      await expect(service.createReservation({
        id: 'res-1', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 5, status: 'Confirmed', price: 500,
      })).rejects.toThrow('exceeds room capacity')
    })

    it('rejects overlapping active reservations', async () => {
      seedRoom()
      seedReservation()
      await expect(service.createReservation({
        id: 'res-2', roomId: 'room-1', guestId: 'guest-2',
        arrivalDate: '2026-09-12', departureDate: '2026-09-18',
        guestsCount: 1, status: 'Confirmed', price: 600,
      })).rejects.toThrow('already booked')
    })

    it('allows booking after cancelled reservation dates', async () => {
      seedRoom()
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
      await expect(service.createReservation({
        id: '', roomId: 'room-1', guestId: 'guest-1',
        arrivalDate: '2026-09-10', departureDate: '2026-09-15',
        guestsCount: 1, status: 'Confirmed', price: 500,
      })).rejects.toThrow()
    })

    it('rejects when departure is before arrival', async () => {
      seedRoom()
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
})
