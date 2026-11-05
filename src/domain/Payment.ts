import type { PaymentData, PaymentMethod } from '../schemas/PaymentSchema';

export type { PaymentData, PaymentMethod };

export class Payment {
  readonly id: string;
  readonly reservationId: string;
  /** Integer cents. */
  readonly amountCents: number;
  readonly date: string;
  readonly method: 'cash' | 'card' | 'transfer';
  readonly note: string;

  constructor(data: PaymentData) {
    this.id = data.id;
    this.reservationId = data.reservationId;
    this.amountCents = data.amountCents;
    this.date = data.date;
    this.method = data.method;
    this.note = data.note;
  }

  toData(): PaymentData {
    return {
      id: this.id,
      reservationId: this.reservationId,
      amountCents: this.amountCents,
      date: this.date,
      method: this.method,
      note: this.note,
    };
  }
}
