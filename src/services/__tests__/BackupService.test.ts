import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackupService } from '../BackupService'

const mockExportBackup = vi.fn()
const mockImportBackup = vi.fn()

vi.mock('../../api/client', () => ({
  exportBackup: (...args: unknown[]) => mockExportBackup(...args),
  importBackup: (...args: unknown[]) => mockImportBackup(...args),
}))

describe('BackupService', () => {
  let service: BackupService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new BackupService()
  })

  describe('export', () => {
    it('delegates to exportBackup from api/client', async () => {
      const fakeBackup = { rooms: [], guests: [], reservations: [] }
      mockExportBackup.mockResolvedValue(fakeBackup)

      const result = await service.export()

      expect(mockExportBackup).toHaveBeenCalledOnce()
      expect(result).toBe(fakeBackup)
    })
  })

  describe('import', () => {
    it('delegates to importBackup from api/client', async () => {
      const fakeData = { rooms: [{ id: 'r1' }] }
      const fakeReport = { imported: { rooms: 1, guests: 0, reservations: 0 }, errors: [] }
      mockImportBackup.mockResolvedValue(fakeReport)

      const result = await service.import(fakeData as any)

      expect(mockImportBackup).toHaveBeenCalledOnce()
      expect(mockImportBackup).toHaveBeenCalledWith(fakeData)
      expect(result).toBe(fakeReport)
    })
  })

  describe('validate', () => {
    it('rejects null', () => {
      const result = service.validate(null)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid file: not a JSON object')
    })

    it('rejects a string', () => {
      const result = service.validate('not an object')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid file: not a JSON object')
    })

    it('rejects a number', () => {
      const result = service.validate(42)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid file: not a JSON object')
    })

    it('rejects an array', () => {
      const result = service.validate([1, 2, 3])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('no recognizable data')
    })

    it('rejects rooms as non-array', () => {
      const result = service.validate({ rooms: 'not-an-array' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('"rooms" must be an array')
    })

    it('rejects guests as non-array', () => {
      const result = service.validate({ guests: 123 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('"guests" must be an array')
    })

    it('rejects reservations as non-array', () => {
      const result = service.validate({ reservations: { id: 'r1' } })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('"reservations" must be an array')
    })

    it('rejects settings as non-object', () => {
      const result = service.validate({ settings: 'bad' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('"settings" must be an object')
    })

    it('rejects settings as null', () => {
      const result = service.validate({ settings: null })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('"settings" must be an object')
    })

    it('rejects object with no recognizable data', () => {
      const result = service.validate({ foo: 'bar', baz: 123 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('no recognizable data')
    })

    it('accepts valid backup with rooms only', () => {
      const data = { rooms: [{ id: 'r1', name: 'Room 1' }] }
      const result = service.validate(data)
      expect(result.valid).toBe(true)
      expect(result.data).toBe(data)
    })

    it('accepts valid backup with guests only', () => {
      const data = { guests: [{ id: 'g1', name: 'Guest 1' }] }
      const result = service.validate(data)
      expect(result.valid).toBe(true)
      expect(result.data).toBe(data)
    })

    it('accepts valid backup with settings only', () => {
      const data = { settings: { propertyName: 'My Hotel' } }
      const result = service.validate(data)
      expect(result.valid).toBe(true)
      expect(result.data).toBe(data)
    })

    it('accepts valid backup with all fields', () => {
      const data = {
        rooms: [{ id: 'r1' }],
        guests: [{ id: 'g1' }],
        reservations: [{ id: 'res1' }],
        settings: { propertyName: 'My Hotel' },
      }
      const result = service.validate(data)
      expect(result.valid).toBe(true)
      expect(result.data).toBe(data)
    })
  })
})
