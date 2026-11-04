import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../context/LocaleContext', async () => {
  const germanTranslations = (await import('../../i18n/de')).default
  return { useLocale: () => ({ locale: 'de' as const, setLocale: vi.fn(), t: germanTranslations }) }
})

import ErrorBoundary from '../ErrorBoundary'
import german from '../../i18n/de'

function Broken(): never {
  throw new Error('render failed')
}

describe('ErrorBoundary', () => {
  it('shows the crash screen in the current language', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ErrorBoundary><Broken /></ErrorBoundary>)

    expect(screen.getByText(german.somethingWentWrong)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: german.tryAgain })).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })
})
