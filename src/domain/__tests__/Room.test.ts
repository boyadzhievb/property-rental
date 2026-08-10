import { describe, it, expect } from 'vitest'
import { Room } from '../Room'

function makeRoom(overrides: Partial<import('../Room').RoomData> = {}) {
  return new Room({
    id: '1',
    name: 'Suite 101',
    status: 'Available',
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
    expect(room.status).toBe('Available')
    expect(room.pricePerNight).toBe(120)
    expect(room.maxGuests).toBe(2)
  })

  it('isAvailable returns true only when status is Available', () => {
    expect(makeRoom({ status: 'Available' }).isAvailable()).toBe(true)
    expect(makeRoom({ status: 'Occupied' }).isAvailable()).toBe(false)
    expect(makeRoom({ status: 'Cleaning' }).isAvailable()).toBe(false)
    expect(makeRoom({ status: 'Not available' }).isAvailable()).toBe(false)
  })

  it('occupy changes status to Occupied', () => {
    const room = makeRoom()
    room.occupy()
    expect(room.status).toBe('Occupied')
  })

  it('vacate changes status to Available', () => {
    const room = makeRoom({ status: 'Occupied' })
    room.vacate()
    expect(room.status).toBe('Available')
  })

  it('markCleaning changes status to Cleaning', () => {
    const room = makeRoom()
    room.markCleaning()
    expect(room.status).toBe('Cleaning')
  })

  it('markMaintenance changes status to Not available', () => {
    const room = makeRoom()
    room.markMaintenance()
    expect(room.status).toBe('Not available')
  })

  it('toData returns a plain object matching the input', () => {
    const room = makeRoom()
    room.occupy()
    const data = room.toData()
    expect(data).toEqual({
      id: '1',
      name: 'Suite 101',
      status: 'Occupied',
      pricePerNight: 120,
      maxGuests: 2,
    })
  })
})
