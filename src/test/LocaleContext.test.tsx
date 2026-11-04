import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LocaleProvider, useLocale } from '../context/LocaleContext'
import { LOCALE_LABELS, type Locale } from '../i18n'

function ShowLocale() {
  const { locale } = useLocale()
  return <span data-testid="locale">{locale}</span>
}

describe('LocaleProvider initial locale', () => {
  beforeEach(() => localStorage.clear())

  it.each(Object.keys(LOCALE_LABELS) as Locale[])('restores a saved "%s" after restart', (locale) => {
    localStorage.setItem('app-locale', locale)
    render(<LocaleProvider><ShowLocale /></LocaleProvider>)
    expect(screen.getByTestId('locale')).toHaveTextContent(locale)
  })

  it('falls back to English for an unknown saved value', () => {
    localStorage.setItem('app-locale', 'xx')
    render(<LocaleProvider><ShowLocale /></LocaleProvider>)
    expect(screen.getByTestId('locale')).toHaveTextContent('en')
  })
})
