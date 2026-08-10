import { describe, it, expect } from 'vitest'
import { Reservation } from '../Reservation'

function makeReservation(overrides: Partial<import('../Reservation').ReservationData> = {}) {
  return new Reservation({
    id: 'r1',
    roomId: 'room1',
    guestId: 'guest1',
    arrivalDate: '2025-06-01',
    departureDate: '2025-06-05',
    guestsCount: 2,
    status: 'Confirmed',
    price: 480,
    ...overrides,
  })
}

describe('Reservation', () => {
  it('constructs with given data', () => {
    const r = makeReservation()
    expect(r.id).toBe('r1')
    expect(r.roomId).toBe('room1')
    expect(r.status).toBe('Confirmed')
  })

  describe('status transitions', () => {
    it('cancel sets status to Cancelled', () => {
      const r = makeReservation()
      r.cancel()
      expect(r.status).toBe('Cancelled')
    })

    it('checkIn sets status to Checked In', () => {
      const r = makeReservation()
      r.checkIn()
      expect(r.status).toBe('Checked In')
    })

    it('checkOut sets status to Checked Out', () => {
      const r = makeReservation({ status: 'Checked In' })
      r.checkOut()
      expect(r.status).toBe('Checked Out')
    })
  })

  describe('duration', () => {
    it('calculates number of nights', () => {
      const r = makeReservation({ arrivalDate: '2025-06-01', departureDate: '2025-06-05' })
      expect(r.duration()).toBe(4)
    })

    it('returns 1 for single night stay', () => {
      const r = makeReservation({ arrivalDate: '2025-06-01', departureDate: '2025-06-02' })
      expect(r.duration()).toBe(1)
    })
  })

  describe('isActive', () => {
    it('returns true for Confirmed', () => {
      expect(makeReservation({ status: 'Confirmed' }).isActive()).toBe(true)
    })

    it('returns true for Checked In', () => {
      expect(makeReservation({ status: 'Checked In' }).isActive()).toBe(true)
    })

    it('returns false for Checked Out', () => {
      expect(makeReservation({ status: 'Checked Out' }).isActive()).toBe(false)
    })

    it('returns false for Cancelled', () => {
      expect(makeReservation({ status: 'Cancelled' }).isActive()).toBe(false)
    })
  })

  describe('overlaps', () => {
    it('detects overlapping date ranges', () => {
      const r = makeReservation({ arrivalDate: '2025-06-01', departureDate: '2025-06-05' })
      expect(r.overlaps('2025-06-03', '2025-06-07')).toBe(true)
    })

    it('detects non-overlapping date ranges', () => {
      const r = makeReservation({ arrivalDate: '2025-06-01', departureDate: '2025-06-05' })
      expect(r.overlaps('2025-06-05', '2025-06-08')).toBe(false)
    })

    it('detects overlap with another Reservation', () => {
      const r1 = makeReservation({ arrivalDate: '2025-06-01', departureDate: '2025-06-05' })
      const r2 = makeReservation({ arrivalDate: '2025-06-04', departureDate: '2025-06-08' })
      expect(r1.overlaps(r2)).toBe(true)
    })

    it('adjacent reservations do not overlap', () => {
      const r1 = makeReservation({ arrivalDate: '2025-06-01', departureDate: '2025-06-05' })
      const r2 = makeReservation({ arrivalDate: '2025-06-05', departureDate: '2025-06-08' })
      expect(r1.overlaps(r2)).toBe(false)
    })
  })

  describe('calculateTotal', () => {
    it('multiplies duration by price per night', () => {
      const r = makeReservation({ arrivalDate: '2025-06-01', departureDate: '2025-06-05' })
      expect(r.calculateTotal(100)).toBe(400)
    })
  })

  it('toData returns a plain object', () => {
    const r = makeReservation({ notes: 'Late arrival' })
    expect(r.toData()).toEqual({
      id: 'r1',
      roomId: 'room1',
      guestId: 'guest1',
      arrivalDate: '2025-06-01',
      departureDate: '2025-06-05',
      guestsCount: 2,
      status: 'Confirmed',
      price: 480,
      notes: 'Late arrival',
    })
  })
})
