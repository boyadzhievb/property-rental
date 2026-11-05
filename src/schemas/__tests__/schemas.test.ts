import { describe, it, expect } from 'vitest'
import { RoomSchema } from '../RoomSchema'
import { GuestSchema } from '../GuestSchema'
import { ReservationSchema } from '../ReservationSchema'
import { PaymentSchema } from '../PaymentSchema'
import { TaskSchema } from '../TaskSchema'
import { RoomStatus } from '../../domain/Room'

describe('RoomSchema', () => {
  const valid = { id: 'r-1', name: 'Suite', status: RoomStatus.AVAILABLE, pricePerNightCents: 10000, maxGuests: 2 }

  it('accepts valid room data', () => {
    expect(() => RoomSchema.parse(valid)).not.toThrow()
  })

  it('rejects empty name', () => {
    expect(() => RoomSchema.parse({ ...valid, name: '' })).toThrow()
  })

  it('rejects non-positive price', () => {
    expect(() => RoomSchema.parse({ ...valid, pricePerNightCents: 0 })).toThrow()
    expect(() => RoomSchema.parse({ ...valid, pricePerNightCents: -1000 })).toThrow()
  })

  it('rejects maxGuests less than 1', () => {
    expect(() => RoomSchema.parse({ ...valid, maxGuests: 0 })).toThrow()
  })

  it('rejects invalid status', () => {
    expect(() => RoomSchema.parse({ ...valid, status: 'InvalidStatus' })).toThrow()
  })
})

