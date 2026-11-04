import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackupService } from '../BackupService'

const mockExportAll = vi.fn()
const mockImportAll = vi.fn()

vi.mock('../../repositories/BackupRepository', () => ({
  backupRepository: {
    exportAll: (...args: unknown[]) => mockExportAll(...args),
    importAll: (...args: unknown[]) => mockImportAll(...args),
  },
}))

describe('BackupService', () => {
  let service: BackupService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new BackupService()
  })

  describe('export', () => {
    it('delegates to backupRepository.exportAll', async () => {
      const fakeBackup = { rooms: [], guests: [], reservations: [] }
      mockExportAll.mockResolvedValue(fakeBackup)

      const result = await service.export()

      expect(mockExportAll).toHaveBeenCalledOnce()
      expect(result).toBe(fakeBackup)
    })
  })

  describe('import', () => {
    it('passes the parsed backup to backupRepository.importAll and returns a report', async () => {
      const fakeData = { rooms: [{ id: 'r1', name: 'Suite', status: 'Available', pricePerNight: 100, maxGuests: 2 }] }
      mockExportAll.mockResolvedValue({})
      mockImportAll.mockResolvedValue(undefined)

      const result = await service.import(fakeData)

      expect(mockImportAll).toHaveBeenCalledOnce()
      expect(mockImportAll).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: 1, rooms: fakeData.rooms, guests: [] }))
      expect(result.total).toBe(0)
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
      expect(result.data).toEqual(data)
    })

    it('accepts valid backup with guests only', () => {
      const data = { guests: [{ id: 'g1', name: 'Guest 1' }] }
      const result = service.validate(data)
      expect(result.valid).toBe(true)
      expect(result.data).toEqual(data)
    })

    it('accepts valid backup with settings only', () => {
      const data = { settings: { name: 'My Hotel', propertyName: 'stripped' } }
      const result = service.validate(data)
      expect(result.valid).toBe(true)
      expect(result.data).toEqual({ settings: { name: 'My Hotel' } })
    })

    it('accepts valid backup with all fields', () => {
      const data = {
        rooms: [{ id: 'r1' }],
        guests: [{ id: 'g1' }],
        reservations: [{ id: 'res1' }],
        settings: { name: 'My Hotel' },
      }
      const result = service.validate(data)
      expect(result.valid).toBe(true)
      expect(result.data).toEqual(data)
    })
  })
})
