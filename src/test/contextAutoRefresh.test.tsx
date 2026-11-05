import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import React from 'react'

const room = { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNightCents: 10000, maxGuests: 2 } as const
const guest = { id: 'guest-1', name: 'Maria Ivanova', phone: '+359888123456', email: '', previousStays: 0, notes: '' }
const booking = { id: 'res-1', roomId: 'room-1', guestId: 'guest-1', arrivalDate: '2026-12-01', departureDate: '2026-12-05', guestsCount: 1, status: 'Confirmed' as const, priceCents: 40000 }

/** Real providers, services and (fake) IndexedDB: nothing between a write and the lists is mocked. */
async function renderWithProviders() {
  const { api } = await import('../api/client')
  await api.rooms.create({ ...room })
  await api.guests.create({ ...guest })

  const { RoomProvider, useRoomContext } = await import('../context/RoomContext')
  const { GuestProvider, useGuestContext } = await import('../context/GuestContext')
  const { ReservationProvider, useReservationContext } = await import('../context/ReservationContext')
  const { PaymentProvider, usePaymentContext } = await import('../context/PaymentContext')
  const { guestService } = await import('../services/GuestService')
  const { reservationService } = await import('../services/ReservationService')
  const { backupService } = await import('../services/BackupService')
  const loadGuests = vi.spyOn(guestService, 'getGuests')

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RoomProvider><GuestProvider><ReservationProvider><PaymentProvider>{children}</PaymentProvider></ReservationProvider></GuestProvider></RoomProvider>
  )
  const { result } = renderHook(() => ({
    rooms: useRoomContext(),
    guests: useGuestContext(),
    reservations: useReservationContext(),
    payments: usePaymentContext(),
  }), { wrapper })

  await waitFor(() => expect(result.current.rooms.rooms).toHaveLength(1))
  await waitFor(() => expect(result.current.guests.guests).toHaveLength(1))
  return { result, loadGuests, reservationService, backupService }
}

describe('contexts reload by themselves after a write', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('check-in updates reservations and rooms, and leaves guests alone', async () => {
    const { result, loadGuests, reservationService } = await renderWithProviders()
    await act(async () => { await reservationService.createReservation({ ...booking }) })
    await waitFor(() => expect(result.current.reservations.reservations).toHaveLength(1))
    const guestLoadsBefore = loadGuests.mock.calls.length

    await act(async () => { await reservationService.checkIn(booking.id) })

    await waitFor(() => expect(result.current.reservations.reservations[0].status).toBe('Checked In'))
    await waitFor(() => expect(result.current.rooms.rooms[0].status).toBe('Occupied'))
    expect(loadGuests.mock.calls.length).toBe(guestLoadsBefore)
  })

  it('check-out moves the room to cleaning on screen', async () => {
    const { result, reservationService } = await renderWithProviders()
    await act(async () => {
      await reservationService.createReservation({ ...booking })
      await reservationService.checkIn(booking.id)
      await reservationService.checkOut(booking.id)
    })

    await waitFor(() => expect(result.current.reservations.reservations[0].status).toBe('Checked Out'))
    await waitFor(() => expect(result.current.rooms.rooms[0].status).toBe('Cleaning'))
  })

  it('a restore updates every list', async () => {
    const { result, backupService } = await renderWithProviders()

    await act(async () => {
      await backupService.import({
        rooms: [{ ...room, id: 'room-2', name: 'Garden' }],
        guests: [{ ...guest, id: 'guest-2', name: 'Ivan Petrov' }],
        reservations: [{ ...booking, id: 'res-2', roomId: 'room-2', guestId: 'guest-2' }],
        payments: [{ id: 'pay-1', reservationId: 'res-2', amountCents: 10000, date: '2026-12-01', method: 'cash', note: '' }],
      })
    })

    await waitFor(() => expect(result.current.rooms.rooms.map(r => r.name)).toEqual(['Garden']))
    await waitFor(() => expect(result.current.guests.guests.map(g => g.name)).toEqual(['Ivan Petrov']))
    await waitFor(() => expect(result.current.reservations.reservations.map(r => r.id)).toEqual(['res-2']))
    await waitFor(() => expect(result.current.payments.payments.map(p => p.id)).toEqual(['pay-1']))
  })
})
