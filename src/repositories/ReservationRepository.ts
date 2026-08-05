import { api } from '../api/client';
import { Reservation } from '../domain/Reservation';

export class ReservationRepository {
  async getAll(): Promise<Reservation[]> {
    const data = await api.reservations.getAll();
    return data.map(d => new Reservation(d));
  }

  async getByMonth(from: string, to: string): Promise<Reservation[]> {
    const data = await api.reservations.getAll({ from, to });
    return data.map(d => new Reservation(d));
  }

  async getById(id: string): Promise<Reservation | null> {
    try {
      const data = await api.reservations.getById(id);
      return new Reservation(data);
    } catch {
      return null;
    }
  }

  async save(reservation: Reservation): Promise<Reservation> {
    const data = reservation.toData();
    const existing = await this.getById(data.id);
    if (existing) {
      const updated = await api.reservations.update(data.id, data);
      return new Reservation(updated);
    }
    const created = await api.reservations.create(data);
    return new Reservation(created);
  }

  async delete(id: string): Promise<void> {
    await api.reservations.delete(id);
  }
}

export const reservationRepository = new ReservationRepository();
