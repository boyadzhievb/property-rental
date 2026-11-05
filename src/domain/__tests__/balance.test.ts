import { describe, it, expect } from 'vitest'
import { sumMoney, reservationBalance, groupPaymentsByReservation, totalsByMethod, outstandingBalances } from '../balance'

const payment = (reservationId: string, amount: number, method: 'cash' | 'card' | 'transfer' = 'cash') =>
  ({ id: `${reservationId}-${amount}`, reservationId, amount, method })

describe('sumMoney', () => {
  it('adds amounts without float noise', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(sumMoney([33.33, 33.33, 33.34])).toBe(100)
  })

  it('is zero for no amounts', () => {
    expect(sumMoney([])).toBe(0)
  })
})

describe('reservationBalance', () => {
  it('returns total, paid and the remaining balance rounded to cents', () => {
    expect(500 - 499.9).not.toBe(0.1)
    expect(reservationBalance(500, [payment('r1', 499.9)])).toEqual({ total: 500, paid: 499.9, balance: 0.1 })
  })

  it('is fully paid at exactly zero, even after split payments', () => {
    const balance = reservationBalance(100, [payment('r1', 33.33), payment('r1', 33.33), payment('r1', 33.34)])
    expect(balance.balance).toBe(0)
  })

  it('has the full price as balance when nothing is paid', () => {
    expect(reservationBalance(250, [])).toEqual({ total: 250, paid: 0, balance: 250 })
  })
})

describe('groupPaymentsByReservation', () => {
  it('groups payments by reservation and keeps their order', () => {
    const first = payment('r1', 10)
    const second = payment('r2', 20)
    const third = payment('r1', 30)
    const grouped = groupPaymentsByReservation([first, second, third])
    expect(grouped.get('r1')).toEqual([first, third])
    expect(grouped.get('r2')).toEqual([second])
    expect(grouped.get('r3')).toBeUndefined()
  })
})

describe('totalsByMethod', () => {
  it('sums each method, rounded, with zero for unused methods', () => {
    expect(totalsByMethod([payment('r1', 0.1), payment('r2', 0.2), payment('r3', 5, 'card')]))
      .toEqual({ cash: 0.3, card: 5, transfer: 0 })
  })
})

describe('outstandingBalances', () => {
  const reservation = (id: string, price: number, status: 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled' = 'Confirmed') =>
    ({ id, price, status })

  it('lists reservations with money still owed, largest balance first', () => {
    const result = outstandingBalances(
      [reservation('small', 100), reservation('large', 900), reservation('paid', 200)],
      [payment('small', 50), payment('large', 100), payment('paid', 200)],
    )
    expect(result.map(item => [item.reservation.id, item.paid, item.balance])).toEqual([
      ['large', 100, 800],
      ['small', 50, 50],
    ])
  })

  it('leaves out cancelled reservations', () => {
    expect(outstandingBalances([reservation('gone', 300, 'Cancelled')], [])).toEqual([])
  })
})
