export type TaskCategory = 'cleaning' | 'preparation' | 'payment' | 'communication' | 'custom';

/**
 * What an automatic task says, stored as data so its title can be translated when shown
 * (see i18n/taskTitle). `title` keeps an English copy for older app versions.
 */
export interface TaskTemplate {
  kind: 'clean' | 'prepare' | 'checkPayment';
  roomName?: string;
  guestName?: string;
}

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
  template?: TaskTemplate;
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
  readonly template?: TaskTemplate;

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
    this.template = data.template;
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
      ...(this.template ? { template: this.template } : {}),
    };
  }
}