describe('GuestSchema', () => {
  const valid = { id: 'g-1', name: 'John', phone: '+123', email: '', previousStays: 0, notes: '' }

  it('accepts valid guest data', () => {
    expect(() => GuestSchema.parse(valid)).not.toThrow()
  })

  it('accepts valid email', () => {
    expect(() => GuestSchema.parse({ ...valid, email: 'john@example.com' })).not.toThrow()
  })

  it('accepts empty email', () => {
    expect(() => GuestSchema.parse({ ...valid, email: '' })).not.toThrow()
  })

  it('rejects invalid email format', () => {
    expect(() => GuestSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects empty name', () => {
    expect(() => GuestSchema.parse({ ...valid, name: '' })).toThrow()
  })

  it('rejects empty phone', () => {
    expect(() => GuestSchema.parse({ ...valid, phone: '' })).toThrow()
  })

  it('rejects negative previousStays', () => {
    expect(() => GuestSchema.parse({ ...valid, previousStays: -1 })).toThrow()
  })
})

describe('ReservationSchema', () => {
  const valid = {
    id: 'r-1', roomId: 'room-1', guestId: 'guest-1',
    arrivalDate: '2026-09-10', departureDate: '2026-09-15',
    guestsCount: 1, status: 'Confirmed', priceCents: 50000,
  }

  it('accepts valid reservation data', () => {
    expect(() => ReservationSchema.parse(valid)).not.toThrow()
  })

  it('accepts optional notes', () => {
    expect(() => ReservationSchema.parse({ ...valid, notes: 'VIP' })).not.toThrow()
  })

  it('rejects departure before arrival', () => {
    expect(() => ReservationSchema.parse({ ...valid, arrivalDate: '2026-09-15', departureDate: '2026-09-10' })).toThrow()
  })

  it('rejects zero guests', () => {
    expect(() => ReservationSchema.parse({ ...valid, guestsCount: 0 })).toThrow()
  })

  it('rejects non-positive price', () => {
    expect(() => ReservationSchema.parse({ ...valid, priceCents: 0 })).toThrow()
  })

  it('rejects invalid status', () => {
    expect(() => ReservationSchema.parse({ ...valid, status: 'Unknown' })).toThrow()
  })

  it('rejects empty roomId', () => {
    expect(() => ReservationSchema.parse({ ...valid, roomId: '' })).toThrow()
  })

  it('rejects empty guestId', () => {
    expect(() => ReservationSchema.parse({ ...valid, guestId: '' })).toThrow()
  })
})

describe('PaymentSchema', () => {
  const valid = { id: 'p-1', reservationId: 'r-1', amountCents: 20000, date: '2026-09-10', method: 'cash', note: '' }

  it('accepts valid payment data', () => {
    expect(() => PaymentSchema.parse(valid)).not.toThrow()
  })

  it('accepts all payment methods', () => {
    expect(() => PaymentSchema.parse({ ...valid, method: 'card' })).not.toThrow()
    expect(() => PaymentSchema.parse({ ...valid, method: 'transfer' })).not.toThrow()
  })

  it('rejects non-positive amount', () => {
    expect(() => PaymentSchema.parse({ ...valid, amountCents: 0 })).toThrow()
    expect(() => PaymentSchema.parse({ ...valid, amountCents: -1000 })).toThrow()
  })

  it('rejects invalid method', () => {
    expect(() => PaymentSchema.parse({ ...valid, method: 'bitcoin' })).toThrow()
  })

  it('rejects empty reservationId', () => {
    expect(() => PaymentSchema.parse({ ...valid, reservationId: '' })).toThrow()
  })
})

describe('TaskSchema', () => {
  const valid = { id: 't-1', title: 'Clean room', category: 'cleaning', completed: false, date: '2026-09-10', auto: false }

  it('accepts valid task data', () => {
    expect(() => TaskSchema.parse(valid)).not.toThrow()
  })

  it('accepts all categories', () => {
    for (const cat of ['cleaning', 'preparation', 'payment', 'communication', 'custom']) {
      expect(() => TaskSchema.parse({ ...valid, category: cat })).not.toThrow()
    }
  })

  it('accepts optional linked fields', () => {
    expect(() => TaskSchema.parse({ ...valid, linkedRoomId: 'r-1', linkedReservationId: 'res-1', linkedGuestId: 'g-1' })).not.toThrow()
  })

  it('rejects empty title', () => {
    expect(() => TaskSchema.parse({ ...valid, title: '' })).toThrow()
  })

  it('rejects invalid category', () => {
    expect(() => TaskSchema.parse({ ...valid, category: 'invalid' })).toThrow()
  })

  it('rejects empty date', () => {
    expect(() => TaskSchema.parse({ ...valid, date: '' })).toThrow()
  })
})

describe('local date fields (yyyy-MM-dd)', () => {
  const reservation = {
    id: 'r-1', roomId: 'room-1', guestId: 'guest-1',
    arrivalDate: '2026-09-10', departureDate: '2026-09-15',
    guestsCount: 1, status: 'Confirmed', priceCents: 50000,
  }
  const payment = { id: 'p-1', reservationId: 'r-1', amountCents: 20000, date: '2026-09-10', method: 'cash', note: '' }
  const task = { id: 't-1', title: 'Clean room', category: 'cleaning', completed: false, date: '2026-09-10', auto: false }

  const badDates = ['2026-9-10', '10/09/2026', '2026-09-10T00:00:00.000Z', '2026-02-30', '2026-13-01', 'tomorrow']

  it.each(badDates)('ReservationSchema rejects arrivalDate %s', (date) => {
    expect(ReservationSchema.safeParse({ ...reservation, arrivalDate: date, departureDate: '2026-12-31' }).success).toBe(false)
  })

  it.each(badDates)('ReservationSchema rejects departureDate %s', (date) => {
    expect(ReservationSchema.safeParse({ ...reservation, arrivalDate: '2026-01-01', departureDate: date }).success).toBe(false)
  })

  it('ReservationSchema rejects a malformed recurrence end date', () => {
    expect(ReservationSchema.safeParse({ ...reservation, recurrence: { pattern: 'weekly', endDate: '2026/12/01' } }).success).toBe(false)
  })

  it.each(badDates)('PaymentSchema rejects date %s', (date) => {
    expect(PaymentSchema.safeParse({ ...payment, date }).success).toBe(false)
  })

  it.each(badDates)('TaskSchema rejects date %s', (date) => {
    expect(TaskSchema.safeParse({ ...task, date }).success).toBe(false)
  })

  it('accepts a leap day', () => {
    expect(PaymentSchema.safeParse({ ...payment, date: '2028-02-29' }).success).toBe(true)
  })
})

describe('PaymentSchema amountCents', () => {
  const payment = { id: 'p-1', reservationId: 'r-1', amountCents: 20000, date: '2026-09-10', method: 'cash', note: '' }

  it.each([1999, 1, 100_000_000])('accepts %s cents', (amountCents) => {
    expect(PaymentSchema.safeParse({ ...payment, amountCents }).success).toBe(true)
  })

  it.each([19.99, 0, -100, 100_000_001, Number.POSITIVE_INFINITY, Number.NaN])('rejects %s', (amountCents) => {
    expect(PaymentSchema.safeParse({ ...payment, amountCents }).success).toBe(false)
  })

  it('rejects a decimal amount without cents', () => {
    const { amountCents: _amountCents, ...withoutCents } = payment
    expect(PaymentSchema.safeParse({ ...withoutCents, amount: 200 }).success).toBe(false)
  })
})
