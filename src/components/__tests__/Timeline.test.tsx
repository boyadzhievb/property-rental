import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeRoom, makeGuest, makeReservation } from '../../test/factories'
import { RoomStatus } from '../../domain/Room'

const mockRefreshReservations = vi.fn().mockResolvedValue(undefined)
const mockRefreshRooms = vi.fn().mockResolvedValue(undefined)
const mockCheckIn = vi.fn().mockResolvedValue(undefined)
const mockCheckOut = vi.fn().mockResolvedValue(undefined)

vi.mock('../../context/ReservationContext', () => ({
  useReservationContext: () => ({
    reservations: [],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: mockRefreshReservations,
  }),
}))

vi.mock('../../context/RoomContext', () => ({
  useRoomContext: () => ({
    rooms: [],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: mockRefreshRooms,
  }),
}))

vi.mock('../../services/ReservationService', () => ({
  reservationService: {
    checkIn: (...args: unknown[]) => mockCheckIn(...args),
    checkOut: (...args: unknown[]) => mockCheckOut(...args),
  },
}))

vi.mock('../../context/LocaleContext', async () => {
  const englishTranslations = (await import('../../i18n/en')).default
  return {
    useLocale: () => ({
      locale: 'en' as const,
      setLocale: vi.fn(),
      t: englishTranslations,
    }),
  }
})

import Timeline from '../today/Timeline'

