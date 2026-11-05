import { Payment, type PaymentData } from '../domain/Payment';
import { PaymentSchema } from '../schemas/PaymentSchema';
import { reservationBalance } from '../domain/balance';
import { paymentRepository } from '../repositories/PaymentRepository';
import { atomicReadWrite } from '../api/client';
import type { ReservationData } from '../domain/Reservation';
import { DomainError } from '../domain/errors';

export class PaymentService {
  async getAllPayments(): Promise<Payment[]> {
    return paymentRepository.getAll();
  }

  async getPaymentsByReservationId(reservationId: string): Promise<Payment[]> {
    return paymentRepository.getByReservationId(reservationId);
  }

  async createPayment(data: PaymentData): Promise<Payment> {
    // Amounts arrive as integer cents; forms convert typed decimals with parseMoneyInput.
    const validated = PaymentSchema.parse(data);

    const payment = await atomicReadWrite<Payment>(
      ['reservations', 'payments'],
      async (stores) => {
        const reservation = await stores.reservations.get<ReservationData>(validated.reservationId);
        if (!reservation) {
          throw new DomainError('reservationNotFound');
        }
        if (reservation.status === 'Cancelled') {
          throw new DomainError('paymentOnCancelled');
        }

        const existing = await stores.payments.getAllByIndex<PaymentData>(
          'reservationId', validated.reservationId
        );
        const { balanceCents } = reservationBalance(reservation.priceCents, existing);
        if (validated.amountCents > balanceCents) {
          throw new DomainError('paymentExceedsBalance', { remaining: balanceCents });
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
