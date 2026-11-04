import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

const existingRoom = { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 120, maxGuests: 2 }
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
    const backup = { rooms: [{ id: 'room-2', name: 'Suite', status: 'Available', pricePerNight: 90, maxGuests: 2 }, { id: 'broken' }] }

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
    expect(BACKUP_SCHEMA_VERSION).toBe(1)
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
