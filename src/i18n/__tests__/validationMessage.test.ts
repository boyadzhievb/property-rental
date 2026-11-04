import { describe, it, expect } from 'vitest'
import { validationMessage, VALIDATION_MESSAGE_KEYS } from '../validationMessage'
import { GuestSchema } from '../../schemas/GuestSchema'
import { ReservationSchema } from '../../schemas/ReservationSchema'
import german from '../de'
import english from '../en'
import { LOCALE_LABELS, type Locale } from '..'

function issuesOf(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : result.error!.issues.map(issue => issue.message)
}

describe('validationMessage', () => {
  it('translates every message the booking form can produce', () => {
    const messages = [
      ...issuesOf(GuestSchema.safeParse({ id: 'x', name: '', phone: '', email: 'not-an-email', previousStays: 0, notes: '' })),
      ...issuesOf(ReservationSchema.safeParse({ id: 'x', roomId: '', guestId: 'g', arrivalDate: '', departureDate: '', guestsCount: 0, status: 'Confirmed', price: 0 })),
      ...issuesOf(ReservationSchema.safeParse({ id: 'x', roomId: 'r', guestId: 'g', arrivalDate: '2026-12-05', departureDate: '2026-12-01', guestsCount: 1, status: 'Confirmed', price: 10 })),
      ...issuesOf(ReservationSchema.safeParse({ id: 'x', roomId: 'r', guestId: 'g', arrivalDate: '2026-02-30', departureDate: '2026-12-01', guestsCount: 1, status: 'Confirmed', price: 10 })),
    ]
    expect(messages.length).toBeGreaterThan(5)
    for (const message of messages) {
      expect(validationMessage(message, german), message).not.toBe(german.validationInvalid)
    }
  })

  it('translates into the given language', () => {
    expect(validationMessage('Guest name is required', english)).toBe('Guest name is required')
    expect(validationMessage('Guest name is required', german)).toBe(german.validationGuestNameRequired)
  })

  it('falls back to a generic hint for unknown messages', () => {
    expect(validationMessage('Something new', german)).toBe(german.validationInvalid)
  })

  it.each(Object.keys(LOCALE_LABELS) as Locale[])('every validation key exists in %s', async (locale) => {
    const translations = (await import(`../${locale}.ts`)).default as Record<string, string>
    for (const key of [...Object.values(VALIDATION_MESSAGE_KEYS), 'validationInvalid']) {
      expect(translations[key], `${locale}.${key}`).toBeTruthy()
    }
  })
})
