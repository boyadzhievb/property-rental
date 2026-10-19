import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoomService } from '../RoomService'
import { RoomStatus } from '../../domain/Room'

vi.mock('../../repositories/RoomRepository', () => {
  const store = new Map<string, any>()
  return {
    roomRepository: {
      getAll: vi.fn(async () => {
        const { Room } = await import('../../domain/Room')
        return [...store.values()].map(d => new Room(d))
      }),
      getById: vi.fn(async (id: string) => {
        const d = store.get(id)
        if (!d) return null
        const { Room } = await import('../../domain/Room')
        return new Room(d)
      }),
      save: vi.fn(async (r: any) => {
        const data = r.toData()
        store.set(data.id, data)
        const { Room } = await import('../../domain/Room')
        return new Room(data)
      }),
      _store: store,
    },
  }
})

import { roomRepository } from '../../repositories/RoomRepository'

const store = (roomRepository as any)._store as Map<string, any>

function seedRoom(overrides: Partial<any> = {}) {
  const data = { id: 'room-1', name: 'Suite 1', status: RoomStatus.AVAILABLE, pricePerNight: 100, maxGuests: 2, ...overrides }
  store.set(data.id, data)
  return data
}

describe('RoomService', () => {
  let service: RoomService

  beforeEach(() => {
    store.clear()
    service = new RoomService()
  })

  describe('createRoom', () => {
    it('creates a room with valid data', async () => {
      const room = await service.createRoom({
        id: 'room-1', name: 'Suite 1', status: RoomStatus.AVAILABLE,
        pricePerNight: 100, maxGuests: 2,
      })
      expect(room.id).toBe('room-1')
      expect(room.name).toBe('Suite 1')
    })

    it('rejects invalid data', async () => {
      await expect(service.createRoom({
        id: 'room-1', name: '', status: RoomStatus.AVAILABLE,
        pricePerNight: 100, maxGuests: 2,
      })).rejects.toThrow()
    })
  })

  describe('updateRoom', () => {
    it('merges and saves updated fields', async () => {
      seedRoom()
      const room = await service.updateRoom('room-1', { name: 'Deluxe Suite' })
      expect(room!.name).toBe('Deluxe Suite')
      expect(room!.pricePerNight).toBe(100)
    })

    it('returns null for non-existent room', async () => {
      const result = await service.updateRoom('no-such-id', { name: 'X' })
      expect(result).toBeNull()
    })
  })

  describe('getRooms', () => {
    it('returns all rooms', async () => {
      seedRoom({ id: 'room-1', name: 'Suite 1' })
      seedRoom({ id: 'room-2', name: 'Suite 2' })
      const rooms = await service.getRooms()
      expect(rooms).toHaveLength(2)
      expect(rooms.map(r => r.id)).toContain('room-1')
      expect(rooms.map(r => r.id)).toContain('room-2')
    })

    it('returns empty array when no rooms exist', async () => {
      const rooms = await service.getRooms()
      expect(rooms).toEqual([])
    })
  })

  describe('getRoomById', () => {
    it('returns room when found', async () => {
      seedRoom({ id: 'room-1', name: 'Deluxe Suite' })
      const room = await service.getRoomById('room-1')
      expect(room).not.toBeNull()
      expect(room!.id).toBe('room-1')
      expect(room!.name).toBe('Deluxe Suite')
    })

    it('returns null when room is not found', async () => {
      const room = await service.getRoomById('non-existent-id')
      expect(room).toBeNull()
    })
  })

  describe('updateRoomStatus', () => {
    it('clean: transitions Cleaning to Available', async () => {
      seedRoom({ status: RoomStatus.CLEANING })
      const room = await service.updateRoomStatus('room-1', 'clean')
      expect(room.status).toBe(RoomStatus.AVAILABLE)
    })

    it('maintenance: transitions Available to Maintenance', async () => {
      seedRoom()
      const room = await service.updateRoomStatus('room-1', 'maintenance')
      expect(room.status).toBe(RoomStatus.MAINTENANCE)
    })

    it('available: transitions Maintenance to Available', async () => {
      seedRoom({ status: RoomStatus.MAINTENANCE })
      const room = await service.updateRoomStatus('room-1', 'available')
      expect(room.status).toBe(RoomStatus.AVAILABLE)
    })

    it('throws for non-existent room', async () => {
      await expect(service.updateRoomStatus('no-such-id', 'clean')).rejects.toThrow('Room not found')
    })

    it('throws for invalid transition', async () => {
      seedRoom({ status: RoomStatus.AVAILABLE })
      await expect(service.updateRoomStatus('room-1', 'clean')).rejects.toThrow()
    })
  })
})
