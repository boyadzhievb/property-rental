import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BackupData } from '../api/client'

const mockExportBackup = vi.fn()
const mockImportBackup = vi.fn()

vi.mock('../api/client', () => ({
  exportBackup: (...args: unknown[]) => mockExportBackup(...args),
  importBackup: (...args: unknown[]) => mockImportBackup(...args),
}))

import { BackupRepository, backupRepository } from '../repositories/BackupRepository'

describe('BackupRepository', () => {
  beforeEach(() => {
    mockExportBackup.mockReset()
    mockImportBackup.mockReset()
  })

  describe('exportAll', () => {
    it('delegates to api/client exportBackup', async () => {
      const backupData: BackupData = {
        rooms: [{ id: 'room-1', name: 'Suite', status: 'Available', pricePerNight: 100, maxGuests: 2 }],
        guests: [],
        reservations: [],
        payments: [],
        tasks: [],
      }
      mockExportBackup.mockResolvedValue(backupData)

      const repository = new BackupRepository()
      const result = await repository.exportAll()

      expect(mockExportBackup).toHaveBeenCalledTimes(1)
      expect(result).toBe(backupData)
    })

    it('returns the full backup data from exportBackup', async () => {
      const backupData: BackupData = {
        rooms: [
          { id: 'room-1', name: 'Deluxe', status: 'Available', pricePerNight: 200, maxGuests: 4 },
          { id: 'room-2', name: 'Standard', status: 'Occupied', pricePerNight: 100, maxGuests: 2 },
        ],
        guests: [
          { id: 'guest-1', name: 'Maria Ivanova', phone: '+359888123456', email: 'maria@example.com', previousStays: 3, notes: '' },
        ],
        reservations: [],
        payments: [],
        tasks: [],
      }
      mockExportBackup.mockResolvedValue(backupData)

      const repository = new BackupRepository()
      const result = await repository.exportAll()

      expect(result.rooms).toHaveLength(2)
      expect(result.guests).toHaveLength(1)
      expect(result.rooms![0].name).toBe('Deluxe')
    })

    it('propagates errors from exportBackup', async () => {
      mockExportBackup.mockRejectedValue(new Error('IndexedDB unavailable'))

      const repository = new BackupRepository()
      await expect(repository.exportAll()).rejects.toThrow('IndexedDB unavailable')
    })
  })

  describe('importAll', () => {
    it('delegates to api/client importBackup with the provided data', async () => {
      const backupData: BackupData = {
        rooms: [{ id: 'room-1', name: 'Suite', status: 'Available', pricePerNight: 100, maxGuests: 2 }],
        guests: [],
        reservations: [],
        payments: [],
        tasks: [],
      }
      mockImportBackup.mockResolvedValue(undefined)

      const repository = new BackupRepository()
      await repository.importAll(backupData)

      expect(mockImportBackup).toHaveBeenCalledTimes(1)
      expect(mockImportBackup).toHaveBeenCalledWith(backupData)
    })

    it('propagates errors from importBackup', async () => {
      const backupData: BackupData = { rooms: [], guests: [], reservations: [], payments: [], tasks: [] }
      mockImportBackup.mockRejectedValue(new Error('Import failed: corrupt data'))

      const repository = new BackupRepository()
      await expect(repository.importAll(backupData)).rejects.toThrow('Import failed: corrupt data')
    })
  })

  describe('singleton instance', () => {
    it('exports a backupRepository singleton', () => {
      expect(backupRepository).toBeInstanceOf(BackupRepository)
    })

    it('singleton delegates exportAll to api/client', async () => {
      const backupData: BackupData = { rooms: [], guests: [], reservations: [], payments: [], tasks: [] }
      mockExportBackup.mockResolvedValue(backupData)

      const result = await backupRepository.exportAll()

      expect(mockExportBackup).toHaveBeenCalled()
      expect(result).toBe(backupData)
    })

    it('singleton delegates importAll to api/client', async () => {
      const backupData: BackupData = { rooms: [], guests: [], reservations: [], payments: [], tasks: [] }
      mockImportBackup.mockResolvedValue(undefined)

      await backupRepository.importAll(backupData)

      expect(mockImportBackup).toHaveBeenCalledWith(backupData)
    })
  })
})
