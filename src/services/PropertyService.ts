import { Property } from '../domain/Property';
import { roomRepository } from '../repositories/RoomRepository';
import { reservationRepository } from '../repositories/ReservationRepository';

export class PropertyService {
  async getProperty(): Promise<Property> {
    const [rooms, reservations] = await Promise.all([
      roomRepository.getAll(),
      reservationRepository.getAll(),
    ]);
    return new Property(rooms, reservations);
  }

  async findAvailableRooms(startDate: string, endDate: string) {
    const property = await this.getProperty();
    return property.findAvailableRooms(startDate, endDate);
  }
}

export const propertyService = new PropertyService();
