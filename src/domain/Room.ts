export type RoomStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Not available';

export interface RoomData {
  id: string;
  name: string;
  status: RoomStatus;
  pricePerNight: number;
  image: string;
}

export class Room {
  readonly id: string;
  readonly name: string;
  private _status: RoomStatus;
  readonly pricePerNight: number;
  readonly image: string;

  constructor(data: RoomData) {
    this.id = data.id;
    this.name = data.name;
    this._status = data.status;
    this.pricePerNight = data.pricePerNight;
    this.image = data.image;
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
      image: this.image,
    };
  }
}
