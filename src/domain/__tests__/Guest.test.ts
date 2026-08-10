import { describe, it, expect } from 'vitest'
import { Guest } from '../Guest'

function makeGuest(overrides: Partial<import('../Guest').GuestData> = {}) {
  return new Guest({
    id: 'g1',
    name: 'Jane Doe',
    phone: '+1234567890',
    email: 'jane@example.com',
    previousStays: 3,
    notes: 'VIP guest',
    ...overrides,
  })
}

describe('Guest', () => {
  it('constructs with given data', () => {
    const guest = makeGuest()
    expect(guest.id).toBe('g1')
    expect(guest.name).toBe('Jane Doe')
    expect(guest.email).toBe('jane@example.com')
  })

  it('fullName returns the name', () => {
    expect(makeGuest({ name: 'John Smith' }).fullName()).toBe('John Smith')
  })

  it('hasStayedBefore returns true when previousStays > 0', () => {
    expect(makeGuest({ previousStays: 3 }).hasStayedBefore()).toBe(true)
  })

  it('hasStayedBefore returns false when previousStays is 0', () => {
    expect(makeGuest({ previousStays: 0 }).hasStayedBefore()).toBe(false)
  })

  it('toData returns a plain object', () => {
    const guest = makeGuest()
    expect(guest.toData()).toEqual({
      id: 'g1',
      name: 'Jane Doe',
      phone: '+1234567890',
      email: 'jane@example.com',
      previousStays: 3,
      notes: 'VIP guest',
    })
  })
})
