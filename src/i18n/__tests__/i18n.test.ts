import { describe, it, expect } from 'vitest'
import en from '../en'
import fr from '../fr'
import de from '../de'
import bg from '../bg'
import el from '../el'

function getKeys(obj: Record<string, any>): string[] {
  return Object.keys(obj).sort()
}

describe('i18n key parity', () => {
  const enKeys = getKeys(en)
  const locales = { fr, de, bg, el }

  for (const [name, translations] of Object.entries(locales)) {
    it(`${name} has the same keys as en`, () => {
      const localeKeys = getKeys(translations)
      const missingInLocale = enKeys.filter(k => !localeKeys.includes(k))
      const extraInLocale = localeKeys.filter(k => !enKeys.includes(k))
      expect(missingInLocale, `Missing in ${name}`).toEqual([])
      expect(extraInLocale, `Extra in ${name}`).toEqual([])
    })
  }
})
