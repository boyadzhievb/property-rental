import { api } from '../api/client';
import { Guest } from '../domain/Guest';

export class GuestRepository {
  async getAll(): Promise<Guest[]> {
    const data = await api.guests.getAll();
    return data.map(d => new Guest(d));
  }

  async getById(id: string): Promise<Guest | null> {
    try {
      const data = await api.guests.getById(id);
      return new Guest(data);
    } catch {
      return null;
    }
  }

  async save(guest: Guest): Promise<Guest> {
    const data = guest.toData();
    const existing = await this.getById(data.id);
    if (existing) {
      const updated = await api.guests.update(data.id, data);
      return new Guest(updated);
    }
    const created = await api.guests.create(data);
    return new Guest(created);
  }

  async delete(id: string): Promise<void> {
    await api.guests.delete(id);
  }
}

export const guestRepository = new GuestRepository();
