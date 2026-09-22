import { describe, it, expect } from 'vitest'
import { Property } from '../Property'
import { Room, RoomStatus } from '../Room'
import { Reservation } from '../Reservation'

function makeRoom(id: string, status = RoomStatus.AVAILABLE) {
  return new Room({ id, name: `Room ${id}`, status, pricePerNight: 100, maxGuests: 2 })
}

function makeReservation(id: string, roomId: string, arrival: string, departure: string, status: import('../Reservation').ReservationStatus = 'Confirmed') {
  return new Reservation({
    id, roomId, guestId: 'g-1', arrivalDate: arrival, departureDate: departure,
    guestsCount: 1, status, price: 500,
  })
}

describe('Property', () => {
  it('totalRooms returns the count of all rooms', () => {
    const property = new Property([makeRoom('1'), makeRoom('2'), makeRoom('3')], [])
    expect(property.totalRooms()).toBe(3)
  })

  it('occupiedRooms returns count of rooms with Occupied status', () => {
    const property = new Property([
      makeRoom('1', RoomStatus.OCCUPIED),
      makeRoom('2', RoomStatus.AVAILABLE),
      makeRoom('3', RoomStatus.OCCUPIED),
    ], [])
    expect(property.occupiedRooms()).toBe(2)
  })

  it('availableRooms returns count of Available rooms', () => {
    const property = new Property([
      makeRoom('1', RoomStatus.AVAILABLE),
      makeRoom('2', RoomStatus.CLEANING),
      makeRoom('3', RoomStatus.MAINTENANCE),
    ], [])
    expect(property.availableRooms()).toBe(1)
  })

  describe('occupancy', () => {
    it('calculates occupied / total ratio', () => {
      const property = new Property([
        makeRoom('1', RoomStatus.OCCUPIED),
        makeRoom('2', RoomStatus.AVAILABLE),
      ], [])
      expect(property.occupancy()).toBe(0.5)
    })

    it('returns 0 when no rooms exist', () => {
      const property = new Property([], [])
      expect(property.occupancy()).toBe(0)
    })
  })

  describe('findAvailableRooms', () => {
    it('excludes rooms with active overlapping reservations', () => {
      const rooms = [makeRoom('1'), makeRoom('2')]
      const reservations = [makeReservation('r1', '1', '2026-09-10', '2026-09-15')]
      const property = new Property(rooms, reservations)
      const available = property.findAvailableRooms('2026-09-12', '2026-09-14')
      expect(available).toHaveLength(1)
      expect(available[0].id).toBe('2')
    })

    it('includes rooms with cancelled reservations in the range', () => {
      const rooms = [makeRoom('1')]
      const reservations = [makeReservation('r1', '1', '2026-09-10', '2026-09-15', 'Cancelled')]
      const property = new Property(rooms, reservations)
      const available = property.findAvailableRooms('2026-09-12', '2026-09-14')
      expect(available).toHaveLength(1)
    })

    it('excludes rooms not in Available status', () => {
      const rooms = [makeRoom('1', RoomStatus.OCCUPIED)]
      const property = new Property(rooms, [])
      const available = property.findAvailableRooms('2026-10-01', '2026-10-05')
      expect(available).toHaveLength(0)
    })

    it('includes rooms with non-overlapping reservations', () => {
      const rooms = [makeRoom('1')]
      const reservations = [makeReservation('r1', '1', '2026-09-01', '2026-09-05')]
      const property = new Property(rooms, reservations)
      const available = property.findAvailableRooms('2026-09-10', '2026-09-15')
      expect(available).toHaveLength(1)
    })

    it('returns empty when all rooms are booked', () => {
      const rooms = [makeRoom('1'), makeRoom('2')]
      const reservations = [
        makeReservation('r1', '1', '2026-09-10', '2026-09-20'),
        makeReservation('r2', '2', '2026-09-10', '2026-09-20'),
      ]
      const property = new Property(rooms, reservations)
      const available = property.findAvailableRooms('2026-09-12', '2026-09-14')
      expect(available).toHaveLength(0)
    })
  })
})
