import { describe, it, expect } from 'vitest'
import { roundToCents } from '../money'

describe('roundToCents', () => {
  it.each([
    [33.333, 33.33],
    [19.995, 20],
    [1.005, 1.01],
    [0.005, 0.01],
    [100.1, 100.1],
    [250, 250],
    [0.1 + 0.2, 0.3],
  ])('rounds %s to %s', (amount, expected) => {
    expect(roundToCents(amount)).toBe(expected)
  })
})
