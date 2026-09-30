import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

describe('RoomRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('getAll returns empty array when no rooms exist', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const roomRepository = new RoomRepository()
    const rooms = await roomRepository.getAll()
    expect(rooms).toEqual([])
  })

  it('save persists a room and getAll retrieves it', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const { Room, RoomStatus } = await import('../domain/Room')
    const roomRepository = new RoomRepository()

    const room = new Room({
      id: 'room-1',
      name: 'Deluxe Suite',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 200,
      maxGuests: 4,
    })

    const savedRoom = await roomRepository.save(room)
    expect(savedRoom.id).toBe('room-1')
    expect(savedRoom.name).toBe('Deluxe Suite')

    const allRooms = await roomRepository.getAll()
    expect(allRooms).toHaveLength(1)
    expect(allRooms[0].id).toBe('room-1')
    expect(allRooms[0].name).toBe('Deluxe Suite')
    expect(allRooms[0].status).toBe(RoomStatus.AVAILABLE)
    expect(allRooms[0].pricePerNight).toBe(200)
    expect(allRooms[0].maxGuests).toBe(4)
  })

  it('save with the same id updates an existing room', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const { Room, RoomStatus } = await import('../domain/Room')
    const roomRepository = new RoomRepository()

    const originalRoom = new Room({
      id: 'room-1',
      name: 'Standard Room',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 100,
      maxGuests: 2,
    })
    await roomRepository.save(originalRoom)

    const updatedRoom = new Room({
      id: 'room-1',
      name: 'Premium Room',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 180,
      maxGuests: 3,
    })
    await roomRepository.save(updatedRoom)

    const allRooms = await roomRepository.getAll()
    expect(allRooms).toHaveLength(1)
    expect(allRooms[0].name).toBe('Premium Room')
    expect(allRooms[0].pricePerNight).toBe(180)
    expect(allRooms[0].maxGuests).toBe(3)
  })

  it('delete removes a room', async () => {
    const { RoomRepository } = await import('../repositories/RoomRepository')
    const { Room, RoomStatus } = await import('../domain/Room')
    const roomRepository = new RoomRepository()

    const room = new Room({
      id: 'room-1',
      name: 'Ocean View',
      status: RoomStatus.AVAILABLE,
      pricePerNight: 250,
      maxGuests: 2,
    })
    await roomRepository.save(room)

    const roomsBeforeDelete = await roomRepository.getAll()
    expect(roomsBeforeDelete).toHaveLength(1)

    await roomRepository.delete('room-1')

    const roomsAfterDelete = await roomRepository.getAll()
    expect(roomsAfterDelete).toHaveLength(0)
  })
})

describe('ReservationRepository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('getAll returns empty array when no reservations exist', async () => {
    const { ReservationRepository } = await import('../repositories/ReservationRepository')
    const reservationRepository = new ReservationRepository()
    const reservations = await reservationRepository.getAll()
    expect(reservations).toEqual([])
  })

  it('save persists a reservation and getAll retrieves it', async () => {
    const { ReservationRepository } = await import('../repositories/ReservationRepository')
    const { Reservation } = await import('../domain/Reservation')
    const reservationRepository = new ReservationRepository()

    const reservation = new Reservation({
      id: 'res-1',
      roomId: 'room-1',
      guestId: 'guest-1',
      arrivalDate: '2025-07-01',
      departureDate: '2025-07-05',
      guestsCount: 2,
      status: 'Confirmed',
      price: 600,
    })

    const savedReservation = await reservationRepository.save(reservation)
    expect(savedReservation.id).toBe('res-1')
    expect(savedReservation.status).toBe('Confirmed')

    const allReservations = await reservationRepository.getAll()
    expect(allReservations).toHaveLength(1)
    expect(allReservations[0].id).toBe('res-1')
    expect(allReservations[0].roomId).toBe('room-1')
    expect(allReservations[0].guestId).toBe('guest-1')
    expect(allReservations[0].arrivalDate).toBe('2025-07-01')
    expect(allReservations[0].departureDate).toBe('2025-07-05')
    expect(allReservations[0].guestsCount).toBe(2)
    expect(allReservations[0].price).toBe(600)
  })

  it('getByMonth filters reservations by date range', async () => {
    const { ReservationRepository } = await import('../repositories/ReservationRepository')
    const { Reservation } = await import('../domain/Reservation')
    const reservationRepository = new ReservationRepository()

    const earlyReservation = new Reservation({
      id: 'res-early',
      roomId: 'room-1',
      guestId: 'guest-1',
      arrivalDate: '2025-06-01',
      departureDate: '2025-06-05',
      guestsCount: 2,
      status: 'Confirmed',
      price: 400,
    })

    const midReservation = new Reservation({
      id: 'res-mid',
      roomId: 'room-1',
      guestId: 'guest-2',
      arrivalDate: '2025-07-10',
      departureDate: '2025-07-15',
      guestsCount: 1,
      status: 'Confirmed',
      price: 500,
    })

    const lateReservation = new Reservation({
      id: 'res-late',
      roomId: 'room-2',
      guestId: 'guest-3',
      arrivalDate: '2025-08-20',
      departureDate: '2025-08-25',
      guestsCount: 3,
      status: 'Confirmed',
      price: 750,
    })

    await reservationRepository.save(earlyReservation)
    await reservationRepository.save(midReservation)
    await reservationRepository.save(lateReservation)

    // Query for July only — should return only the mid reservation
    const julyReservations = await reservationRepository.getByMonth('2025-07-01', '2025-07-31')
    expect(julyReservations).toHaveLength(1)
    expect(julyReservations[0].id).toBe('res-mid')

    // Query for a wider range covering June and July
    const widerRange = await reservationRepository.getByMonth('2025-06-01', '2025-07-31')
    expect(widerRange).toHaveLength(2)
    const widerRangeIds = widerRange.map(reservation => reservation.id).sort()
    expect(widerRangeIds).toEqual(['res-early', 'res-mid'])
  })
})
