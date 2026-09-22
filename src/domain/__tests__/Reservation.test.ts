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
    it('cancel sets Confirmed to Cancelled', () => {
      const r = makeReservation()
      r.cancel()
      expect(r.status).toBe('Cancelled')
    })

    it('cancel sets Checked In to Cancelled', () => {
      const r = makeReservation({ status: 'Checked In' })
      r.cancel()
      expect(r.status).toBe('Cancelled')
    })

    it('cancel throws from Checked Out', () => {
      expect(() => makeReservation({ status: 'Checked Out' }).cancel())
        .toThrow('Cannot cancel a reservation that is Checked Out')
    })

    it('cancel throws from Cancelled', () => {
      expect(() => makeReservation({ status: 'Cancelled' }).cancel())
        .toThrow('Cannot cancel a reservation that is Cancelled')
    })

    it('checkIn sets Confirmed to Checked In', () => {
      const r = makeReservation()
      r.checkIn()
      expect(r.status).toBe('Checked In')
    })

    it('checkIn throws from Checked In', () => {
      expect(() => makeReservation({ status: 'Checked In' }).checkIn())
        .toThrow('Can only check in a Confirmed reservation')
    })

    it('checkIn throws from Checked Out', () => {
      expect(() => makeReservation({ status: 'Checked Out' }).checkIn())
        .toThrow('Can only check in a Confirmed reservation')
    })

    it('checkIn throws from Cancelled', () => {
      expect(() => makeReservation({ status: 'Cancelled' }).checkIn())
        .toThrow('Can only check in a Confirmed reservation')
    })

    it('checkOut sets Checked In to Checked Out', () => {
      const r = makeReservation({ status: 'Checked In' })
      r.checkOut()
      expect(r.status).toBe('Checked Out')
    })

    it('checkOut throws from Confirmed', () => {
      expect(() => makeReservation({ status: 'Confirmed' }).checkOut())
        .toThrow('Can only check out a Checked In reservation')
    })

    it('checkOut throws from Checked Out', () => {
      expect(() => makeReservation({ status: 'Checked Out' }).checkOut())
        .toThrow('Can only check out a Checked In reservation')
    })

    it('checkOut throws from Cancelled', () => {
      expect(() => makeReservation({ status: 'Cancelled' }).checkOut())
        .toThrow('Can only check out a Checked In reservation')
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
      recurrence: undefined,
      seriesId: undefined,
    })
  })

  it('toData includes recurrence and seriesId when set', () => {
    const r = makeReservation({
      recurrence: { pattern: 'weekly', endDate: '2025-07-01' },
      seriesId: 'series-123',
    })
    expect(r.toData().recurrence).toEqual({ pattern: 'weekly', endDate: '2025-07-01' })
    expect(r.toData().seriesId).toBe('series-123')
  })

  describe('generateOccurrences', () => {
    const baseData = {
      id: 'r1',
      roomId: 'room1',
      guestId: 'guest1',
      arrivalDate: '2025-06-01',
      departureDate: '2025-06-03',
      guestsCount: 2,
      status: 'Confirmed' as const,
      price: 200,
    }

    it('generates weekly occurrences', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'weekly',
        endDate: '2025-06-22',
      })
      expect(occurrences).toHaveLength(3)
      expect(occurrences[0].arrivalDate).toBe('2025-06-01')
      expect(occurrences[1].arrivalDate).toBe('2025-06-08')
      expect(occurrences[2].arrivalDate).toBe('2025-06-15')
    })

    it('generates biweekly occurrences', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'biweekly',
        endDate: '2025-07-01',
      })
      expect(occurrences).toHaveLength(3)
      expect(occurrences[0].arrivalDate).toBe('2025-06-01')
      expect(occurrences[1].arrivalDate).toBe('2025-06-15')
      expect(occurrences[2].arrivalDate).toBe('2025-06-29')
    })

    it('generates monthly occurrences', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'monthly',
        endDate: '2025-08-10',
      })
      expect(occurrences).toHaveLength(3)
      expect(occurrences[0].arrivalDate).toBe('2025-06-01')
      expect(occurrences[1].arrivalDate).toBe('2025-07-01')
      expect(occurrences[2].arrivalDate).toBe('2025-08-01')
    })

    it('all occurrences share the same seriesId', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'weekly',
        endDate: '2025-06-22',
      })
      const seriesId = occurrences[0].seriesId
      expect(seriesId).toBeTruthy()
      for (const occurrence of occurrences) {
        expect(occurrence.seriesId).toBe(seriesId)
      }
    })

    it('only the first occurrence has recurrence rule', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'weekly',
        endDate: '2025-06-22',
      })
      expect(occurrences[0].recurrence).toEqual({ pattern: 'weekly', endDate: '2025-06-22' })
      expect(occurrences[1].recurrence).toBeUndefined()
      expect(occurrences[2].recurrence).toBeUndefined()
    })

    it('preserves stay duration across occurrences', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'weekly',
        endDate: '2025-06-22',
      })
      for (const occurrence of occurrences) {
        const reservation = new Reservation(occurrence)
        expect(reservation.duration()).toBe(2)
      }
    })

    it('returns empty array if end date is before first departure', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'weekly',
        endDate: '2025-05-30',
      })
      expect(occurrences).toHaveLength(0)
    })

    it('stops if departure would exceed end date', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'weekly',
        endDate: '2025-06-09',
      })
      expect(occurrences).toHaveLength(1)
    })

    it('includes occurrence when departure equals end date', () => {
      const occurrences = Reservation.generateOccurrences(baseData, {
        pattern: 'weekly',
        endDate: '2025-06-10',
      })
      expect(occurrences).toHaveLength(2)
    })
  })
})
