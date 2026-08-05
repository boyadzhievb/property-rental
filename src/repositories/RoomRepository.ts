import { api } from '../api/client';
import { Room, type RoomData } from '../domain/Room';

export class RoomRepository {
  async getAll(): Promise<Room[]> {
    const data = await api.rooms.getAll();
    return data.map(d => new Room(d));
  }

  async getById(id: string): Promise<Room | null> {
    try {
      const data = await api.rooms.getById(id);
      return new Room(data);
    } catch {
      return null;
    }
  }

  async save(room: Room): Promise<Room> {
    const data = room.toData();
    const existing = await this.getById(data.id);
    if (existing) {
      const updated = await api.rooms.update(data.id, data);
      return new Room(updated);
    }
    const created = await api.rooms.create(data);
    return new Room(created);
  }

  async delete(id: string): Promise<void> {
    await api.rooms.delete(id);
  }
}

export const roomRepository = new RoomRepository();
