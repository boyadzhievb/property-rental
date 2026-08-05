export type ReservationStatus = 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';

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
  }

  get status(): ReservationStatus {
    return this._status;
  }

  cancel(): void {
    this._status = 'Cancelled';
  }

  checkIn(): void {
    this._status = 'Checked In';
  }

  checkOut(): void {
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
    };
  }
}
