import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Room, RoomStatus } from '../domain/Room'
import { Guest } from '../domain/Guest'
import { Reservation } from '../domain/Reservation'

let mockRooms: Room[] = []
let mockGuests: Guest[] = []
let mockContextReservations: Reservation[] = []

vi.mock('../context/RoomContext', () => ({
  useRoomContext: () => ({ rooms: mockRooms }),
}))

vi.mock('../context/GuestContext', () => ({
  useGuestContext: () => ({ guests: mockGuests }),
}))

vi.mock('../context/ReservationContext', () => ({
  useReservationContext: () => ({ reservations: mockContextReservations }),
}))

const mockGetReservationsByRange = vi.fn()

vi.mock('../services/ReservationService', () => ({
  reservationService: {
    getReservationsByRange: (...args: unknown[]) => mockGetReservationsByRange(...args),
  },
}))

import { useCalendar } from '../hooks/useCalendar'

const WEEK_START = new Date('2025-06-16T12:00:00')

describe('useCalendar', () => {
  beforeEach(() => {
    mockRooms = []
    mockGuests = []
    mockContextReservations = []
    mockGetReservationsByRange.mockReset()
    mockGetReservationsByRange.mockResolvedValue([])
  })

  it('returns null data while loading', () => {
    mockGetReservationsByRange.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useCalendar(WEEK_START))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('returns calendar data with rooms, guests, and fetched reservations after loading', async () => {
    const fetchedReservations = [
      new Reservation({
        id: 'res-1',
        roomId: 'room-1',
        guestId: 'guest-1',
        arrivalDate: '2025-06-16',
        departureDate: '2025-06-19',
        guestsCount: 2,
        status: 'Confirmed',
        price: 300,
      }),
    ]
    mockGetReservationsByRange.mockResolvedValue(fetchedReservations)

    mockRooms = [
      new Room({ id: 'room-1', name: 'Ocean Suite', status: RoomStatus.AVAILABLE, pricePerNight: 100, maxGuests: 2 }),
    ]
    mockGuests = [
      new Guest({ id: 'guest-1', name: 'Jane Doe', phone: '+1 555-0100', email: 'jane@example.com', previousStays: 1, notes: '' }),
    ]

    const { result } = renderHook(() => useCalendar(WEEK_START))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.rooms).toHaveLength(1)
    expect(result.current.data!.rooms[0].name).toBe('Ocean Suite')
    expect(result.current.data!.guests).toHaveLength(1)
    expect(result.current.data!.guests[0].name).toBe('Jane Doe')
    expect(result.current.data!.reservations).toHaveLength(1)
    expect(result.current.data!.reservations[0].id).toBe('res-1')
  })

  it('fetches reservations for the correct date range (weekStart to weekStart+6)', async () => {
    const weekStart = new Date('2025-07-07T00:00:00')
    mockGetReservationsByRange.mockResolvedValue([])

    const { result } = renderHook(() => useCalendar(weekStart))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetReservationsByRange).toHaveBeenCalledWith('2025-07-07', '2025-07-13')
  })

  it('sets error when service throws', async () => {
    mockGetReservationsByRange.mockRejectedValue(new Error('Database connection failed'))

    const { result } = renderHook(() => useCalendar(WEEK_START))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Database connection failed')
  })

  it('passes rooms and guests from context through to data', async () => {
    mockGetReservationsByRange.mockResolvedValue([])

    mockRooms = [
      new Room({ id: 'room-1', name: 'Mountain View', status: RoomStatus.AVAILABLE, pricePerNight: 150, maxGuests: 3 }),
      new Room({ id: 'room-2', name: 'Garden Room', status: RoomStatus.OCCUPIED, pricePerNight: 120, maxGuests: 2 }),
    ]
    mockGuests = [
      new Guest({ id: 'guest-1', name: 'Alice Walker', phone: '+1 555-0123', email: 'alice@example.com', previousStays: 3, notes: '' }),
      new Guest({ id: 'guest-2', name: 'Bob Smith', phone: '+1 555-0456', email: 'bob@example.com', previousStays: 0, notes: '' }),
    ]

    const { result } = renderHook(() => useCalendar(WEEK_START))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.rooms).toHaveLength(2)
    expect(result.current.data!.rooms[0].name).toBe('Mountain View')
    expect(result.current.data!.rooms[1].name).toBe('Garden Room')
    expect(result.current.data!.guests).toHaveLength(2)
    expect(result.current.data!.guests[0].name).toBe('Alice Walker')
    expect(result.current.data!.guests[1].name).toBe('Bob Smith')
  })
})
