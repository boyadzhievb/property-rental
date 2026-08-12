import { api } from '../api/client';
import { Payment } from '../domain/Payment';

export class PaymentRepository {
  async getAll(): Promise<Payment[]> {
    const data = await api.payments.getAll();
    return data.map(d => new Payment(d));
  }

  async getByReservationId(reservationId: string): Promise<Payment[]> {
    const data = await api.payments.getByReservationId(reservationId);
    return data.map(d => new Payment(d));
  }

  async getById(id: string): Promise<Payment | null> {
    try {
      const data = await api.payments.getById(id);
      return data ? new Payment(data) : null;
    } catch {
      return null;
    }
  }

  async save(payment: Payment): Promise<Payment> {
    const data = payment.toData();
    const saved = await api.payments.create(data);
    return new Payment(saved);
  }

  async delete(id: string): Promise<void> {
    await api.payments.delete(id);
  }
}

export const paymentRepository = new PaymentRepository();