describe('Timeline', () => {
  const testRoom = makeRoom({ id: 'room-1', name: 'Ocean View', status: RoomStatus.AVAILABLE })
  const testGuest = makeGuest({ id: 'guest-1', name: 'Maria Lopez' })

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.confirm to always return true
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders "No events scheduled for today" when events list is empty', () => {
    render(<Timeline events={[]} rooms={[testRoom]} guests={[testGuest]} />)

    expect(screen.getByText('No events scheduled for today.')).toBeInTheDocument()
  })

  it('renders the schedule heading', () => {
    render(<Timeline events={[]} rooms={[testRoom]} guests={[testGuest]} />)

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument()
  })

  describe('arrival events', () => {
    it('renders arrival event with guest name, room name, and type', () => {
      const reservation = makeReservation({
        id: 'res-1',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Confirmed',
      })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
      expect(screen.getByText('Ocean View')).toBeInTheDocument()
      expect(screen.getByText('14:00')).toBeInTheDocument()
      expect(screen.getByText('Arrival')).toBeInTheDocument()
    })

    it('shows Check In button for a confirmed arrival', () => {
      const reservation = makeReservation({
        id: 'res-1',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Confirmed',
      })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByRole('button', { name: /Check In/i })).toBeInTheDocument()
    })

    it('does not show Check In button for a checked-in arrival', () => {
      const reservation = makeReservation({
        id: 'res-1',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Checked In',
      })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.queryByRole('button', { name: /Check In/i })).not.toBeInTheDocument()
    })

    it('does not show Check Out button for a confirmed arrival', () => {
      const reservation = makeReservation({
        id: 'res-1',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Confirmed',
      })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.queryByRole('button', { name: /Check Out/i })).not.toBeInTheDocument()
    })
  })

  describe('departure events', () => {
    it('renders departure event with guest name and room name', () => {
      const reservation = makeReservation({
        id: 'res-2',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Checked In',
      })
      const events = [{ type: 'Departure', reservation, time: '11:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
      expect(screen.getByText('11:00')).toBeInTheDocument()
      expect(screen.getByText('Departure')).toBeInTheDocument()
    })

    it('shows Check Out button for a checked-in departure', () => {
      const reservation = makeReservation({
        id: 'res-2',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Checked In',
      })
      const events = [{ type: 'Departure', reservation, time: '11:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByRole('button', { name: /Check Out/i })).toBeInTheDocument()
    })

    it('does not show Check Out button for a checked-out departure', () => {
      const reservation = makeReservation({
        id: 'res-2',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Checked Out',
      })
      const events = [{ type: 'Departure', reservation, time: '11:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.queryByRole('button', { name: /Check Out/i })).not.toBeInTheDocument()
    })

    it('does not show Check In button for a departure', () => {
      const reservation = makeReservation({
        id: 'res-2',
        roomId: 'room-1',
        guestId: 'guest-1',
        status: 'Checked In',
      })
      const events = [{ type: 'Departure', reservation, time: '11:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.queryByRole('button', { name: /Check In/i })).not.toBeInTheDocument()
    })
  })

  describe('status labels', () => {
    it('displays "Confirmed" status label for a confirmed reservation', () => {
      const reservation = makeReservation({ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', status: 'Confirmed' })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByText('Confirmed')).toBeInTheDocument()
    })

    it('displays "Checked In" status label for a checked-in reservation', () => {
      const reservation = makeReservation({ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', status: 'Checked In' })
      const events = [{ type: 'Departure', reservation, time: '11:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByText('Checked In')).toBeInTheDocument()
    })

    it('displays "Checked Out" status label for a checked-out reservation', () => {
      const reservation = makeReservation({ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', status: 'Checked Out' })
      const events = [{ type: 'Departure', reservation, time: '11:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByText('Checked Out')).toBeInTheDocument()
    })

    it('displays "Cancelled" status label for a cancelled reservation', () => {
      const reservation = makeReservation({ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', status: 'Cancelled' })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  describe('check-in and check-out actions', () => {
    it('calls reservationService.checkIn when Check In button is clicked', async () => {
      const user = userEvent.setup()
      const reservation = makeReservation({ id: 'res-checkin', roomId: 'room-1', guestId: 'guest-1', status: 'Confirmed' })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      await user.click(screen.getByRole('button', { name: /Check In/i }))

      expect(mockCheckIn).toHaveBeenCalledWith('res-checkin')
      expect(mockRefreshReservations).toHaveBeenCalled()
      expect(mockRefreshRooms).toHaveBeenCalled()
    })

    it('calls reservationService.checkOut when Check Out button is clicked', async () => {
      const user = userEvent.setup()
      const reservation = makeReservation({ id: 'res-checkout', roomId: 'room-1', guestId: 'guest-1', status: 'Checked In' })
      const events = [{ type: 'Departure', reservation, time: '11:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      await user.click(screen.getByRole('button', { name: /Check Out/i }))

      expect(mockCheckOut).toHaveBeenCalledWith('res-checkout')
      expect(mockRefreshReservations).toHaveBeenCalled()
      expect(mockRefreshRooms).toHaveBeenCalled()
    })

    it('does not call checkIn when confirm dialog is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const user = userEvent.setup()
      const reservation = makeReservation({ id: 'res-no', roomId: 'room-1', guestId: 'guest-1', status: 'Confirmed' })
      const events = [{ type: 'Arrival', reservation, time: '14:00' }]

      render(<Timeline events={events} rooms={[testRoom]} guests={[testGuest]} />)

      await user.click(screen.getByRole('button', { name: /Check In/i }))

      expect(mockCheckIn).not.toHaveBeenCalled()
    })
  })

  describe('multiple events', () => {
    it('renders multiple events in the timeline', () => {
      const secondGuest = makeGuest({ id: 'guest-2', name: 'John Smith' })
      const secondRoom = makeRoom({ id: 'room-2', name: 'Mountain View' })
      const reservation1 = makeReservation({ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', status: 'Confirmed' })
      const reservation2 = makeReservation({ id: 'res-2', roomId: 'room-2', guestId: 'guest-2', status: 'Checked In' })

      const events = [
        { type: 'Arrival', reservation: reservation1, time: '14:00' },
        { type: 'Departure', reservation: reservation2, time: '11:00' },
      ]

      render(
        <Timeline
          events={events}
          rooms={[testRoom, secondRoom]}
          guests={[testGuest, secondGuest]}
        />,
      )

      expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('Arrival')).toBeInTheDocument()
      expect(screen.getByText('Departure')).toBeInTheDocument()
    })
  })
})
