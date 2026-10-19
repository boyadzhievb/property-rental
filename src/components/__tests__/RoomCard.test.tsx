import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Room, RoomStatus } from '../../domain/Room'
import { makeRoom } from '../../test/factories'

const mockUpdateRoom = vi.fn()
const mockUpdateRoomStatus = vi.fn()

vi.mock('../../services/RoomService', () => ({
  roomService: {
    updateRoom: (...args: unknown[]) => mockUpdateRoom(...args),
    updateRoomStatus: (...args: unknown[]) => mockUpdateRoomStatus(...args),
  },
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

import RoomCard from '../rooms/RoomCard'

describe('RoomCard', () => {
  const onUpdated = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('status badge rendering', () => {
    it('renders the room name and price', () => {
      const room = makeRoom({ name: 'Ocean Suite', pricePerNight: 150, maxGuests: 3 })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      expect(screen.getByText('Ocean Suite')).toBeInTheDocument()
      expect(screen.getByText('$150')).toBeInTheDocument()
      expect(screen.getByText('3 guests max')).toBeInTheDocument()
    })

    it('shows "Mark as Available" badge for an available room', () => {
      const room = makeRoom({ status: RoomStatus.AVAILABLE })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      expect(screen.getByText('Mark as Available')).toBeInTheDocument()
    })

    it('shows "Occupied" badge for an occupied room', () => {
      const room = makeRoom({ status: RoomStatus.OCCUPIED })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      expect(screen.getByText('Occupied')).toBeInTheDocument()
    })

    it('shows "Cleaning" badge for a room in cleaning status', () => {
      const room = makeRoom({ status: RoomStatus.CLEANING })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      expect(screen.getByText('Cleaning')).toBeInTheDocument()
    })

    it('shows "Mark for Maintenance" badge for a room in maintenance status', () => {
      const room = makeRoom({ status: RoomStatus.MAINTENANCE })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      // The status label for maintenance is 'Mark for Maintenance'
      // It appears both as badge and as the action button for available rooms
      // For a maintenance room, the badge text is t.markForMaintenance
      expect(screen.getAllByText('Mark for Maintenance').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('action button visibility', () => {
    it('shows "Mark for Maintenance" button when room is available', () => {
      const room = makeRoom({ status: RoomStatus.AVAILABLE })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      const maintenanceButton = screen.getByRole('button', { name: /Mark for Maintenance/i })
      expect(maintenanceButton).toBeInTheDocument()
    })

    it('shows "Mark as Cleaned" button when room is in cleaning status', () => {
      const room = makeRoom({ status: RoomStatus.CLEANING })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      const cleanButton = screen.getByRole('button', { name: /Mark as Cleaned/i })
      expect(cleanButton).toBeInTheDocument()
    })

    it('shows "Mark as Available" button when room is in maintenance status', () => {
      const room = makeRoom({ status: RoomStatus.MAINTENANCE })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      const availableButton = screen.getByRole('button', { name: /Mark as Available/i })
      expect(availableButton).toBeInTheDocument()
    })

    it('does not show any action button when room is occupied', () => {
      const room = makeRoom({ status: RoomStatus.OCCUPIED })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      expect(screen.queryByRole('button', { name: /Mark as Cleaned/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Mark for Maintenance/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Mark as Available/i })).not.toBeInTheDocument()
    })
  })

  describe('action button interactions', () => {
    it('calls roomService.updateRoomStatus with "clean" when Mark as Cleaned is clicked', async () => {
      const user = userEvent.setup()
      mockUpdateRoomStatus.mockResolvedValue(undefined)
      const room = makeRoom({ id: 'room-abc', status: RoomStatus.CLEANING })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      await user.click(screen.getByRole('button', { name: /Mark as Cleaned/i }))

      expect(mockUpdateRoomStatus).toHaveBeenCalledWith('room-abc', 'clean')
      expect(onUpdated).toHaveBeenCalled()
    })

    it('calls roomService.updateRoomStatus with "maintenance" when Mark for Maintenance is clicked', async () => {
      const user = userEvent.setup()
      mockUpdateRoomStatus.mockResolvedValue(undefined)
      const room = makeRoom({ id: 'room-xyz', status: RoomStatus.AVAILABLE })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      // Find the action button (not the badge)
      const buttons = screen.getAllByText('Mark for Maintenance')
      const actionButton = buttons.find(element => element.closest('button')?.className.includes('w-full'))
      expect(actionButton).toBeTruthy()
      await user.click(actionButton!.closest('button')!)

      expect(mockUpdateRoomStatus).toHaveBeenCalledWith('room-xyz', 'maintenance')
      expect(onUpdated).toHaveBeenCalled()
    })

    it('calls roomService.updateRoomStatus with "available" when Mark as Available is clicked', async () => {
      const user = userEvent.setup()
      mockUpdateRoomStatus.mockResolvedValue(undefined)
      const room = makeRoom({ id: 'room-mnt', status: RoomStatus.MAINTENANCE })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      // Find the action button (not the badge)
      const buttons = screen.getAllByText('Mark as Available')
      const actionButton = buttons.find(element => element.closest('button')?.className.includes('w-full'))
      expect(actionButton).toBeTruthy()
      await user.click(actionButton!.closest('button')!)

      expect(mockUpdateRoomStatus).toHaveBeenCalledWith('room-mnt', 'available')
      expect(onUpdated).toHaveBeenCalled()
    })
  })

  describe('edit mode', () => {
    it('enters edit mode when the edit button is clicked', async () => {
      const user = userEvent.setup()
      const room = makeRoom({ name: 'Suite 101' })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      await user.click(screen.getByRole('button', { name: /Edit Suite 101/i }))

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
    })

    it('cancels edit mode without saving', async () => {
      const user = userEvent.setup()
      const room = makeRoom({ name: 'Suite 101' })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      await user.click(screen.getByRole('button', { name: /Edit Suite 101/i }))
      await user.click(screen.getByRole('button', { name: /Cancel/i }))

      expect(screen.getByText('Suite 101')).toBeInTheDocument()
      expect(mockUpdateRoom).not.toHaveBeenCalled()
    })

    it('saves edits when the save button is clicked', async () => {
      const user = userEvent.setup()
      mockUpdateRoom.mockResolvedValue(undefined)
      const room = makeRoom({ id: 'room-edit', name: 'Suite 101', pricePerNight: 100, maxGuests: 2 })
      render(<RoomCard room={room} onUpdated={onUpdated} />)

      await user.click(screen.getByRole('button', { name: /Edit Suite 101/i }))

      const nameInput = screen.getByLabelText('Room name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Grand Suite')

      await user.click(screen.getByRole('button', { name: /Save/i }))

      expect(mockUpdateRoom).toHaveBeenCalledWith('room-edit', {
        name: 'Grand Suite',
        pricePerNight: 100,
        maxGuests: 2,
      })
      expect(onUpdated).toHaveBeenCalled()
    })
  })
})
