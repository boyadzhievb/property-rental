import { type Payment } from '../domain/Payment';
import { paymentService } from '../services/PaymentService';
import { createEntityContext } from './createEntityContext';

const { Provider, useEntityContext } = createEntityContext<Payment>(
  'Payment',
  () => paymentService.getAllPayments(),
);

export const PaymentProvider = Provider;

export function usePaymentContext() {
  const { data: payments, ...rest } = useEntityContext();
  return { payments, ...rest };
}
