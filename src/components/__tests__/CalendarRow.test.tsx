import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { makeRoom, makeReservation } from '../../test/factories'

vi.mock('../../context/LocaleContext', async () => {
  const germanTranslations = (await import('../../i18n/de')).default
  return { useLocale: () => ({ locale: 'de' as const, setLocale: vi.fn(), t: germanTranslations }) }
})

import CalendarRow from '../calendar/CalendarRow'
import german from '../../i18n/de'

describe('CalendarRow accessibility label', () => {
  it('uses the current language for the fallback name and the status', () => {
    const weekStart = new Date(2026, 10, 2)
    const days = Array.from({ length: 7 }, (_, index) => new Date(2026, 10, 2 + index))
    const reservation = makeReservation({ id: 'res-1', roomId: 'room-1', guestId: 'guest-missing', arrivalDate: '2026-11-03', departureDate: '2026-11-05', status: 'Checked In' })

    render(<CalendarRow room={makeRoom({ id: 'room-1' })} reservations={[reservation]} guests={[]} weekStart={weekStart} days={days} />)

    const bar = screen.getByRole('button')
    expect(bar.getAttribute('aria-label')).toContain(german.reservation)
    expect(bar.getAttribute('aria-label')).toContain(german.checkedIn)
    expect(bar.getAttribute('aria-label')).not.toMatch(/Reservation|Checked In| to /)
  })
})
