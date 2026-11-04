import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

describe('SettingsService currency', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    vi.resetModules()
  })

  async function load(languages: string[]) {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
    const client = await import('../api/client')
    const { settingsService } = await import('../services/SettingsService')
    return { client, settingsService }
  }

  it('fills in and saves a currency for an existing user who has none', async () => {
    const { client, settingsService } = await load(['el-GR'])
    await client.api.settings.saveProperty({ name: 'Villa', isConfigured: true })

    const settings = await settingsService.getPropertySettings()

    expect(settings.currency).toBe('EUR')
    expect((await client.api.settings.getProperty()).currency).toBe('EUR')
  })

  it('keeps a saved currency even when the device language changes', async () => {
    const { client, settingsService } = await load(['en-US'])
    await client.api.settings.saveProperty({ name: 'Villa', isConfigured: true, currency: 'GBP' })

    expect((await settingsService.getPropertySettings()).currency).toBe('GBP')
  })

  it('does not save a guess before setup; setup stores the chosen currency', async () => {
    const { client, settingsService } = await load(['de-CH'])

    expect((await settingsService.getPropertySettings()).currency).toBe('CHF')
    expect((await client.api.settings.getProperty()).currency).toBeUndefined()

    await client.configureProperty('Chalet', 2, 'EUR')
    expect((await client.api.settings.getProperty()).currency).toBe('EUR')
  })

  it('changes the currency and rejects unsupported codes', async () => {
    const { client, settingsService } = await load(['en-US'])
    await client.api.settings.saveProperty({ name: 'Villa', isConfigured: true, currency: 'USD' })

    await settingsService.saveCurrency('EUR')
    expect((await client.api.settings.getProperty()).currency).toBe('EUR')

    await expect(settingsService.saveCurrency('XYZ')).rejects.toThrow()
    expect((await client.api.settings.getProperty()).currency).toBe('EUR')
  })

  it('round-trips the currency through backup and restore', async () => {
    const { client } = await load(['en-US'])
    const { backupService } = await import('../services/BackupService')
    await client.api.settings.saveProperty({ name: 'Villa', isConfigured: true, currency: 'CHF' })
    await client.api.rooms.create({ id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 100, maxGuests: 2 })

    const backup = await backupService.export()
    expect(backup.settings).toEqual({ name: 'Villa', currency: 'CHF' })

    await client.api.settings.saveProperty({ currency: 'USD' })
    await backupService.import(backup)
    expect((await client.api.settings.getProperty()).currency).toBe('CHF')
  })

  it('drops an unsupported currency from a backup instead of rejecting it', async () => {
    await load(['en-US'])
    const { backupService } = await import('../services/BackupService')
    const result = backupService.validate({ rooms: [], settings: { name: 'Villa', currency: 'XYZ' } })
    expect(result.valid).toBe(true)
    expect(result.data?.settings).toEqual({ name: 'Villa' })
  })
})
