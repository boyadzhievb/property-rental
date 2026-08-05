export type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Not available';

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
    return this._status === 'Available';
  }

  occupy(): void {
    this._status = 'Occupied';
  }

  vacate(): void {
    this._status = 'Available';
  }

  markCleaning(): void {
    this._status = 'Cleaning';
  }

  markMaintenance(): void {
    this._status = 'Not available';
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
