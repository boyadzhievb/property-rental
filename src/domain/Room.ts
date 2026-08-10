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
    this._status = RoomStatus.OCCUPIED;
  }

  vacate(): void {
    if (this._status !== RoomStatus.CLEANING) {
      throw new Error('Room can only be marked available from Cleaning status');
    }
    this._status = RoomStatus.AVAILABLE;
  }

  markCleaning(): void {
    this._status = RoomStatus.CLEANING;
  }

  markMaintenance(): void {
    if (this._status === RoomStatus.OCCUPIED) {
      throw new Error('An occupied room cannot be marked for maintenance');
    }
    this._status = RoomStatus.MAINTENANCE;
  }

  markAvailable(): void {
    if (this._status !== RoomStatus.MAINTENANCE) {
      throw new Error('Only a maintenance room can be marked available this way');
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
