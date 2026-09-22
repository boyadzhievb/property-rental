import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Reservation, type ReservationData, type RecurrenceRule } from '../domain/Reservation';
import { ReservationSchema } from '../schemas/ReservationSchema';
import { reservationRepository } from '../repositories/ReservationRepository';
import { roomRepository } from '../repositories/RoomRepository';
import { guestRepository } from '../repositories/GuestRepository';
import { batchPut } from '../api/client';

export class ReservationService {
  async getAllReservations(): Promise<Reservation[]> {
    return reservationRepository.getAll();
  }

  async getReservations(month: Date): Promise<Reservation[]> {
    const from = format(startOfMonth(month), 'yyyy-MM-dd');
    const to = format(endOfMonth(month), 'yyyy-MM-dd');
    return reservationRepository.getByMonth(from, to);
  }

  async getReservationsByRange(from: string, to: string): Promise<Reservation[]> {
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
    if (!room) {
      throw new Error('Room not found');
    }

    const guest = await guestRepository.getById(reservation.guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }

    if (reservation.guestsCount > room.maxGuests) {
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
    if (!room) {
      throw new Error('Room not found');
    }

    const guest = await guestRepository.getById(data.guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }

    if (data.guestsCount > room.maxGuests) {
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

    await batchPut(
      occurrences.map(occurrence => ({ store: 'reservations', data: occurrence }))
    );

    return new Reservation(occurrences[0]);
  }

  async checkIn(id: string): Promise<Reservation | null> {
    const reservation = await reservationRepository.getById(id);
    if (!reservation) return null;

    reservation.checkIn();

    const room = await roomRepository.getById(reservation.roomId);
    if (room) {
      room.occupy();
      await batchPut([
        { store: 'reservations', data: reservation.toData() },
        { store: 'rooms', data: room.toData() },
      ]);
    } else {
      await reservationRepository.save(reservation);
    }

    return reservation;
  }

  async checkOut(id: string): Promise<Reservation | null> {
    const reservation = await reservationRepository.getById(id);
    if (!reservation) return null;

    reservation.checkOut();

    const room = await roomRepository.getById(reservation.roomId);
    if (room) {
      room.markCleaning();
      await batchPut([
        { store: 'reservations', data: reservation.toData() },
        { store: 'rooms', data: room.toData() },
      ]);
    } else {
      await reservationRepository.save(reservation);
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
    const operations: Array<{ store: string; data: unknown }> = [];

    for (const reservation of seriesReservations) {
      if (!reservation.isActive()) continue;

      const wasCheckedIn = reservation.status === 'Checked In';
      reservation.cancel();
      operations.push({ store: 'reservations', data: reservation.toData() });

      if (wasCheckedIn) {
        const room = await roomRepository.getById(reservation.roomId);
        if (room) {
          room.markCleaning();
          operations.push({ store: 'rooms', data: room.toData() });
        }
      }

      cancelled.push(reservation);
    }

    if (operations.length > 0) {
      await batchPut(operations);
    }

    return cancelled;
  }

  async cancel(id: string): Promise<Reservation | null> {
    const reservation = await reservationRepository.getById(id);
    if (!reservation) return null;

    const wasCheckedIn = reservation.status === 'Checked In';
    reservation.cancel();

    if (wasCheckedIn) {
      const room = await roomRepository.getById(reservation.roomId);
      if (room) {
        room.markCleaning();
        await batchPut([
          { store: 'reservations', data: reservation.toData() },
          { store: 'rooms', data: room.toData() },
        ]);
      } else {
        await reservationRepository.save(reservation);
      }
    } else {
      await reservationRepository.save(reservation);
    }

    return reservation;
  }
}

export const reservationService = new ReservationService();
