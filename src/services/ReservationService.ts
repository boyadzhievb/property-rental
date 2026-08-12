import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Reservation, type ReservationData } from '../domain/Reservation';
import { ReservationSchema } from '../schemas/ReservationSchema';
import { reservationRepository } from '../repositories/ReservationRepository';
import { roomRepository } from '../repositories/RoomRepository';

export class ReservationService {
  async getAllReservations(): Promise<Reservation[]> {
    return reservationRepository.getAll();
  }

  async getReservations(month: Date): Promise<Reservation[]> {
    const from = format(startOfMonth(month), 'yyyy-MM-dd');
    const to = format(endOfMonth(month), 'yyyy-MM-dd');
    return reservationRepository.getByMonth(from, to);
  }

  async getReservationById(id: string): Promise<Reservation | null> {
    return reservationRepository.getById(id);
  }

  async createReservation(data: ReservationData): Promise<Reservation> {
    const validated = ReservationSchema.parse(data);
    const reservation = new Reservation(validated);

    const room = await roomRepository.getById(reservation.roomId);
    if (room && reservation.guestsCount > room.maxGuests) {
      throw new Error(
        `Guest count (${reservation.guestsCount}) exceeds room capacity (${room.maxGuests})`
      );
    }

    const existing = await reservationRepository.getAll();
    const conflict = existing.find(
      r => r.roomId === reservation.roomId && r.isActive() && r.overlaps(reservation)
    );
    if (conflict) {
      throw new Error(
        `Room is already booked from ${conflict.arrivalDate} to ${conflict.departureDate}`
      );
    }

    return reservationRepository.save(reservation);
  }

  async checkIn(id: string): Promise<Reservation | null> {
    const reservation = await reservationRepository.getById(id);
    if (!reservation) return null;

    reservation.checkIn();
    await reservationRepository.save(reservation);

    const room = await roomRepository.getById(reservation.roomId);
    if (room) {
      room.occupy();
      await roomRepository.save(room);
    }

    return reservation;
  }

  async checkOut(id: string): Promise<Reservation | null> {
    const reservation = await reservationRepository.getById(id);
    if (!reservation) return null;

    reservation.checkOut();
    await reservationRepository.save(reservation);

    const room = await roomRepository.getById(reservation.roomId);
    if (room) {
      room.markCleaning();
      await roomRepository.save(room);
    }

    return reservation;
  }

  async cancel(id: string): Promise<Reservation | null> {
    const reservation = await reservationRepository.getById(id);
    if (!reservation) return null;

    const wasCheckedIn = reservation.status === 'Checked In';
    reservation.cancel();
    await reservationRepository.save(reservation);

    if (wasCheckedIn) {
      const room = await roomRepository.getById(reservation.roomId);
      if (room) {
        room.markCleaning();
        await roomRepository.save(room);
      }
    }

    return reservation;
  }
}

export const reservationService = new ReservationService();
