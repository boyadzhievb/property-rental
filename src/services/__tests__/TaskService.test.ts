import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskService } from '../TaskService'
import { RoomStatus } from '../../domain/Room'
import { format } from 'date-fns'

vi.mock('../../repositories/TaskRepository', () => {
  const store = new Map<string, any>()
  return {
    taskRepository: {
      getAll: vi.fn(async () => {
        const { Task } = await import('../../domain/Task')
        return [...store.values()].map(d => new Task(d))
      }),
      getByDate: vi.fn(async (date: string) => {
        const { Task } = await import('../../domain/Task')
        return [...store.values()].filter(d => d.date === date).map(d => new Task(d))
      }),
      getById: vi.fn(async (id: string) => {
        const d = store.get(id)
        if (!d) return null
        const { Task } = await import('../../domain/Task')
        return new Task(d)
      }),
      save: vi.fn(async (t: any) => {
        const data = t.toData()
        store.set(data.id, data)
        const { Task } = await import('../../domain/Task')
        return new Task(data)
      }),
      delete: vi.fn(async (id: string) => { store.delete(id) }),
      _store: store,
    },
  }
})

vi.mock('../../repositories/RoomRepository', () => {
  const store = new Map<string, any>()
  return {
    roomRepository: {
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

import { taskRepository } from '../../repositories/TaskRepository'
import { roomRepository } from '../../repositories/RoomRepository'

const taskStore = (taskRepository as any)._store as Map<string, any>
const roomStore = (roomRepository as any)._store as Map<string, any>

const today = format(new Date(), 'yyyy-MM-dd')

function seedTask(overrides: Partial<any> = {}) {
  const data = {
    id: 'task-1', title: 'Clean Suite 1', category: 'cleaning',
    completed: false, date: today, linkedRoomId: 'room-1', auto: false, ...overrides,
  }
  taskStore.set(data.id, data)
  return data
}

function seedRoom(overrides: Partial<any> = {}) {
  const data = { id: 'room-1', name: 'Suite 1', status: RoomStatus.CLEANING, pricePerNight: 100, maxGuests: 2, ...overrides }
  roomStore.set(data.id, data)
  return data
}

describe('TaskService', () => {
  let service: TaskService

  beforeEach(() => {
    taskStore.clear()
    roomStore.clear()
    service = new TaskService()
  })

  describe('toggleTask', () => {
    it('completes an incomplete task', async () => {
      seedTask()
      const result = await service.toggleTask('task-1')
      expect(result!.completed).toBe(true)
    })

    it('reopens a completed task', async () => {
      seedTask({ completed: true })
      const result = await service.toggleTask('task-1')
      expect(result!.completed).toBe(false)
    })

    it('completing a cleaning task transitions room to Available', async () => {
      seedRoom({ status: RoomStatus.CLEANING })
      seedTask({ category: 'cleaning', linkedRoomId: 'room-1' })
      await service.toggleTask('task-1')
      const roomData = roomStore.get('room-1')
      expect(roomData.status).toBe(RoomStatus.AVAILABLE)
    })

    it('completing a non-cleaning task does not change room status', async () => {
      seedRoom({ status: RoomStatus.CLEANING })
      seedTask({ category: 'preparation', linkedRoomId: 'room-1' })
      await service.toggleTask('task-1')
      const roomData = roomStore.get('room-1')
      expect(roomData.status).toBe(RoomStatus.CLEANING)
    })

    it('returns null for non-existent task', async () => {
      const result = await service.toggleTask('no-such-id')
      expect(result).toBeNull()
    })
  })

  describe('ensureAutoTasks', () => {
    it('creates cleaning tasks for rooms in Cleaning status', async () => {
      const tasks = await service.ensureAutoTasks({
        cleaningRoomIds: [{ id: 'room-1', name: 'Suite 1' }],
        preparationRoomIds: [],
        pendingPayments: [],
      })
      const cleanTask = tasks.find(t => t.id === `auto-clean-room-1-${today}`)
      expect(cleanTask).toBeDefined()
      expect(cleanTask!.category).toBe('cleaning')
      expect(cleanTask!.linkedRoomId).toBe('room-1')
    })

    it('creates preparation tasks for arrivals', async () => {
      const tasks = await service.ensureAutoTasks({
        cleaningRoomIds: [],
        preparationRoomIds: [{ id: 'room-2', name: 'Suite 2', guestName: 'John' }],
        pendingPayments: [],
      })
      const prepTask = tasks.find(t => t.id === `auto-prep-room-2-${today}`)
      expect(prepTask).toBeDefined()
      expect(prepTask!.title).toContain('John')
    })

    it('creates payment tasks for pending payments', async () => {
      const tasks = await service.ensureAutoTasks({
        cleaningRoomIds: [],
        preparationRoomIds: [],
        pendingPayments: [{ reservationId: 'res-1', guestName: 'Jane' }],
      })
      const payTask = tasks.find(t => t.id === `auto-pay-res-1-${today}`)
      expect(payTask).toBeDefined()
      expect(payTask!.title).toContain('Jane')
    })

    it('does not duplicate existing auto tasks', async () => {
      taskStore.set(`auto-clean-room-1-${today}`, {
        id: `auto-clean-room-1-${today}`, title: 'Clean Suite 1',
        category: 'cleaning', completed: false, date: today,
        linkedRoomId: 'room-1', auto: true,
      })
      const tasks = await service.ensureAutoTasks({
        cleaningRoomIds: [{ id: 'room-1', name: 'Suite 1' }],
        preparationRoomIds: [],
        pendingPayments: [],
      })
      const cleanTasks = tasks.filter(t => t.id === `auto-clean-room-1-${today}`)
      expect(cleanTasks).toHaveLength(1)
    })
  })
})
