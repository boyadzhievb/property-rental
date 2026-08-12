import { describe, it, expect } from 'vitest'
import { Payment } from '../Payment'

function makePayment(overrides: Partial<import('../Payment').PaymentData> = {}) {
  return new Payment({
    id: 'pay-1',
    reservationId: 'r1',
    amount: 200,
    date: '2025-06-01',
    method: 'cash',
    note: 'Advance deposit',
    ...overrides,
  })
}

describe('Payment', () => {
  it('constructs with given data', () => {
    const p = makePayment()
    expect(p.id).toBe('pay-1')
    expect(p.reservationId).toBe('r1')
    expect(p.amount).toBe(200)
    expect(p.date).toBe('2025-06-01')
    expect(p.method).toBe('cash')
    expect(p.note).toBe('Advance deposit')
  })

  it('accepts all valid methods', () => {
    expect(makePayment({ method: 'cash' }).method).toBe('cash')
    expect(makePayment({ method: 'card' }).method).toBe('card')
    expect(makePayment({ method: 'transfer' }).method).toBe('transfer')
  })

  it('toData returns a plain object', () => {
    const p = makePayment()
    expect(p.toData()).toEqual({
      id: 'pay-1',
      reservationId: 'r1',
      amount: 200,
      date: '2025-06-01',
      method: 'cash',
      note: 'Advance deposit',
    })
  })
})
