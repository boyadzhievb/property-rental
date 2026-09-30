import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Room, RoomStatus } from '../domain/Room'
import { Guest } from '../domain/Guest'

const mockRefreshRooms = vi.fn()
const mockRefreshReservations = vi.fn()
const mockRefreshGuests = vi.fn()

vi.mock('../hooks/useRooms', () => ({
  useRooms: () => ({
    rooms: [
      new Room({ id: 'room-1', name: 'Suite 101', status: RoomStatus.AVAILABLE, pricePerNight: 150, maxGuests: 3 }),
      new Room({ id: 'room-2', name: 'Ocean View', status: RoomStatus.AVAILABLE, pricePerNight: 200, maxGuests: 2 }),
    ],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: mockRefreshRooms,
  }),
}))

vi.mock('../hooks/useGuests', () => ({
  useGuests: () => ({
    guests: [
      new Guest({ id: 'guest-1', name: 'Maria Lopez', phone: '+34 600-111-222', email: 'maria@example.com', previousStays: 2, notes: '' }),
    ],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('../context/ReservationContext', () => ({
  useReservationContext: () => ({
    reservations: [],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: mockRefreshReservations,
  }),
}))

vi.mock('../context/GuestContext', () => ({
  useGuestContext: () => ({
    guests: [],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: mockRefreshGuests,
  }),
}))

vi.mock('../context/LocaleContext', async () => {
  const englishTranslations = (await import('../i18n/en')).default
  return {
    useLocale: () => ({
      locale: 'en' as const,
      setLocale: vi.fn(),
      t: englishTranslations,
    }),
  }
})

import NewReservationModal from '../components/reservations/NewReservationModal'

describe('NewReservationModal', () => {
  it('renders the modal with the New Reservation title', () => {
    render(<NewReservationModal onClose={vi.fn()} />)
    expect(screen.getByText('New Reservation')).toBeInTheDocument()
  })

  it('shows Cancel and Next buttons on the first step', () => {
    render(<NewReservationModal onClose={vi.fn()} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('shows the guest selection step initially', () => {
    render(<NewReservationModal onClose={vi.fn()} />)
    expect(screen.getByText('Select Guest')).toBeInTheDocument()
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
  })

  it('shows validation error when clicking Next without selecting a guest', async () => {
    const user = userEvent.setup()
    render(<NewReservationModal onClose={vi.fn()} />)

    await user.click(screen.getByText('Next'))

    expect(screen.getByText('Please select a guest')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    render(<NewReservationModal onClose={handleClose} />)

    await user.click(screen.getByText('Cancel'))

    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('toggles to new guest form when New Guest button is clicked', async () => {
    const user = userEvent.setup()
    render(<NewReservationModal onClose={vi.fn()} />)

    await user.click(screen.getByText('New Guest'))

    expect(screen.getByPlaceholderText('Guest Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Phone Number')).toBeInTheDocument()
  })

  it('advances to step 2 after selecting a guest and clicking Next', async () => {
    const user = userEvent.setup()
    render(<NewReservationModal onClose={vi.fn()} />)

    await user.click(screen.getByText('Maria Lopez'))
    await user.click(screen.getByText('Next'))

    // Step 2 shows the Save button instead of Next, and shows Stay Details
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Stay Details')).toBeInTheDocument()
  })

  it('validates new guest fields when submitting with empty name', async () => {
    const user = userEvent.setup()
    render(<NewReservationModal onClose={vi.fn()} />)

    await user.click(screen.getByText('New Guest'))
    await user.click(screen.getByText('Next'))

    // Should show validation error for empty guest name
    expect(screen.getByText('Guest name is required')).toBeInTheDocument()
  })
})
