import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Reservation, type ReservationData, type RecurrenceRule } from '../domain/Reservation';
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

    if (validated.recurrence) {
      return this.createRecurringSeries(validated, validated.recurrence);
    }

    return this.createSingleReservation(validated);
  }

  private async createSingleReservation(data: ReservationData): Promise<Reservation> {
    const reservation = new Reservation(data);

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

  private async createRecurringSeries(data: ReservationData, recurrence: RecurrenceRule): Promise<Reservation> {
    const occurrences = Reservation.generateOccurrences(data, recurrence);

    if (occurrences.length === 0) {
      throw new Error('No occurrences generated — check dates and recurrence pattern');
    }

    const room = await roomRepository.getById(data.roomId);
    if (room && data.guestsCount > room.maxGuests) {
      throw new Error(
        `Guest count (${data.guestsCount}) exceeds room capacity (${room.maxGuests})`
      );
    }

    const existing = await reservationRepository.getAll();
    for (const occurrence of occurrences) {
      const reservation = new Reservation(occurrence);
      const conflict = existing.find(
        r => r.roomId === reservation.roomId && r.isActive() && r.overlaps(reservation)
      );
      if (conflict) {
        throw new Error(
          `Recurring reservation conflicts with existing booking from ${conflict.arrivalDate} to ${conflict.departureDate}`
        );
      }
    }

    let firstSaved: Reservation | null = null;
    for (const occurrence of occurrences) {
      const saved = await reservationRepository.save(new Reservation(occurrence));
      if (!firstSaved) firstSaved = saved;
    }

    return firstSaved!;
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

  async getSeriesReservations(seriesId: string): Promise<Reservation[]> {
    const all = await reservationRepository.getAll();
    return all.filter(r => r.seriesId === seriesId);
  }

  async cancelSeries(seriesId: string): Promise<Reservation[]> {
    const seriesReservations = await this.getSeriesReservations(seriesId);
    const cancelled: Reservation[] = [];

    for (const reservation of seriesReservations) {
      if (!reservation.isActive()) continue;

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

      cancelled.push(reservation);
    }

    return cancelled;
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
