import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn(),
    schedule: vi.fn(),
    removeAllDeliveredNotifications: vi.fn(),
    getPending: vi.fn(async () => ({ notifications: [] })),
    cancel: vi.fn(),
  },
}))

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { NotificationService } from '../NotificationService'
import { format } from 'date-fns'

const today = format(new Date(), 'yyyy-MM-dd')

/* Node 22's built-in localStorage lacks clear(), so provide a full mock. */
const localStorageStore = new Map<string, string>()
const localStorageMock: Storage = {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => { localStorageStore.set(key, value) },
  removeItem: (key: string) => { localStorageStore.delete(key) },
  clear: () => { localStorageStore.clear() },
  get length() { return localStorageStore.size },
  key: (index: number) => [...localStorageStore.keys()][index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

function makeTranslations() {
  return {
    notificationArrivalTitle: 'Arrival',
    notificationArrivalBody: '{guest} arriving in {room}',
    notificationDepartureTitle: 'Departure',
    notificationDepartureBody: '{guest} departing from {room}',
    notificationCleaningTitle: 'Cleaning',
    notificationCleaningBody: '{room} needs cleaning',
    notificationPaymentTitle: 'Payment',
    notificationPaymentBody: 'Check payment from {guest}',
  }
}

describe('NotificationService', () => {
  let service: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new NotificationService()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'granted' })
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({ notifications: [] })
    vi.mocked(LocalNotifications.removeAllDeliveredNotifications).mockResolvedValue(undefined)
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({ notifications: [] })
    vi.mocked(LocalNotifications.cancel).mockResolvedValue(undefined)
    localStorageStore.clear()
  })

  afterEach(() => {
    localStorageStore.clear()
  })

  describe('isEnabled', () => {
    it('returns false when not on native platform', async () => {
      const result = await service.isEnabled()
      expect(result).toBe(false)
    })

    it('returns true when native and localStorage has true', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      localStorage.setItem('notifications-enabled', 'true')
      const result = await service.isEnabled()
      expect(result).toBe(true)
    })

    it('returns false when native but localStorage is false', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      localStorage.setItem('notifications-enabled', 'false')
      const result = await service.isEnabled()
      expect(result).toBe(false)
    })

    it('returns false when native but localStorage key is missing', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      const result = await service.isEnabled()
      expect(result).toBe(false)
    })
  })

  describe('setEnabled', () => {
    it('returns false when not on native platform', async () => {
      const result = await service.setEnabled(true)
      expect(result).toBe(false)
    })

    it('enables notifications when native and permission granted', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'granted' })
      const result = await service.setEnabled(true)
      expect(result).toBe(true)
      expect(LocalNotifications.requestPermissions).toHaveBeenCalled()
      expect(localStorage.getItem('notifications-enabled')).toBe('true')
    })

    it('returns false when native but permission denied', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'denied' })
      const result = await service.setEnabled(true)
      expect(result).toBe(false)
    })

    it('disables notifications, removes delivered, clears scheduled flag', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      localStorage.setItem(`notifications-scheduled-${today}`, 'true')
      const result = await service.setEnabled(false)
      expect(result).toBe(false)
      expect(localStorage.getItem('notifications-enabled')).toBe('false')
      expect(LocalNotifications.removeAllDeliveredNotifications).toHaveBeenCalled()
      expect(localStorage.getItem(`notifications-scheduled-${today}`)).toBeNull()
    })

    it('cancels pending notifications when disabling', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      vi.mocked(LocalNotifications.getPending).mockResolvedValue({
        notifications: [{ id: 1, title: 'test', body: 'test' }],
      })
      await service.setEnabled(false)
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({
        notifications: [{ id: 1, title: 'test', body: 'test' }],
      })
    })
  })

  describe('scheduleDailyNotifications', () => {
    it('does nothing when notifications are not enabled', async () => {
      await service.scheduleDailyNotifications({
        arrivals: [{ guestName: 'Alice', roomName: 'Suite 1' }],
        departures: [],
        cleaningRooms: [],
        pendingPayments: [],
        translations: makeTranslations(),
      })
      expect(LocalNotifications.schedule).not.toHaveBeenCalled()
    })

    it('skips scheduling if already scheduled today', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      localStorage.setItem('notifications-enabled', 'true')
      localStorage.setItem(`notifications-scheduled-${today}`, 'true')
      await service.scheduleDailyNotifications({
        arrivals: [{ guestName: 'Alice', roomName: 'Suite 1' }],
        departures: [],
        cleaningRooms: [],
        pendingPayments: [],
        translations: makeTranslations(),
      })
      expect(LocalNotifications.schedule).not.toHaveBeenCalled()
    })

    it('schedules notifications when enabled with arrivals and departures', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      localStorage.setItem('notifications-enabled', 'true')
      await service.scheduleDailyNotifications({
        arrivals: [{ guestName: 'Alice', roomName: 'Suite 1' }],
        departures: [{ guestName: 'Bob', roomName: 'Suite 2' }],
        cleaningRooms: [{ roomName: 'Suite 3' }],
        pendingPayments: [{ guestName: 'Carol' }],
        translations: makeTranslations(),
      })
      expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1)
      const scheduleCall = vi.mocked(LocalNotifications.schedule).mock.calls[0][0]
      expect(scheduleCall.notifications).toHaveLength(4)
      expect(scheduleCall.notifications[0].title).toBe('Arrival')
      expect(scheduleCall.notifications[0].body).toContain('Alice')
      expect(scheduleCall.notifications[1].title).toBe('Departure')
      expect(scheduleCall.notifications[1].body).toContain('Bob')
      expect(scheduleCall.notifications[2].title).toBe('Cleaning')
      expect(scheduleCall.notifications[2].body).toContain('Suite 3')
      expect(scheduleCall.notifications[3].title).toBe('Payment')
      expect(scheduleCall.notifications[3].body).toContain('Carol')
      expect(localStorage.getItem(`notifications-scheduled-${today}`)).toBe('true')
    })

    it('does not call schedule when there are no notifications to send', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      localStorage.setItem('notifications-enabled', 'true')
      await service.scheduleDailyNotifications({
        arrivals: [],
        departures: [],
        cleaningRooms: [],
        pendingPayments: [],
        translations: makeTranslations(),
      })
      expect(LocalNotifications.schedule).not.toHaveBeenCalled()
      expect(localStorage.getItem(`notifications-scheduled-${today}`)).toBe('true')
    })
  })
})
