import { describe, it, expect } from 'vitest'
import { toCents, fromCents, parseMoneyInput } from '../money'

describe('toCents', () => {
  it.each([
    [33.333, 3333],
    [19.995, 2000],
    [1.005, 101],
    [0.005, 1],
    [100.1, 10010],
    [250, 25000],
    [0.1 + 0.2, 30],
    [499.9, 49990],
    [-19.995, -2000],
  ])('converts %s to %s cents', (amount, expected) => {
    expect(toCents(amount)).toBe(expected)
  })
})

describe('fromCents', () => {
  it('converts back to a decimal amount', () => {
    expect(fromCents(1999)).toBe(19.99)
    expect(fromCents(50000)).toBe(500)
  })
})

describe('parseMoneyInput', () => {
  it('reads a typed amount as cents', () => {
    expect(parseMoneyInput('19.99')).toBe(1999)
    expect(parseMoneyInput('150')).toBe(15000)
  })

  it('is null for text that is not a number', () => {
    expect(parseMoneyInput('')).toBeNull()
    expect(parseMoneyInput('abc')).toBeNull()
  })
})
