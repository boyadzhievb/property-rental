import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Reservation, type ReservationData, type RecurrenceRule } from '../domain/Reservation';
import { ReservationSchema } from '../schemas/ReservationSchema';
import { reservationRepository } from '../repositories/ReservationRepository';
import { Room, type RoomData } from '../domain/Room';
import type { PaymentData } from '../domain/Payment';
import type { TaskData } from '../domain/Task';
import { atomicReadWrite, type StoreAccessor } from '../api/client';

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

    // Validation and save share one transaction, so two simultaneous bookings (double tap,
    // two tabs) are serialized and the second one sees the first in its conflict check.
    return atomicReadWrite(['rooms', 'guests', 'reservations'], async (stores) => {
      const room = await this.requireBookableRoom(stores, data);
      const existing = await stores.reservations.getAllByIndex<ReservationData>('roomId', room.id);
      const conflict = findConflict(existing, reservation);
      if (conflict) {
        throw new Error(
          `Room is already booked from ${conflict.arrivalDate} to ${conflict.departureDate}`
        );
      }

      stores.reservations.put(reservation.toData());
      return reservation;
    });
  }

  private async createRecurringSeries(data: ReservationData, recurrence: RecurrenceRule): Promise<Reservation> {
    const occurrences = Reservation.generateOccurrences(data, recurrence);

    if (occurrences.length === 0) {
      throw new Error('No occurrences generated — check dates and recurrence pattern');
    }

    return atomicReadWrite(['rooms', 'guests', 'reservations'], async (stores) => {
      const room = await this.requireBookableRoom(stores, data);
      const existing = await stores.reservations.getAllByIndex<ReservationData>('roomId', room.id);
      for (const occurrence of occurrences) {
        const conflict = findConflict(existing, new Reservation(occurrence));
        if (conflict) {
          throw new Error(
            `Recurring reservation conflicts with existing booking from ${conflict.arrivalDate} to ${conflict.departureDate}`
          );
        }
      }

      for (const occurrence of occurrences) stores.reservations.put(occurrence);
      return new Reservation(occurrences[0]);
    });
  }

  /** Load the room and guest inside the transaction and check capacity. */
  private async requireBookableRoom(stores: Record<string, StoreAccessor>, data: ReservationData): Promise<Room> {
    const roomData = await stores.rooms.get<RoomData>(data.roomId);
    if (!roomData) {
      throw new Error('Room not found');
    }

    const guest = await stores.guests.get(data.guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }

    const room = new Room(roomData);
    if (data.guestsCount > room.maxGuests) {
      throw new Error(
        `Guest count (${data.guestsCount}) exceeds room capacity (${room.maxGuests})`
      );
    }
    return room;
  }

  async checkIn(id: string): Promise<Reservation | null> {
    return this.transitionWithRoom(id, (reservation, room) => {
      reservation.checkIn();
      room?.occupy();
      return room;
    });
  }

  async checkOut(id: string): Promise<Reservation | null> {
    return this.transitionWithRoom(id, (reservation, room) => {
      reservation.checkOut();
      room?.markCleaning();
      return room;
    });
  }

  async cancel(id: string): Promise<Reservation | null> {
    return this.transitionWithRoom(id, (reservation, room) => {
      const wasCheckedIn = reservation.status === 'Checked In';
      reservation.cancel();
      if (!wasCheckedIn) return null;
      room?.markCleaning();
      return room;
    });
  }

  /**
   * Read the reservation and its room, apply `transition`, and write both back, all in one
   * transaction, so a concurrent action cannot act on a stale copy. `transition` returns the
   * room to save, or null when the room is unchanged. Domain methods throw on invalid moves,
   * which aborts the transaction.
   */
  private async transitionWithRoom(
    id: string,
    transition: (reservation: Reservation, room: Room | null) => Room | null,
  ): Promise<Reservation | null> {
    return atomicReadWrite(['reservations', 'rooms'], async (stores) => {
      const reservationData = await stores.reservations.get<ReservationData>(id);
      if (!reservationData) return null;
      const reservation = new Reservation(reservationData);

      const roomData = await stores.rooms.get<RoomData>(reservation.roomId);
      const changedRoom = transition(reservation, roomData ? new Room(roomData) : null);

      stores.reservations.put(reservation.toData());
      if (changedRoom) stores.rooms.put(changedRoom.toData());
      return reservation;
    });
  }

  async getSeriesReservations(seriesId: string): Promise<Reservation[]> {
    const all = await reservationRepository.getAll();
    return all.filter(r => r.seriesId === seriesId);
  }

  async cancelSeries(seriesId: string): Promise<Reservation[]> {
    return atomicReadWrite(['reservations', 'rooms'], async (stores) => {
      const seriesData = await stores.reservations.getAllByIndex<ReservationData>('seriesId', seriesId);
      const cancelled: Reservation[] = [];

      for (const data of seriesData) {
        const reservation = new Reservation(data);
        if (!reservation.isActive()) continue;

        const wasCheckedIn = reservation.status === 'Checked In';
        reservation.cancel();
        stores.reservations.put(reservation.toData());

        if (wasCheckedIn) {
          const roomData = await stores.rooms.get<RoomData>(reservation.roomId);
          if (roomData) {
            const room = new Room(roomData);
            room.markCleaning();
            stores.rooms.put(room.toData());
          }
        }

        cancelled.push(reservation);
      }

      return cancelled;
    });
  }

  /** Delete a reservation with its payments and linked tasks, all or nothing. */
  async deleteReservation(id: string): Promise<void> {
    await atomicReadWrite(['reservations', 'payments', 'tasks'], async (stores) => {
      const payments = await stores.payments.getAllByIndex<PaymentData>('reservationId', id);
      for (const payment of payments) stores.payments.delete(payment.id);

      const tasks = await stores.tasks.getAll<TaskData>();
      for (const task of tasks) {
        if (task.linkedReservationId === id) stores.tasks.delete(task.id);
      }

      stores.reservations.delete(id);
    });
  }
}

function findConflict(existing: ReservationData[], candidate: Reservation): ReservationData | undefined {
  return existing.find(data => {
    const other = new Reservation(data);
    return other.roomId === candidate.roomId && other.isActive() && other.overlaps(candidate);
  });
}

export const reservationService = new ReservationService();
