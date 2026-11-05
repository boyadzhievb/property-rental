import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

const existingRoom = { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNightCents: 12000, maxGuests: 2 }
const existingGuest = { id: 'guest-1', name: 'Maria Ivanova', phone: '+359888123456', email: 'maria@example.com', previousStays: 1, notes: '' }

async function loadModules() {
  const client = await import('../api/client')
  const { backupService, BackupImportError } = await import('../services/BackupService')
  await client.api.rooms.create(existingRoom as Parameters<typeof client.api.rooms.create>[0])
  await client.api.guests.create(existingGuest)
  return { client, backupService, BackupImportError }
}

describe('BackupService.import safety', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('refuses a settings-only backup instead of erasing existing data', async () => {
    const { client, backupService } = await loadModules()

    await expect(backupService.import({ settings: { id: 'property', name: 'X', isConfigured: true } })).rejects.toMatchObject({ code: 'wouldEraseData' })

    expect(await client.api.rooms.getAll()).toHaveLength(1)
    expect(await client.api.guests.getAll()).toHaveLength(1)
  })

  it('refuses a backup with invalid records unless partial import is allowed', async () => {
    const { client, backupService } = await loadModules()
    const backup = { rooms: [{ id: 'room-2', name: 'Suite', status: 'Available', pricePerNightCents: 9000, maxGuests: 2 }, { id: 'broken' }] }

    await expect(backupService.import(backup as never)).rejects.toMatchObject({ code: 'invalidRecords' })
    expect((await client.api.rooms.getAll()).map(room => room.id)).toEqual(['room-1'])

    const report = await backupService.import(backup as never, { allowPartial: true })
    expect(report.total).toBe(1)
    expect((await client.api.rooms.getAll()).map(room => room.id)).toEqual(['room-2'])
  })

  it('imports a valid backup over existing data', async () => {
    const { client, backupService } = await loadModules()

    await backupService.import({ rooms: [{ ...existingRoom, id: 'room-9', status: 'Available' } as never] })

    expect((await client.api.rooms.getAll()).map(room => room.id)).toEqual(['room-9'])
  })

  it('allows any valid import into an empty database', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')

    await backupService.import({ settings: { id: 'property', name: 'Fresh', isConfigured: true } })

    expect((await client.api.settings.getProperty()).name).toBe('Fresh')
  })

  it('analyze reports current and incoming counts without writing', async () => {
    const { client, backupService } = await loadModules()

    const plan = await backupService.analyze({ rooms: [{ ...existingRoom, id: 'room-2' } as never, { id: 'bad' } as never] })

    expect(plan.current.rooms).toBe(1)
    expect(plan.current.guests).toBe(1)
    expect(plan.incoming.rooms).toBe(1)
    expect(plan.incoming.guests).toBe(0)
    expect(plan.skipped).toBe(1)
    expect(plan.wouldEraseData).toBe(false)
    expect((await client.api.rooms.getAll()).map(room => room.id)).toEqual(['room-1'])
  })
})

describe('backup format validation', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
    localStorage.clear()
  })

  it('export stamps the current schemaVersion', async () => {
    const { backupService, BACKUP_SCHEMA_VERSION } = await import('../services/BackupService')
    const backup = await backupService.export()
    expect(BACKUP_SCHEMA_VERSION).toBe(2)
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION)
  })

  it('rejects a backup from a newer schemaVersion', async () => {
    const { backupService } = await import('../services/BackupService')
    const result = backupService.validate({ schemaVersion: 99, rooms: [] })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('newer version')
  })

  it('accepts a legacy backup without schemaVersion', async () => {
    const { backupService } = await import('../services/BackupService')
    expect(backupService.validate({ rooms: [] }).valid).toBe(true)
  })

  it.each(['payments', 'tasks'])('rejects %s as non-array', async (key) => {
    const { backupService } = await import('../services/BackupService')
    const result = backupService.validate({ rooms: [], [key]: 'nope' })
    expect(result.valid).toBe(false)
    expect(result.error).toContain(`"${key}" must be an array`)
  })

  it('import rejects a malformed envelope even without a prior validate call', async () => {
    const { backupService } = await import('../services/BackupService')
    await expect(backupService.import({ rooms: 'nope' } as never)).rejects.toMatchObject({ code: 'invalidFormat' })
  })

  it('persists parsed records, stripping unknown fields', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')

    await backupService.import({ rooms: [{ ...existingRoom, injected: '<script>' } as never] })

    const [storedRoom] = await client.api.rooms.getAll()
    expect(storedRoom).toEqual(existingRoom)
    expect(storedRoom).not.toHaveProperty('injected')
  })

  it('stores only the validated property name from settings', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')

    await backupService.import({ rooms: [existingRoom as never], settings: { id: 'evil', name: 'Villa', isConfigured: false, extra: 1 } as never })

    expect(await client.api.settings.getProperty()).toEqual({ id: 'property', name: 'Villa', isConfigured: true })
  })

  it('writes only valid preferences to localStorage', async () => {
    const { backupService } = await import('../services/BackupService')

    await backupService.import({ rooms: [existingRoom as never], preferences: { locale: 'xx', theme: 'dark', notificationsEnabled: 'yes' } as never })

    expect(localStorage.getItem('app-locale')).toBeNull()
    expect(localStorage.getItem('theme-mode')).toBe('dark')
    expect(localStorage.getItem('notifications-enabled')).toBeNull()
  })
})

