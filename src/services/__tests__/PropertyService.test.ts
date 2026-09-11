import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PropertyService } from '../PropertyService'
import { RoomStatus } from '../../domain/Room'

vi.mock('../../repositories/RoomRepository', () => {
  const store = new Map<string, any>()
  return {
    roomRepository: {
      getAll: vi.fn(async () => {
        const { Room } = await import('../../domain/Room')
        return [...store.values()].map(d => new Room(d))
      }),
      _store: store,
    },
  }
})

vi.mock('../../repositories/ReservationRepository', () => {
  const store = new Map<string, any>()
  return {
    reservationRepository: {
      getAll: vi.fn(async () => {
        const { Reservation } = await import('../../domain/Reservation')
        return [...store.values()].map(d => new Reservation(d))
      }),
      _store: store,
    },
  }
})

import { roomRepository } from '../../repositories/RoomRepository'
import { reservationRepository } from '../../repositories/ReservationRepository'

const roomStore = (roomRepository as any)._store as Map<string, any>
const resStore = (reservationRepository as any)._store as Map<string, any>

function seedRoom(id: string, status = RoomStatus.AVAILABLE) {
  roomStore.set(id, { id, name: `Room ${id}`, status, pricePerNight: 100, maxGuests: 2 })
}

function seedReservation(id: string, roomId: string, arrival: string, departure: string, status = 'Confirmed') {
  resStore.set(id, {
    id, roomId, guestId: 'g-1', arrivalDate: arrival, departureDate: departure,
    guestsCount: 1, status, price: 500,
  })
}

describe('PropertyService', () => {
  let service: PropertyService

  beforeEach(() => {
    roomStore.clear()
    resStore.clear()
    service = new PropertyService()
  })

  describe('getProperty', () => {
    it('returns a Property with rooms and reservations', async () => {
      seedRoom('r-1')
      seedRoom('r-2', RoomStatus.OCCUPIED)
      const property = await service.getProperty()
      expect(property.totalRooms()).toBe(2)
      expect(property.occupiedRooms()).toBe(1)
      expect(property.availableRooms()).toBe(1)
    })

    it('computes occupancy rate', async () => {
      seedRoom('r-1', RoomStatus.OCCUPIED)
      seedRoom('r-2')
      const property = await service.getProperty()
      expect(property.occupancy()).toBe(0.5)
    })

    it('returns 0 occupancy with no rooms', async () => {
      const property = await service.getProperty()
      expect(property.occupancy()).toBe(0)
    })
  })

  describe('findAvailableRooms', () => {
    it('returns rooms without conflicting active reservations', async () => {
      seedRoom('r-1')
      seedRoom('r-2')
      seedReservation('res-1', 'r-1', '2026-09-10', '2026-09-15')
      const rooms = await service.findAvailableRooms('2026-09-12', '2026-09-14')
      expect(rooms).toHaveLength(1)
      expect(rooms[0].id).toBe('r-2')
    })

    it('includes rooms with only cancelled reservations in the range', async () => {
      seedRoom('r-1')
      seedReservation('res-1', 'r-1', '2026-09-10', '2026-09-15', 'Cancelled')
      const rooms = await service.findAvailableRooms('2026-09-12', '2026-09-14')
      expect(rooms).toHaveLength(1)
    })

    it('excludes rooms not in Available status', async () => {
      seedRoom('r-1', RoomStatus.OCCUPIED)
      const rooms = await service.findAvailableRooms('2026-10-01', '2026-10-05')
      expect(rooms).toHaveLength(0)
    })
  })
})
