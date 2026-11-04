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
