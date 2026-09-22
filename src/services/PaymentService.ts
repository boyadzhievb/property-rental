import { Payment, type PaymentData } from '../domain/Payment';
import { PaymentSchema } from '../schemas/PaymentSchema';
import { paymentRepository } from '../repositories/PaymentRepository';
import { atomicReadWrite } from '../api/client';
import type { Reservation as ReservationRecord, Payment as PaymentRecord } from '../api/client';

export class PaymentService {
  async getAllPayments(): Promise<Payment[]> {
    return paymentRepository.getAll();
  }

  async getPaymentsByReservationId(reservationId: string): Promise<Payment[]> {
    return paymentRepository.getByReservationId(reservationId);
  }

  async createPayment(data: PaymentData): Promise<Payment> {
    const validated = PaymentSchema.parse(data);

    const payment = await atomicReadWrite<Payment>(
      ['reservations', 'payments'],
      async (stores) => {
        const reservation = await stores.reservations.get<ReservationRecord>(validated.reservationId);
        if (!reservation) {
          throw new Error('Reservation not found');
        }
        if (reservation.status === 'Cancelled') {
          throw new Error('Cannot record payment for a cancelled reservation');
        }

        const existing = await stores.payments.getAllByIndex<PaymentRecord>(
          'reservationId', validated.reservationId
        );
        const totalPaid = existing.reduce((sum, record) => sum + record.amount, 0);
        if (totalPaid + validated.amount > reservation.price) {
          throw new Error(`Payment exceeds remaining balance of $${reservation.price - totalPaid}`);
        }

        const newPayment = new Payment(validated);
        stores.payments.put(newPayment.toData());
        return newPayment;
      },
    );

    return payment;
  }

  async deletePayment(id: string): Promise<void> {
    return paymentRepository.delete(id);
  }
}

export const paymentService = new PaymentService();
