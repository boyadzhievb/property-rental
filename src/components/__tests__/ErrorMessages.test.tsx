import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { contextErrors, clearFunctions, mockContext } = vi.hoisted(() => {
  const contextErrors: Record<string, string | null> = {}
  const clearFunctions: Record<string, ReturnType<typeof vi.fn>> = {}
  const mockContext = (name: string) => {
    clearFunctions[name] = vi.fn()
    return () => ({ error: contextErrors[name] ?? null, clearError: clearFunctions[name] })
  }
  return { contextErrors, clearFunctions, mockContext }
})

vi.mock('../../context/PropertyContext', () => ({ usePropertyContext: mockContext('property') }))
vi.mock('../../context/RoomContext', () => ({ useRoomContext: mockContext('room') }))
vi.mock('../../context/GuestContext', () => ({ useGuestContext: mockContext('guest') }))
vi.mock('../../context/ReservationContext', () => ({ useReservationContext: mockContext('reservation') }))
vi.mock('../../context/PaymentContext', () => ({ usePaymentContext: mockContext('payment') }))
vi.mock('../../context/TaskContext', () => ({ useTaskContext: mockContext('task') }))
vi.mock('../../context/LocaleContext', async () => {
  const englishTranslations = (await import('../../i18n/en')).default
  return { useLocale: () => ({ locale: 'en' as const, setLocale: vi.fn(), t: englishTranslations }) }
})

import ErrorMessages from '../layout/ErrorMessages'

describe('ErrorMessages', () => {
  it('renders nothing when no context has an error', () => {
    for (const key of Object.keys(contextErrors)) contextErrors[key] = null
    const { container } = render(<ErrorMessages />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each(['property', 'room', 'guest', 'reservation', 'payment', 'task'])('shows and dismisses the %s context error', async (name) => {
    for (const key of Object.keys(contextErrors)) contextErrors[key] = null
    contextErrors[name] = `${name} failed to load`
    const user = userEvent.setup()

    render(<ErrorMessages />)
    expect(screen.getByRole('alert')).toHaveTextContent(`${name} failed to load`)

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(clearFunctions[name]).toHaveBeenCalled()
  })
})
