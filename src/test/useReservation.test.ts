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

import { useReservation } from '../hooks/useReservation'

const sampleReservation = new Reservation({
  id: 'res-1',
  roomId: 'room-1',
  guestId: 'guest-1',
  arrivalDate: '2025-06-15',
  departureDate: '2025-06-18',
  guestsCount: 2,
  status: 'Confirmed',
  price: 450,
})

describe('useReservation', () => {
  beforeEach(() => {
    mockGetById.mockReset()
    mockCheckIn.mockReset()
    mockCheckOut.mockReset()
    mockCancel.mockReset()
    mockGetById.mockResolvedValue(sampleReservation)
    mockCheckIn.mockResolvedValue(undefined)
    mockCheckOut.mockResolvedValue(undefined)
    mockCancel.mockResolvedValue(undefined)
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

  it('checkIn calls service and refreshes', async () => {
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
    expect(mockGetById).toHaveBeenCalledTimes(2)
    expect(result.current.reservation!.status).toBe('Checked In')
  })

  it('checkOut calls service and refreshes', async () => {
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
    expect(mockGetById).toHaveBeenCalledTimes(2)
    expect(result.current.reservation!.status).toBe('Checked Out')
  })

  it('cancel calls service and refreshes', async () => {
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
    expect(mockGetById).toHaveBeenCalledTimes(2)
    expect(result.current.reservation!.status).toBe('Cancelled')
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
})
