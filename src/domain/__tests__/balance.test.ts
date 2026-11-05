import { describe, it, expect } from 'vitest'
import { sumCents, reservationBalance, groupPaymentsByReservation, totalsByMethod, outstandingBalances } from '../balance'

const payment = (reservationId: string, amountCents: number, method: 'cash' | 'card' | 'transfer' = 'cash') =>
  ({ id: `${reservationId}-${amountCents}`, reservationId, amountCents, method })

describe('sumCents', () => {
  it('adds amounts exactly', () => {
    expect(sumCents([10, 20])).toBe(30)
    expect(sumCents([3333, 3333, 3334])).toBe(10000)
  })

  it('is zero for no amounts', () => {
    expect(sumCents([])).toBe(0)
  })
})

describe('reservationBalance', () => {
  it('returns total, paid and the remaining balance', () => {
    expect(reservationBalance(50000, [payment('r1', 49990)])).toEqual({ totalCents: 50000, paidCents: 49990, balanceCents: 10 })
  })

  it('is fully paid at exactly zero after split payments', () => {
    const balance = reservationBalance(10000, [payment('r1', 3333), payment('r1', 3333), payment('r1', 3334)])
    expect(balance.balanceCents).toBe(0)
  })

  it('has the full price as balance when nothing is paid', () => {
    expect(reservationBalance(25000, [])).toEqual({ totalCents: 25000, paidCents: 0, balanceCents: 25000 })
  })
})

describe('groupPaymentsByReservation', () => {
  it('groups payments by reservation and keeps their order', () => {
    const first = payment('r1', 1000)
    const second = payment('r2', 2000)
    const third = payment('r1', 3000)
    const grouped = groupPaymentsByReservation([first, second, third])
    expect(grouped.get('r1')).toEqual([first, third])
    expect(grouped.get('r2')).toEqual([second])
    expect(grouped.get('r3')).toBeUndefined()
  })
})

describe('totalsByMethod', () => {
  it('sums each method, with zero for unused methods', () => {
    expect(totalsByMethod([payment('r1', 10), payment('r2', 20), payment('r3', 500, 'card')]))
      .toEqual({ cash: 30, card: 500, transfer: 0 })
  })
})

describe('outstandingBalances', () => {
  const reservation = (id: string, priceCents: number, status: 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled' = 'Confirmed') =>
    ({ id, priceCents, status })

  it('lists reservations with money still owed, largest balance first', () => {
    const result = outstandingBalances(
      [reservation('small', 10000), reservation('large', 90000), reservation('paid', 20000)],
      [payment('small', 5000), payment('large', 10000), payment('paid', 20000)],
    )
    expect(result.map(item => [item.reservation.id, item.paidCents, item.balanceCents])).toEqual([
      ['large', 10000, 80000],
      ['small', 5000, 5000],
    ])
  })

  it('leaves out cancelled reservations', () => {
    expect(outstandingBalances([reservation('gone', 30000, 'Cancelled')], [])).toEqual([])
  })
})
