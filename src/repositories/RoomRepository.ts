import { api } from '../api/client';
import { Room } from '../domain/Room';

export class RoomRepository {
  async getAll(): Promise<Room[]> {
    const data = await api.rooms.getAll();
    return data.map(d => new Room(d));
  }

  async getById(id: string): Promise<Room | null> {
    const data = await api.rooms.getById(id);
    return data == null ? null : new Room(data);
  }

  async save(room: Room): Promise<Room> {
    const data = room.toData();
    const saved = await api.rooms.create(data);
    return new Room(saved);
  }

  async delete(id: string): Promise<void> {
    await api.rooms.delete(id);
  }
}

export const roomRepository = new RoomRepository();
