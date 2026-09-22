export type ReservationStatus = 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly';

export interface RecurrenceRule {
  pattern: RecurrencePattern;
  endDate: string;
}

export interface ReservationData {
  id: string;
  roomId: string;
  guestId: string;
  arrivalDate: string;
  departureDate: string;
  guestsCount: number;
  status: ReservationStatus;
  price: number;
  notes?: string;
  recurrence?: RecurrenceRule;
  seriesId?: string;
}

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
      throw new Error(`Cannot cancel a reservation that is ${this._status}`);
    }
    this._status = 'Cancelled';
  }

  checkIn(): void {
    if (this._status !== 'Confirmed') {
      throw new Error(`Can only check in a Confirmed reservation, current status is ${this._status}`);
    }
    this._status = 'Checked In';
  }

  checkOut(): void {
    if (this._status !== 'Checked In') {
      throw new Error(`Can only check out a Checked In reservation, current status is ${this._status}`);
    }
    this._status = 'Checked Out';
  }

  duration(): number {
    const arrival = new Date(this.arrivalDate);
    const departure = new Date(this.departureDate);
    return Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
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

  static generateOccurrences(
    baseData: ReservationData,
    recurrence: RecurrenceRule,
  ): ReservationData[] {
    const stayDuration = new Reservation(baseData).duration();
    const occurrences: ReservationData[] = [];
    let currentArrival = new Date(baseData.arrivalDate);
    const seriesEnd = new Date(recurrence.endDate);
    const seriesId = `series-${Date.now()}`;

    while (currentArrival <= seriesEnd) {
      const currentDeparture = new Date(currentArrival);
      currentDeparture.setDate(currentDeparture.getDate() + stayDuration);

      if (currentDeparture > new Date(recurrence.endDate + 'T23:59:59')) {
        break;
      }

      const formatDate = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      occurrences.push({
        ...baseData,
        id: occurrences.length === 0 ? baseData.id : `${baseData.id}-${occurrences.length}`,
        arrivalDate: formatDate(currentArrival),
        departureDate: formatDate(currentDeparture),
        status: 'Confirmed',
        recurrence: occurrences.length === 0 ? recurrence : undefined,
        seriesId,
      });

      switch (recurrence.pattern) {
        case 'weekly':
          currentArrival.setDate(currentArrival.getDate() + 7);
          break;
        case 'biweekly':
          currentArrival.setDate(currentArrival.getDate() + 14);
          break;
        case 'monthly':
          currentArrival.setMonth(currentArrival.getMonth() + 1);
          break;
      }
    }

    return occurrences;
  }
}
