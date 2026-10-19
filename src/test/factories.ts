import { format } from 'date-fns';
import { Room, RoomStatus } from '../domain/Room';
import { Guest } from '../domain/Guest';
import { Reservation } from '../domain/Reservation';
import { Payment } from '../domain/Payment';
import { Task } from '../domain/Task';
import type { RoomData } from '../domain/Room';
import type { GuestData } from '../domain/Guest';
import type { ReservationData } from '../domain/Reservation';
import type { PaymentData } from '../domain/Payment';
import type { TaskData } from '../domain/Task';

/**
 * Shared test factory functions that create domain model instances
 * with sensible defaults. Pass partial overrides to customise any field.
 */

export function makeRoom(overrides?: Partial<RoomData>): Room {
  return new Room({
    id: `room-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Test Room',
    status: RoomStatus.AVAILABLE,
    pricePerNight: 100,
    maxGuests: 2,
    ...overrides,
  });
}

export function makeGuest(overrides?: Partial<GuestData>): Guest {
  return new Guest({
    id: `guest-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Test Guest',
    phone: '+1234567890',
    email: 'guest@example.com',
    previousStays: 0,
    notes: '',
    ...overrides,
  });
}

export function makeReservation(overrides?: Partial<ReservationData>): Reservation {
  return new Reservation({
    id: `res-${crypto.randomUUID().slice(0, 8)}`,
    roomId: 'room-1',
    guestId: 'guest-1',
    arrivalDate: '2026-12-01',
    departureDate: '2026-12-05',
    guestsCount: 2,
    status: 'Confirmed',
    price: 400,
    ...overrides,
  });
}

export function makePayment(overrides?: Partial<PaymentData>): Payment {
  return new Payment({
    id: `pay-${crypto.randomUUID().slice(0, 8)}`,
    reservationId: 'res-1',
    amount: 100,
    date: format(new Date(), 'yyyy-MM-dd'),
    method: 'cash',
    note: '',
    ...overrides,
  });
}

export function makeTask(overrides?: Partial<TaskData>): Task {
  return new Task({
    id: `task-${crypto.randomUUID().slice(0, 8)}`,
    title: 'Test Task',
    category: 'custom',
    completed: false,
    date: format(new Date(), 'yyyy-MM-dd'),
    auto: false,
    ...overrides,
  });
}
