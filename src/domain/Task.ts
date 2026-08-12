export type TaskCategory = 'cleaning' | 'preparation' | 'payment' | 'communication' | 'custom';

export interface TaskData {
  id: string;
  title: string;
  category: TaskCategory;
  completed: boolean;
  date: string;
  linkedRoomId?: string;
  linkedReservationId?: string;
  linkedGuestId?: string;
  auto: boolean;
}

export class Task {
  readonly id: string;
  readonly title: string;
  readonly category: TaskCategory;
  private _completed: boolean;
  readonly date: string;
  readonly linkedRoomId?: string;
  readonly linkedReservationId?: string;
  readonly linkedGuestId?: string;
  readonly auto: boolean;

  constructor(data: TaskData) {
    this.id = data.id;
    this.title = data.title;
    this.category = data.category;
    this._completed = data.completed;
    this.date = data.date;
    this.linkedRoomId = data.linkedRoomId;
    this.linkedReservationId = data.linkedReservationId;
    this.linkedGuestId = data.linkedGuestId;
    this.auto = data.auto;
  }

  get completed(): boolean {
    return this._completed;
  }

  complete(): void {
    this._completed = true;
  }

  reopen(): void {
    this._completed = false;
  }

  toData(): TaskData {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      completed: this._completed,
      date: this.date,
      linkedRoomId: this.linkedRoomId,
      linkedReservationId: this.linkedReservationId,
      linkedGuestId: this.linkedGuestId,
      auto: this.auto,
    };
  }
}
