export interface PaymentData {
  id: string;
  reservationId: string;
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'transfer';
  note: string;
}

export class Payment {
  readonly id: string;
  readonly reservationId: string;
  readonly amount: number;
  readonly date: string;
  readonly method: 'cash' | 'card' | 'transfer';
  readonly note: string;

  constructor(data: PaymentData) {
    this.id = data.id;
    this.reservationId = data.reservationId;
    this.amount = data.amount;
    this.date = data.date;
    this.method = data.method;
    this.note = data.note;
  }

  toData(): PaymentData {
    return {
      id: this.id,
      reservationId: this.reservationId,
      amount: this.amount,
      date: this.date,
      method: this.method,
      note: this.note,
    };
  }
}
