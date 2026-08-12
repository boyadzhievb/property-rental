import { describe, it, expect } from 'vitest'
import { Task } from '../Task'

function makeTask(overrides: Partial<import('../Task').TaskData> = {}) {
  return new Task({
    id: 'task-1',
    title: 'Clean Room 2',
    category: 'cleaning',
    completed: false,
    date: '2025-06-01',
    linkedRoomId: 'room-2',
    auto: true,
    ...overrides,
  })
}

describe('Task', () => {
  it('constructs with given data', () => {
    const t = makeTask()
    expect(t.id).toBe('task-1')
    expect(t.title).toBe('Clean Room 2')
    expect(t.category).toBe('cleaning')
    expect(t.completed).toBe(false)
    expect(t.date).toBe('2025-06-01')
    expect(t.linkedRoomId).toBe('room-2')
    expect(t.auto).toBe(true)
  })

  describe('complete', () => {
    it('marks task as completed', () => {
      const t = makeTask()
      t.complete()
      expect(t.completed).toBe(true)
    })
  })

  describe('reopen', () => {
    it('marks completed task as not completed', () => {
      const t = makeTask({ completed: true })
      t.reopen()
      expect(t.completed).toBe(false)
    })
  })

  describe('toggle behavior', () => {
    it('can be completed and reopened', () => {
      const t = makeTask()
      expect(t.completed).toBe(false)
      t.complete()
      expect(t.completed).toBe(true)
      t.reopen()
      expect(t.completed).toBe(false)
    })
  })

  it('toData returns a plain object', () => {
    const t = makeTask()
    expect(t.toData()).toEqual({
      id: 'task-1',
      title: 'Clean Room 2',
      category: 'cleaning',
      completed: false,
      date: '2025-06-01',
      linkedRoomId: 'room-2',
      linkedReservationId: undefined,
      linkedGuestId: undefined,
      auto: true,
    })
  })

  it('supports all categories', () => {
    expect(makeTask({ category: 'cleaning' }).category).toBe('cleaning')
    expect(makeTask({ category: 'preparation' }).category).toBe('preparation')
    expect(makeTask({ category: 'payment' }).category).toBe('payment')
    expect(makeTask({ category: 'communication' }).category).toBe('communication')
    expect(makeTask({ category: 'custom' }).category).toBe('custom')
  })

  it('supports optional linked fields', () => {
    const t = makeTask({ linkedRoomId: undefined, linkedReservationId: 'r1', linkedGuestId: 'g1' })
    expect(t.linkedRoomId).toBeUndefined()
    expect(t.linkedReservationId).toBe('r1')
    expect(t.linkedGuestId).toBe('g1')
  })
})
