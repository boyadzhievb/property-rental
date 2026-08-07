import { Room, type RoomData } from '../domain/Room';
import { RoomSchema } from '../schemas/RoomSchema';
import { roomRepository } from '../repositories/RoomRepository';

export class RoomService {
  async getRooms(): Promise<Room[]> {
    return roomRepository.getAll();
  }

  async getRoomById(id: string): Promise<Room | null> {
    return roomRepository.getById(id);
  }

  async createRoom(data: RoomData): Promise<Room> {
    const validated = RoomSchema.parse(data);
    const room = new Room(validated);
    return roomRepository.save(room);
  }

  async updateRoom(id: string, data: Partial<RoomData>): Promise<Room | null> {
    const existing = await roomRepository.getById(id);
    if (!existing) return null;
    const merged = { ...existing.toData(), ...data };
    const validated = RoomSchema.parse(merged);
    const room = new Room(validated);
    return roomRepository.save(room);
  }

  async updateRoomStatus(id: string, action: 'occupy' | 'vacate' | 'cleaning' | 'maintenance'): Promise<Room | null> {
    const room = await roomRepository.getById(id);
    if (!room) return null;

    switch (action) {
      case 'occupy': room.occupy(); break;
      case 'vacate': room.vacate(); break;
      case 'cleaning': room.markCleaning(); break;
      case 'maintenance': room.markMaintenance(); break;
    }

    return roomRepository.save(room);
  }
}

export const roomService = new RoomService();
