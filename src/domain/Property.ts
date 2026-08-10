import { Room, RoomStatus } from './Room';
import { Reservation } from './Reservation';

export class Property {
  constructor(
    private rooms: Room[],
    private reservations: Reservation[]
  ) {}

  findAvailableRooms(startDate: string, endDate: string): Room[] {
    return this.rooms.filter(room => {
      if (!room.isAvailable()) return false;
      const hasConflict = this.reservations.some(
        r => r.roomId === room.id && r.isActive() && r.overlaps(startDate, endDate)
      );
      return !hasConflict;
    });
  }

  occupancy(): number {
    const total = this.totalRooms();
    if (total === 0) return 0;
    return this.occupiedRooms() / total;
  }

  totalRooms(): number {
    return this.rooms.length;
  }

  occupiedRooms(): number {
    return this.rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
  }

  availableRooms(): number {
    return this.rooms.filter(r => r.isAvailable()).length;
  }
}
