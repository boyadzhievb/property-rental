import { DomainError } from './errors';

export enum RoomStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  CLEANING = 'Cleaning',
  MAINTENANCE = 'Maintenance',
}

export type RoomStatusAction = 'clean' | 'maintenance' | 'available';

export interface RoomData {
  id: string;
  name: string;
  status: RoomStatus;
  pricePerNight: number;
  maxGuests: number;
}

export class Room {
  readonly id: string;
  readonly name: string;
  private _status: RoomStatus;
  readonly pricePerNight: number;
  readonly maxGuests: number;

  constructor(data: RoomData) {
    this.id = data.id;
    this.name = data.name;
    this._status = data.status;
    this.pricePerNight = data.pricePerNight;
    this.maxGuests = data.maxGuests ?? 2;
  }

  get status(): RoomStatus {
    return this._status;
  }

  isAvailable(): boolean {
    return this._status === RoomStatus.AVAILABLE;
  }

  occupy(): void {
    if (this._status !== RoomStatus.AVAILABLE) {
      throw new DomainError('roomNotAvailable');
    }
    this._status = RoomStatus.OCCUPIED;
  }

  vacate(): void {
    if (this._status !== RoomStatus.CLEANING) {
      throw new DomainError('roomNotInCleaning');
    }
    this._status = RoomStatus.AVAILABLE;
  }

  markCleaning(): void {
    if (this._status !== RoomStatus.OCCUPIED) {
      throw new DomainError('roomNotOccupied');
    }
    this._status = RoomStatus.CLEANING;
  }

  markMaintenance(): void {
    if (this._status === RoomStatus.OCCUPIED) {
      throw new DomainError('roomOccupiedNoMaintenance');
    }
    this._status = RoomStatus.MAINTENANCE;
  }

  markAvailable(): void {
    if (this._status !== RoomStatus.MAINTENANCE) {
      throw new DomainError('roomNotInMaintenance');
    }
    this._status = RoomStatus.AVAILABLE;
  }

  toData(): RoomData {
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      pricePerNight: this.pricePerNight,
      maxGuests: this.maxGuests,
    };
  }
}
