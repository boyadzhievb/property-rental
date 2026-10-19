import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useState, createContext, useContext, type ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { makeRoom, makeGuest, makeReservation } from '../../test/factories'
import { RoomStatus } from '../../domain/Room'
import type { TodayData } from '../../hooks/useToday'

const testRooms = [
  makeRoom({ id: 'room-1', name: 'Ocean Suite', status: RoomStatus.AVAILABLE }),
  makeRoom({ id: 'room-2', name: 'Mountain View', status: RoomStatus.OCCUPIED }),
]

const testGuests = [
  makeGuest({ id: 'guest-1', name: 'Maria Lopez' }),
]

const testReservations = [
  makeReservation({ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', status: 'Confirmed' }),
]

const todayData: TodayData = {
  arrivals: testReservations,
  departures: [],
  occupiedCount: 1,
  cleaningCount: 0,
  timeline: [{ type: 'Arrival', reservation: testReservations[0], time: '14:00' }],
  rooms: testRooms,
  guests: testGuests,
}

const LoadingCtx = createContext(true)

vi.mock('../../hooks/useToday', () => ({
  useToday: () => {
    const loading = useContext(LoadingCtx)
    return loading
      ? { data: null, loading: true, error: null }
      : { data: todayData, loading: false, error: null }
  },
}))

vi.mock('../../context/PropertyContext', () => ({
  usePropertyContext: () => ({
    propertyName: 'Test Property',
    isConfigured: true,
    loading: false,
    error: null,
    clearError: vi.fn(),
  }),
}))

vi.mock('../../context/ReservationContext', () => ({
  useReservationContext: () => ({
    reservations: testReservations,
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../../context/RoomContext', () => ({
  useRoomContext: () => ({
    rooms: testRooms,
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../../context/PaymentContext', () => ({
  usePaymentContext: () => ({
    payments: [],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../../context/TaskContext', () => ({
  useTaskContext: () => ({
    tasks: [],
    loading: false,
    error: null,
    clearError: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../../services/ReservationService', () => ({
  reservationService: { checkIn: vi.fn(), checkOut: vi.fn() },
}))

vi.mock('../../services/TaskService', () => ({
  taskService: {
    ensureAutoTasks: vi.fn().mockResolvedValue(undefined),
    createTask: vi.fn().mockResolvedValue(undefined),
    toggleTask: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../services/NotificationService', () => ({
  notificationService: { scheduleDailyNotifications: vi.fn() },
}))

vi.mock('../../context/LocaleContext', async () => {
  const englishTranslations = (await import('../../i18n/en')).default
  return {
    useLocale: () => ({
      locale: 'en' as const,
      setLocale: vi.fn(),
      t: englishTranslations,
    }),
  }
})

import TodayView from '../today/TodayView'

function LoadingToggle({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  return (
    <LoadingCtx.Provider value={loading}>
      <button data-testid="finish-loading" onClick={() => setLoading(false)}>load</button>
      {children}
    </LoadingCtx.Provider>
  )
}

describe('TodayView', () => {
  it('renders loading state', () => {
    render(
      <LoadingCtx.Provider value={true}>
        <TodayView />
      </LoadingCtx.Provider>,
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders data state', () => {
    render(
      <LoadingCtx.Provider value={false}>
        <TodayView />
      </LoadingCtx.Provider>,
    )
    expect(screen.getByText('Test Property')).toBeInTheDocument()
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
  })

  it('transitions from loading to loaded without hooks violation', async () => {
    const user = userEvent.setup()
    render(<LoadingToggle><TodayView /></LoadingToggle>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await user.click(screen.getByTestId('finish-loading'))

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
  })
})
