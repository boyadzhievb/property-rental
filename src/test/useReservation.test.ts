import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { Reservation } from '../domain/Reservation'

const mockGetById = vi.fn()
const mockCheckIn = vi.fn()
const mockCheckOut = vi.fn()
const mockCancel = vi.fn()

vi.mock('../services/ReservationService', () => ({
  reservationService: {
    getReservationById: (...args: unknown[]) => mockGetById(...args),
    checkIn: (...args: unknown[]) => mockCheckIn(...args),
    checkOut: (...args: unknown[]) => mockCheckOut(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
  },
}))

// Plays the data layer: a committed write announces the stores it changed.
let reservationChangeHandlers: (() => void)[] = []
vi.mock('../services/DataChangeService', () => ({
  dataChangeService: {
    subscribe: (stores: string[], handler: () => void) => {
      if (stores.includes('reservations')) reservationChangeHandlers.push(handler)
      return () => { reservationChangeHandlers = reservationChangeHandlers.filter(h => h !== handler) }
    },
  },
}))
const announceReservationChange = async () => { for (const handler of reservationChangeHandlers) handler() }

import { useReservation } from '../hooks/useReservation'

const sampleReservation = new Reservation({
  id: 'res-1',
  roomId: 'room-1',
  guestId: 'guest-1',
  arrivalDate: '2025-06-15',
  departureDate: '2025-06-18',
  guestsCount: 2,
  status: 'Confirmed',
  priceCents: 45000,
})

describe('useReservation', () => {
  beforeEach(() => {
    mockGetById.mockReset()
    mockCheckIn.mockReset()
    mockCheckOut.mockReset()
    mockCancel.mockReset()
    mockGetById.mockResolvedValue(sampleReservation)
    mockCheckIn.mockImplementation(announceReservationChange)
    mockCheckOut.mockImplementation(announceReservationChange)
    mockCancel.mockImplementation(announceReservationChange)
    reservationChangeHandlers = []
  })

  it('returns null reservation and loading=false when no id provided', async () => {
    const { result } = renderHook(() => useReservation(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.reservation).toBeNull()
    expect(result.current.error).toBeNull()
    expect(mockGetById).not.toHaveBeenCalled()
  })

  it('loads reservation by id on mount', async () => {
    const { result } = renderHook(() => useReservation('res-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetById).toHaveBeenCalledWith('res-1')
    expect(result.current.reservation).toBe(sampleReservation)
    expect(result.current.error).toBeNull()
  })

  it('sets error when getReservationById throws', async () => {
    mockGetById.mockRejectedValue(new Error('Reservation not found'))

    const { result } = renderHook(() => useReservation('res-missing'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Reservation not found')
    expect(result.current.reservation).toBeNull()
  })

  it('checkIn calls service and reloads once the change is announced', async () => {
    const checkedInReservation = new Reservation({
      ...sampleReservation.toData(),
      status: 'Checked In',
    })
    mockGetById
      .mockResolvedValueOnce(sampleReservation)
      .mockResolvedValueOnce(checkedInReservation)

    const { result } = renderHook(() => useReservation('res-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.checkIn()
    })

    expect(mockCheckIn).toHaveBeenCalledWith('res-1')
    await waitFor(() => expect(result.current.reservation!.status).toBe('Checked In'))
    expect(mockGetById).toHaveBeenCalledTimes(2)
  })

  it('checkOut calls service and reloads once the change is announced', async () => {
    const checkedOutReservation = new Reservation({
      ...sampleReservation.toData(),
      status: 'Checked Out',
    })
    mockGetById
      .mockResolvedValueOnce(sampleReservation)
      .mockResolvedValueOnce(checkedOutReservation)

    const { result } = renderHook(() => useReservation('res-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.checkOut()
    })

    expect(mockCheckOut).toHaveBeenCalledWith('res-1')
    await waitFor(() => expect(result.current.reservation!.status).toBe('Checked Out'))
    expect(mockGetById).toHaveBeenCalledTimes(2)
  })

  it('cancel calls service and reloads once the change is announced', async () => {
    const cancelledReservation = new Reservation({
      ...sampleReservation.toData(),
      status: 'Cancelled',
    })
    mockGetById
      .mockResolvedValueOnce(sampleReservation)
      .mockResolvedValueOnce(cancelledReservation)

    const { result } = renderHook(() => useReservation('res-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.cancel()
    })

    expect(mockCancel).toHaveBeenCalledWith('res-1')
    await waitFor(() => expect(result.current.reservation!.status).toBe('Cancelled'))
    expect(mockGetById).toHaveBeenCalledTimes(2)
  })

  it('checkIn, checkOut, and cancel do nothing when id is undefined', async () => {
    const { result } = renderHook(() => useReservation(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.checkIn()
      await result.current.checkOut()
      await result.current.cancel()
    })

    expect(mockCheckIn).not.toHaveBeenCalled()
    expect(mockCheckOut).not.toHaveBeenCalled()
    expect(mockCancel).not.toHaveBeenCalled()
    expect(mockGetById).not.toHaveBeenCalled()
  })

  it('reloads when another tab changes reservations', async () => {
    const changedElsewhere = new Reservation({ ...sampleReservation.toData(), status: 'Checked In' })
    mockGetById
      .mockResolvedValueOnce(sampleReservation)
      .mockResolvedValueOnce(changedElsewhere)

    const { result } = renderHook(() => useReservation('res-1'))
    await waitFor(() => expect(result.current.reservation).toBe(sampleReservation))

    act(() => { announceReservationChange() })

    await waitFor(() => expect(result.current.reservation).toBe(changedElsewhere))
  })
})
