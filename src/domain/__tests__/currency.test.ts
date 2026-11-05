import { describe, it, expect } from 'vitest'
import { SUPPORTED_CURRENCIES, currencyForRegion, currencyLabel, detectCurrency, formatMoney } from '../currency'

describe('currencyForRegion', () => {
  it.each([
    ['BG', 'EUR'], ['GR', 'EUR'], ['DE', 'EUR'], ['FR', 'EUR'], ['ES', 'EUR'], ['HR', 'EUR'],
    ['US', 'USD'], ['GB', 'GBP'], ['CH', 'CHF'], ['RO', 'RON'], ['PL', 'PLN'], ['TR', 'TRY'],
  ])('%s → %s', (region, currency) => {
    expect(currencyForRegion(region)).toBe(currency)
  })

  it('falls back to USD for an unknown region, matching the old $ display', () => {
    expect(currencyForRegion('JP')).toBe('USD')
    expect(currencyForRegion(undefined)).toBe('USD')
  })

  it('only ever returns a supported currency', () => {
    for (const region of ['BG', 'US', 'GB', 'SE', 'NO', 'DK', 'CZ', 'HU', 'CA', 'AU', 'ZZ']) {
      expect(SUPPORTED_CURRENCIES).toContain(currencyForRegion(region))
    }
  })
})

describe('detectCurrency', () => {
  it('uses the region of the first preferred language that has one', () => {
    expect(detectCurrency(['de-CH', 'de'])).toBe('CHF')
    expect(detectCurrency(['en-GB'])).toBe('GBP')
  })

  it('infers the likely region of a bare language tag', () => {
    expect(detectCurrency(['bg'])).toBe('EUR')
    expect(detectCurrency(['el'])).toBe('EUR')
    expect(detectCurrency(['en'])).toBe('USD')
  })

  it('ignores malformed tags', () => {
    expect(detectCurrency(['not a locale!!', 'fr-FR'])).toBe('EUR')
    expect(detectCurrency([])).toBe('USD')
  })
})

describe('formatMoney', () => {
  it('formats cents: whole amounts without decimals, others with two', () => {
    expect(formatMoney(50000, 'USD', 'en')).toBe('$500')
    expect(formatMoney(3330, 'USD', 'en')).toBe('$33.30')
    expect(formatMoney(10, 'USD', 'en')).toBe('$0.10')
  })

  it('follows the language’s conventions', () => {
    expect(formatMoney(123450, 'EUR', 'de')).toBe('1.234,50 €')
    expect(formatMoney(123450, 'EUR', 'en')).toBe('€1,234.50')
  })
})

describe('currencyLabel', () => {
  it('names the currency in the given language', () => {
    expect(currencyLabel('EUR', 'en')).toBe('EUR · Euro')
    expect(currencyLabel('EUR', 'de')).toBe('EUR · Euro')
    expect(currencyLabel('CHF', 'fr')).toBe('CHF · franc suisse')
  })
})
