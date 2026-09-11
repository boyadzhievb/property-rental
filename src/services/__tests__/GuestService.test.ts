import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GuestService } from '../GuestService'

vi.mock('../../repositories/GuestRepository', () => {
  const store = new Map<string, any>()
  return {
    guestRepository: {
      getAll: vi.fn(async () => {
        const { Guest } = await import('../../domain/Guest')
        return [...store.values()].map(d => new Guest(d))
      }),
      getById: vi.fn(async (id: string) => {
        const d = store.get(id)
        if (!d) return null
        const { Guest } = await import('../../domain/Guest')
        return new Guest(d)
      }),
      save: vi.fn(async (g: any) => {
        const data = g.toData()
        store.set(data.id, data)
        const { Guest } = await import('../../domain/Guest')
        return new Guest(data)
      }),
      _store: store,
    },
  }
})

import { guestRepository } from '../../repositories/GuestRepository'

const store = (guestRepository as any)._store as Map<string, any>

describe('GuestService', () => {
  let service: GuestService

  beforeEach(() => {
    store.clear()
    service = new GuestService()
  })

  describe('createGuest', () => {
    it('creates a guest with valid data', async () => {
      const guest = await service.createGuest({
        id: 'g-1', name: 'John Doe', phone: '+1234567890',
        email: 'john@example.com', previousStays: 0, notes: '',
      })
      expect(guest.name).toBe('John Doe')
      expect(guest.phone).toBe('+1234567890')
    })

    it('allows empty email', async () => {
      const guest = await service.createGuest({
        id: 'g-1', name: 'Jane', phone: '+1234567890',
        email: '', previousStays: 0, notes: '',
      })
      expect(guest.email).toBe('')
    })

    it('rejects missing name', async () => {
      await expect(service.createGuest({
        id: 'g-1', name: '', phone: '+1234567890',
        email: '', previousStays: 0, notes: '',
      })).rejects.toThrow()
    })

    it('rejects missing phone', async () => {
      await expect(service.createGuest({
        id: 'g-1', name: 'John', phone: '',
        email: '', previousStays: 0, notes: '',
      })).rejects.toThrow()
    })

    it('rejects invalid email format', async () => {
      await expect(service.createGuest({
        id: 'g-1', name: 'John', phone: '+123',
        email: 'not-an-email', previousStays: 0, notes: '',
      })).rejects.toThrow()
    })
  })

  describe('getGuests', () => {
    it('returns all guests', async () => {
      store.set('g-1', { id: 'g-1', name: 'A', phone: '1', email: '', previousStays: 0, notes: '' })
      store.set('g-2', { id: 'g-2', name: 'B', phone: '2', email: '', previousStays: 0, notes: '' })
      const guests = await service.getGuests()
      expect(guests).toHaveLength(2)
    })
  })
})
