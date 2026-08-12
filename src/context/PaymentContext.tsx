import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Payment } from '../domain/Payment';
import { paymentService } from '../services/PaymentService';

interface PaymentContextValue {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextValue | null>(null);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentService.getAllPayments();
      setPayments(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PaymentContext.Provider value={{ payments, loading, error, clearError, refresh }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (!context) throw new Error('usePaymentContext must be used within PaymentProvider');
  return context;
}
