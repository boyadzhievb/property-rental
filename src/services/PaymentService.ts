import { Payment, type PaymentData } from '../domain/Payment';
import { PaymentSchema } from '../schemas/PaymentSchema';
import { paymentRepository } from '../repositories/PaymentRepository';
import { reservationRepository } from '../repositories/ReservationRepository';

export class PaymentService {
  async getAllPayments(): Promise<Payment[]> {
    return paymentRepository.getAll();
  }

  async getPaymentsByReservationId(reservationId: string): Promise<Payment[]> {
    return paymentRepository.getByReservationId(reservationId);
  }

  async createPayment(data: PaymentData): Promise<Payment> {
    const validated = PaymentSchema.parse(data);

    const reservation = await reservationRepository.getById(validated.reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    if (reservation.status === 'Cancelled') {
      throw new Error('Cannot record payment for a cancelled reservation');
    }

    const existing = await paymentRepository.getByReservationId(validated.reservationId);
    const totalPaid = existing.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid + validated.amount > reservation.price) {
      throw new Error(`Payment exceeds remaining balance of $${reservation.price - totalPaid}`);
    }

    const payment = new Payment(validated);
    return paymentRepository.save(payment);
  }

  async deletePayment(id: string): Promise<void> {
    return paymentRepository.delete(id);
  }
}

export const paymentService = new PaymentService();
