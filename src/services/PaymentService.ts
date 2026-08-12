import { Payment, type PaymentData } from '../domain/Payment';
import { PaymentSchema } from '../schemas/PaymentSchema';
import { paymentRepository } from '../repositories/PaymentRepository';

export class PaymentService {
  async getAllPayments(): Promise<Payment[]> {
    return paymentRepository.getAll();
  }

  async getPaymentsByReservationId(reservationId: string): Promise<Payment[]> {
    return paymentRepository.getByReservationId(reservationId);
  }

  async createPayment(data: PaymentData): Promise<Payment> {
    const validated = PaymentSchema.parse(data);
    const payment = new Payment(validated);
    return paymentRepository.save(payment);
  }

  async deletePayment(id: string): Promise<void> {
    return paymentRepository.delete(id);
  }
}

export const paymentService = new PaymentService();
