import { describe, it, expect } from 'vitest'
import { Room, RoomStatus } from '../Room'
import type { RoomData } from '../Room'

function makeRoom(overrides: Partial<RoomData> = {}) {
  return new Room({
    id: '1',
    name: 'Suite 101',
    status: RoomStatus.AVAILABLE,
    pricePerNight: 120,
    maxGuests: 2,
    ...overrides,
  })
}

describe('Room', () => {
  it('constructs with given data', () => {
    const room = makeRoom()
    expect(room.id).toBe('1')
    expect(room.name).toBe('Suite 101')
    expect(room.status).toBe(RoomStatus.AVAILABLE)
    expect(room.pricePerNight).toBe(120)
    expect(room.maxGuests).toBe(2)
  })

  it('isAvailable returns true only when status is Available', () => {
    expect(makeRoom({ status: RoomStatus.AVAILABLE }).isAvailable()).toBe(true)
    expect(makeRoom({ status: RoomStatus.OCCUPIED }).isAvailable()).toBe(false)
    expect(makeRoom({ status: RoomStatus.CLEANING }).isAvailable()).toBe(false)
    expect(makeRoom({ status: RoomStatus.MAINTENANCE }).isAvailable()).toBe(false)
  })

  it('occupy changes status to Occupied', () => {
    const room = makeRoom()
    room.occupy()
    expect(room.status).toBe(RoomStatus.OCCUPIED)
  })

  it('markCleaning changes status to Cleaning', () => {
    const room = makeRoom()
    room.markCleaning()
    expect(room.status).toBe(RoomStatus.CLEANING)
  })

  describe('vacate (mark as cleaned)', () => {
    it('changes Cleaning to Available', () => {
      const room = makeRoom({ status: RoomStatus.CLEANING })
      room.vacate()
      expect(room.status).toBe(RoomStatus.AVAILABLE)
    })

    it('throws if room is not in Cleaning status', () => {
      expect(() => makeRoom({ status: RoomStatus.AVAILABLE }).vacate())
        .toThrow('Room can only be marked available from Cleaning status')
      expect(() => makeRoom({ status: RoomStatus.OCCUPIED }).vacate())
        .toThrow('Room can only be marked available from Cleaning status')
      expect(() => makeRoom({ status: RoomStatus.MAINTENANCE }).vacate())
        .toThrow('Room can only be marked available from Cleaning status')
    })
  })

  describe('markMaintenance', () => {
    it('changes Available to Maintenance', () => {
      const room = makeRoom({ status: RoomStatus.AVAILABLE })
      room.markMaintenance()
      expect(room.status).toBe(RoomStatus.MAINTENANCE)
    })

    it('changes Cleaning to Maintenance', () => {
      const room = makeRoom({ status: RoomStatus.CLEANING })
      room.markMaintenance()
      expect(room.status).toBe(RoomStatus.MAINTENANCE)
    })

    it('throws if room is Occupied', () => {
      expect(() => makeRoom({ status: RoomStatus.OCCUPIED }).markMaintenance())
        .toThrow('An occupied room cannot be marked for maintenance')
    })
  })

  describe('markAvailable (from maintenance)', () => {
    it('changes Maintenance to Available', () => {
      const room = makeRoom({ status: RoomStatus.MAINTENANCE })
      room.markAvailable()
      expect(room.status).toBe(RoomStatus.AVAILABLE)
    })

    it('throws if room is not in Maintenance status', () => {
      expect(() => makeRoom({ status: RoomStatus.AVAILABLE }).markAvailable())
        .toThrow('Only a maintenance room can be marked available this way')
      expect(() => makeRoom({ status: RoomStatus.OCCUPIED }).markAvailable())
        .toThrow('Only a maintenance room can be marked available this way')
      expect(() => makeRoom({ status: RoomStatus.CLEANING }).markAvailable())
        .toThrow('Only a maintenance room can be marked available this way')
    })
  })

  it('toData returns a plain object matching the input', () => {
    const room = makeRoom()
    room.occupy()
    const data = room.toData()
    expect(data).toEqual({
      id: '1',
      name: 'Suite 101',
      status: RoomStatus.OCCUPIED,
      pricePerNight: 120,
      maxGuests: 2,
    })
  })
})
