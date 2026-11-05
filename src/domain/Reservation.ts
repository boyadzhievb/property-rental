import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { DomainError } from './errors';

import type { ReservationData, ReservationStatus, RecurrencePattern, RecurrenceRule } from '../schemas/ReservationSchema';

export type { ReservationData, ReservationStatus, RecurrencePattern, RecurrenceRule };

export class Reservation {
  readonly id: string;
  readonly roomId: string;
  readonly guestId: string;
  readonly arrivalDate: string;
  readonly departureDate: string;
  readonly guestsCount: number;
  private _status: ReservationStatus;
  readonly price: number;
  readonly notes?: string;
  readonly recurrence?: RecurrenceRule;
  readonly seriesId?: string;

  constructor(data: ReservationData) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.guestId = data.guestId;
    this.arrivalDate = data.arrivalDate;
    this.departureDate = data.departureDate;
    this.guestsCount = data.guestsCount;
    this._status = data.status;
    this.price = data.price;
    this.notes = data.notes;
    this.recurrence = data.recurrence;
    this.seriesId = data.seriesId;
  }

  get status(): ReservationStatus {
    return this._status;
  }

  cancel(): void {
    if (this._status !== 'Confirmed' && this._status !== 'Checked In') {
      throw new DomainError('reservationNotCancellable', { status: this._status });
    }
    this._status = 'Cancelled';
  }

  checkIn(): void {
    if (this._status !== 'Confirmed') {
      throw new DomainError('reservationNotConfirmed', { status: this._status });
    }
    this._status = 'Checked In';
  }

  checkOut(): void {
    if (this._status !== 'Checked In') {
      throw new DomainError('reservationNotCheckedIn', { status: this._status });
    }
    this._status = 'Checked Out';
  }

  duration(): number {
    return differenceInCalendarDays(parseISO(this.departureDate), parseISO(this.arrivalDate));
  }

  isActive(): boolean {
    return this._status === 'Confirmed' || this._status === 'Checked In';
  }

  overlaps(other: Reservation): boolean;
  overlaps(startDate: string, endDate: string): boolean;
  overlaps(startOrReservation: string | Reservation, endDate?: string): boolean {
    const start = startOrReservation instanceof Reservation
      ? startOrReservation.arrivalDate
      : startOrReservation;
    const end = startOrReservation instanceof Reservation
      ? startOrReservation.departureDate
      : endDate!;
    return this.arrivalDate < end && this.departureDate > start;
  }

  calculateTotal(pricePerNight: number): number {
    return this.duration() * pricePerNight;
  }

  toData(): ReservationData {
    return {
      id: this.id,
      roomId: this.roomId,
      guestId: this.guestId,
      arrivalDate: this.arrivalDate,
      departureDate: this.departureDate,
      guestsCount: this.guestsCount,
      status: this._status,
      price: this.price,
      notes: this.notes,
      recurrence: this.recurrence,
      seriesId: this.seriesId,
    };
  }

  /** Upper bound on the number of reservations one recurring series may create. */
  static readonly MAX_SERIES_OCCURRENCES = 104;
  /** A series may not end more than this many years after its first arrival. */
  static readonly MAX_SERIES_YEARS = 2;

  /**
   * Expand a recurring booking into its individual reservations. Each arrival is computed from
   * the original anchor date (not from the previous occurrence), so monthly series anchored on
   * the 29th–31st clamp to shorter months without drifting. Throws when the stay is longer than
   * the repeat interval (occurrences would overlap each other), when the series ends more than
   * MAX_SERIES_YEARS after the first arrival, or when it exceeds MAX_SERIES_OCCURRENCES.
   */
  static generateOccurrences(
    baseData: ReservationData,
    recurrence: RecurrenceRule,
  ): ReservationData[] {
    const stayDuration = new Reservation(baseData).duration();
    const anchor = parseISO(baseData.arrivalDate);
    const seriesEnd = parseISO(recurrence.endDate);
    const seriesId = `series-${crypto.randomUUID()}`;

    if (seriesEnd > addYears(anchor, Reservation.MAX_SERIES_YEARS)) {
      throw new DomainError('seriesTooLong', { years: Reservation.MAX_SERIES_YEARS });
    }

    const arrivalAt = (index: number): Date => {
      switch (recurrence.pattern) {
        case 'weekly':
          return addWeeks(anchor, index);
        case 'biweekly':
          return addWeeks(anchor, index * 2);
        case 'monthly':
          return addMonths(anchor, index);
      }
    };

    const occurrences: ReservationData[] = [];
    for (let index = 0; ; index++) {
      const arrival = arrivalAt(index);
      const departure = addDays(arrival, stayDuration);
      if (departure > seriesEnd) break;

      if (index > 0 && arrival < parseISO(occurrences[index - 1].departureDate)) {
        throw new DomainError('seriesStayTooLong');
      }
      if (occurrences.length === Reservation.MAX_SERIES_OCCURRENCES) {
        throw new DomainError('seriesTooManyOccurrences', { max: Reservation.MAX_SERIES_OCCURRENCES });
      }

      occurrences.push({
        ...baseData,
        id: index === 0 ? baseData.id : `${baseData.id}-${index}`,
        arrivalDate: format(arrival, 'yyyy-MM-dd'),
        departureDate: format(departure, 'yyyy-MM-dd'),
        status: 'Confirmed',
        recurrence: index === 0 ? recurrence : undefined,
        seriesId,
      });
    }

    return occurrences;
  }
}
