import { describe, it, expect } from 'vitest'
import { RoomSchema } from '../RoomSchema'
import { GuestSchema } from '../GuestSchema'
import { ReservationSchema } from '../ReservationSchema'
import { PaymentSchema } from '../PaymentSchema'
import { TaskSchema } from '../TaskSchema'
import { RoomStatus } from '../../domain/Room'

describe('RoomSchema', () => {
  const valid = { id: 'r-1', name: 'Suite', status: RoomStatus.AVAILABLE, pricePerNight: 100, maxGuests: 2 }

  it('accepts valid room data', () => {
    expect(() => RoomSchema.parse(valid)).not.toThrow()
  })

  it('rejects empty name', () => {
    expect(() => RoomSchema.parse({ ...valid, name: '' })).toThrow()
  })

  it('rejects non-positive price', () => {
    expect(() => RoomSchema.parse({ ...valid, pricePerNight: 0 })).toThrow()
    expect(() => RoomSchema.parse({ ...valid, pricePerNight: -10 })).toThrow()
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
    guestsCount: 1, status: 'Confirmed', price: 500,
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
    expect(() => ReservationSchema.parse({ ...valid, price: 0 })).toThrow()
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
  const valid = { id: 'p-1', reservationId: 'r-1', amount: 200, date: '2026-09-10', method: 'cash', note: '' }

  it('accepts valid payment data', () => {
    expect(() => PaymentSchema.parse(valid)).not.toThrow()
  })

  it('accepts all payment methods', () => {
    expect(() => PaymentSchema.parse({ ...valid, method: 'card' })).not.toThrow()
    expect(() => PaymentSchema.parse({ ...valid, method: 'transfer' })).not.toThrow()
  })

  it('rejects non-positive amount', () => {
    expect(() => PaymentSchema.parse({ ...valid, amount: 0 })).toThrow()
    expect(() => PaymentSchema.parse({ ...valid, amount: -10 })).toThrow()
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
