import { describe, it, expect } from 'vitest'
import { errorMessage } from '../errorMessage'
import { DomainError, DOMAIN_ERROR_CODES } from '../../domain/errors'
import { Room, RoomStatus } from '../../domain/Room'
import { Reservation } from '../../domain/Reservation'
import german from '../de'
import english from '../en'
import { LOCALE_LABELS, type Locale } from '..'

const money = (amount: number) => `€${amount}`

describe('errorMessage', () => {
  it('translates a domain error and fills in its parameters', () => {
    const error = new DomainError('bookingConflict', { from: '2026-12-01', to: '2026-12-05' })
    expect(errorMessage(error, german, money)).toBe(german.errorBookingConflict.replace('{from}', '2026-12-01').replace('{to}', '2026-12-05'))
  })

  it('formats money parameters with the given formatter', () => {
    expect(errorMessage(new DomainError('paymentExceedsBalance', { remaining: 150 }), english, money)).toBe('The payment is more than the remaining balance of €150.')
  })

  it('keeps a readable English message for logs', () => {
    const error = new DomainError('capacityExceeded', { guests: 5, max: 2 })
    expect(error.message).toBe('Guest count (5) exceeds room capacity (2)')
    expect(error).toBeInstanceOf(Error)
  })

  it('falls back to the generic message for unknown errors', () => {
    expect(errorMessage(new Error('IndexedDB exploded'), german, money)).toBe(german.actionFailed)
    expect(errorMessage('nope', german, money)).toBe(german.actionFailed)
  })

  it('domain transitions throw coded errors', () => {
    const room = new Room({ id: 'r', name: 'R', status: RoomStatus.AVAILABLE, pricePerNightCents: 100, maxGuests: 1 })
    expect(() => room.vacate()).toThrow(expect.objectContaining({ code: 'roomNotInCleaning' }))
    const reservation = new Reservation({ id: 'x', roomId: 'r', guestId: 'g', arrivalDate: '2026-12-01', departureDate: '2026-12-02', guestsCount: 1, status: 'Cancelled', priceCents: 100 })
    expect(() => reservation.checkIn()).toThrow(expect.objectContaining({ code: 'reservationNotConfirmed' }))
  })

  it.each(Object.keys(LOCALE_LABELS) as Locale[])('every error code has a %s translation', async (locale) => {
    const translations = (await import(`../${locale}.ts`)).default as Record<string, string>
    for (const code of DOMAIN_ERROR_CODES) {
      const key = `error${code[0].toUpperCase()}${code.slice(1)}`
      expect(translations[key], `${locale}.${key}`).toBeTruthy()
    }
  })
})
