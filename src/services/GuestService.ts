import { Guest, type GuestData } from '../domain/Guest';
import { GuestSchema } from '../schemas/GuestSchema';
import { guestRepository } from '../repositories/GuestRepository';

export class GuestService {
  async getGuests(): Promise<Guest[]> {
    return guestRepository.getAll();
  }

  async getAllGuests(): Promise<Guest[]> {
    return this.getGuests();
  }

  async getGuestById(id: string): Promise<Guest | null> {
    return guestRepository.getById(id);
  }

  async createGuest(data: GuestData): Promise<Guest> {
    const validated = GuestSchema.parse(data);
    const guest = new Guest(validated);
    return guestRepository.save(guest);
  }
}

export const guestService = new GuestService();
