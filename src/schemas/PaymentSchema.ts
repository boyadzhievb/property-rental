import { z } from 'zod';
import { localDate } from './localDate';

/** Sanity ceiling for a single payment; guards against typos such as an extra digit or pasted text. */
export const MAX_PAYMENT_AMOUNT = 1_000_000;

export const PaymentSchema = z.object({
  id: z.string().min(1),
  reservationId: z.string().min(1, 'Reservation is required'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(MAX_PAYMENT_AMOUNT, `Amount cannot exceed ${MAX_PAYMENT_AMOUNT}`)
    // Tolerance absorbs binary float noise (19.99 * 100 = 1998.9999999999998).
    .refine(amount => Math.abs(Math.round(amount * 100) - amount * 100) < 1e-6, 'Amount can have at most 2 decimal places'),
  date: localDate('Date is required'),
  method: z.enum(['cash', 'card', 'transfer']),
  note: z.string(),
});

export type PaymentInput = z.infer<typeof PaymentSchema>;
