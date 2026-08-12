import { usePaymentContext } from '../context/PaymentContext';

export function usePayments() {
  return usePaymentContext();
}