describe('referential checks on import', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  const reservation = (id: string, roomId: string, guestId: string) => ({
    id, roomId, guestId, arrivalDate: '2026-11-10', departureDate: '2026-11-12', guestsCount: 1, status: 'Confirmed', priceCents: 20000,
  })
  const payment = (id: string, reservationId: string) => ({ id, reservationId, amountCents: 5000, date: '2026-11-10', method: 'cash', note: '' })
  const task = (id: string, links: Record<string, string>) => ({ id, title: 'Clean', category: 'cleaning', completed: false, date: '2026-11-10', auto: false, ...links })

  const backup = {
    rooms: [existingRoom],
    guests: [existingGuest],
    reservations: [
      reservation('res-ok', 'room-1', 'guest-1'),
      reservation('res-no-room', 'room-missing', 'guest-1'),
      reservation('res-no-guest', 'room-1', 'guest-missing'),
    ],
    payments: [payment('pay-ok', 'res-ok'), payment('pay-orphan', 'res-no-room')],
    tasks: [
      task('task-ok', { linkedRoomId: 'room-1', linkedReservationId: 'res-ok', linkedGuestId: 'guest-1' }),
      task('task-unlinked', {}),
      task('task-no-room', { linkedRoomId: 'room-missing' }),
      task('task-no-reservation', { linkedReservationId: 'res-no-guest' }),
    ],
  }

  it('counts records that reference missing entities as skipped', async () => {
    const { backupService } = await import('../services/BackupService')

    const plan = await backupService.analyze(backup)

    expect(plan.incoming).toEqual({ rooms: 1, guests: 1, reservations: 1, payments: 1, tasks: 2 })
    expect(plan.skipped).toBe(5)
  })

  it('refuses orphaned records by default and imports only consistent records when partial import is allowed', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')

    await expect(backupService.import(backup)).rejects.toMatchObject({ code: 'invalidRecords' })

    const report = await backupService.import(backup, { allowPartial: true })

    expect((await client.api.reservations.getAll()).map(item => item.id)).toEqual(['res-ok'])
    expect((await client.api.payments.getAll()).map(item => item.id)).toEqual(['pay-ok'])
    expect((await client.api.tasks.getAll()).map(item => item.id).sort()).toEqual(['task-ok', 'task-unlinked'])
    expect(report.skippedDetails.reservations.map(item => item.id)).toEqual(['res-no-room', 'res-no-guest'])
    expect(report.skippedDetails.reservations[0].error).toContain('room-missing')
    expect(report.skippedDetails.payments[0]).toMatchObject({ id: 'pay-orphan', index: 1 })
    expect(report.total).toBe(5)
  })
})

describe('payment amounts on restore', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  it('upgrades a format-1 backup: decimal prices and amounts become cents', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')

    const report = await backupService.import({
      schemaVersion: 1,
      rooms: [{ id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 120.5, maxGuests: 2 }],
      guests: [existingGuest],
      reservations: [{ id: 'res-1', roomId: 'room-1', guestId: 'guest-1', arrivalDate: '2026-11-10', departureDate: '2026-11-12', guestsCount: 1, status: 'Confirmed', price: 241 }],
      // Old versions saved amounts as typed, e.g. 33.333; it is rounded instead of skipped.
      payments: [{ id: 'pay-1', reservationId: 'res-1', amount: 33.333, date: '2026-11-10', method: 'cash', note: '' }],
    })

    expect(report.total).toBe(0)
    expect((await client.api.rooms.getAll()).map(room => room.pricePerNightCents)).toEqual([12050])
    expect((await client.api.reservations.getAll()).map(reservation => reservation.priceCents)).toEqual([24100])
    expect((await client.api.payments.getAll()).map(payment => payment.amountCents)).toEqual([3333])
  })

  it('treats a backup without schemaVersion as format 1', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')

    await backupService.import({ rooms: [{ id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 99.99, maxGuests: 2 }] })

    expect((await client.api.rooms.getAll()).map(room => room.pricePerNightCents)).toEqual([9999])
  })

  it('does not reinterpret a format-2 backup, and skips decimal fields there', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')

    const report = await backupService.import({
      schemaVersion: 2,
      rooms: [
        { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNightCents: 12050, maxGuests: 2 },
        { id: 'room-2', name: 'Old', status: 'Available', pricePerNight: 120.5, maxGuests: 2 },
      ],
    }, { allowPartial: true })

    expect((await client.api.rooms.getAll()).map(room => room.pricePerNightCents)).toEqual([12050])
    expect(report.skipped.rooms).toBe(1)
  })

  it('round-trips money through export and import unchanged', async () => {
    const client = await import('../api/client')
    const { backupService } = await import('../services/BackupService')
    await client.api.rooms.create({ ...existingRoom, status: 'Available', pricePerNightCents: 12050 })

    const backup = await backupService.export()
    expect(backup.schemaVersion).toBe(2)
    await backupService.import(backup)

    expect((await client.api.rooms.getAll()).map(room => room.pricePerNightCents)).toEqual([12050])
  })
})
