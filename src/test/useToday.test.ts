import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Room, RoomStatus } from '../domain/Room'
import { Reservation } from '../domain/Reservation'
import { Guest } from '../domain/Guest'

let mockRooms: Room[] = []
let mockGuests: Guest[] = []
let mockReservations: Reservation[] = []
let mockRoomsLoading = false
let mockReservationsLoading = false

vi.mock('../context/RoomContext', () => ({
  useRoomContext: () => ({ rooms: mockRooms, loading: mockRoomsLoading }),
}))

vi.mock('../context/GuestContext', () => ({
  useGuestContext: () => ({ guests: mockGuests }),
}))

vi.mock('../context/ReservationContext', () => ({
  useReservationContext: () => ({ reservations: mockReservations, loading: mockReservationsLoading }),
}))

import { useToday } from '../hooks/useToday'

const FIXED_DATE = new Date('2025-06-15T12:00:00')

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_DATE)
    mockRooms = []
    mockGuests = []
    mockReservations = []
    mockRoomsLoading = false
    mockReservationsLoading = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null data when rooms are still loading', () => {
    mockRoomsLoading = true
    const { result } = renderHook(() => useToday())
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('returns null data when reservations are still loading', () => {
    mockReservationsLoading = true
    const { result } = renderHook(() => useToday())
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('computes arrivals for today', () => {
    mockReservations = [
      new Reservation({
        id: 'res-arriving',
        roomId: 'room-1',
        guestId: 'guest-1',
        arrivalDate: '2025-06-15',
        departureDate: '2025-06-18',
        guestsCount: 2,
        status: 'Confirmed',
        price: 450,
      }),
      new Reservation({
        id: 'res-tomorrow',
        roomId: 'room-2',
        guestId: 'guest-2',
        arrivalDate: '2025-06-16',
        departureDate: '2025-06-19',
        guestsCount: 1,
        status: 'Confirmed',
        price: 300,
      }),
    ]

    const { result } = renderHook(() => useToday())
    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.arrivals).toHaveLength(1)
    expect(result.current.data!.arrivals[0].id).toBe('res-arriving')
  })

  it('computes departures for today', () => {
    mockReservations = [
      new Reservation({
        id: 'res-departing',
        roomId: 'room-1',
        guestId: 'guest-1',
        arrivalDate: '2025-06-12',
        departureDate: '2025-06-15',
        guestsCount: 2,
        status: 'Checked In',
        price: 450,
      }),
      new Reservation({
        id: 'res-stays',
        roomId: 'room-2',
        guestId: 'guest-2',
        arrivalDate: '2025-06-13',
        departureDate: '2025-06-17',
        guestsCount: 1,
        status: 'Checked In',
        price: 400,
      }),
    ]

    const { result } = renderHook(() => useToday())
    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.departures).toHaveLength(1)
    expect(result.current.data!.departures[0].id).toBe('res-departing')
  })

  it('counts occupied and cleaning rooms', () => {
    mockRooms = [
      new Room({ id: 'room-1', name: 'Suite 1', status: RoomStatus.OCCUPIED, pricePerNight: 200, maxGuests: 2 }),
      new Room({ id: 'room-2', name: 'Suite 2', status: RoomStatus.OCCUPIED, pricePerNight: 200, maxGuests: 2 }),
      new Room({ id: 'room-3', name: 'Suite 3', status: RoomStatus.CLEANING, pricePerNight: 150, maxGuests: 2 }),
      new Room({ id: 'room-4', name: 'Suite 4', status: RoomStatus.AVAILABLE, pricePerNight: 100, maxGuests: 2 }),
    ]

    const { result } = renderHook(() => useToday())
    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.occupiedCount).toBe(2)
    expect(result.current.data!.cleaningCount).toBe(1)
  })

  it('sorts timeline with departures before arrivals', () => {
    mockReservations = [
      new Reservation({
        id: 'res-arriving',
        roomId: 'room-1',
        guestId: 'guest-1',
        arrivalDate: '2025-06-15',
        departureDate: '2025-06-18',
        guestsCount: 2,
        status: 'Confirmed',
        price: 450,
      }),
      new Reservation({
        id: 'res-departing',
        roomId: 'room-2',
        guestId: 'guest-2',
        arrivalDate: '2025-06-12',
        departureDate: '2025-06-15',
        guestsCount: 1,
        status: 'Checked In',
        price: 300,
      }),
    ]

    const { result } = renderHook(() => useToday())
    expect(result.current.data).not.toBeNull()

    const timeline = result.current.data!.timeline
    expect(timeline).toHaveLength(2)
    expect(timeline[0].type).toBe('Departure')
    expect(timeline[0].time).toBe('11:00')
    expect(timeline[1].type).toBe('Arrival')
    expect(timeline[1].time).toBe('14:00')
  })

  it('excludes non-confirmed arrivals and non-checked-in departures', () => {
    mockReservations = [
      new Reservation({
        id: 'res-cancelled-arrival',
        roomId: 'room-1',
        guestId: 'guest-1',
        arrivalDate: '2025-06-15',
        departureDate: '2025-06-18',
        guestsCount: 2,
        status: 'Cancelled',
        price: 450,
      }),
      new Reservation({
        id: 'res-confirmed-departure',
        roomId: 'room-2',
        guestId: 'guest-2',
        arrivalDate: '2025-06-12',
        departureDate: '2025-06-15',
        guestsCount: 1,
        status: 'Confirmed',
        price: 300,
      }),
    ]

    const { result } = renderHook(() => useToday())
    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.arrivals).toHaveLength(0)
    expect(result.current.data!.departures).toHaveLength(0)
    expect(result.current.data!.timeline).toHaveLength(0)
  })

  it('passes rooms and guests through to the returned data', () => {
    mockRooms = [
      new Room({ id: 'room-1', name: 'Garden Room', status: RoomStatus.AVAILABLE, pricePerNight: 120, maxGuests: 2 }),
    ]
    mockGuests = [
      new Guest({ id: 'guest-1', name: 'Alice Walker', phone: '+1 555-0123', email: 'alice@example.com', previousStays: 3, notes: '' }),
    ]

    const { result } = renderHook(() => useToday())
    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.rooms).toHaveLength(1)
    expect(result.current.data!.rooms[0].name).toBe('Garden Room')
    expect(result.current.data!.guests).toHaveLength(1)
    expect(result.current.data!.guests[0].name).toBe('Alice Walker')
  })
})
