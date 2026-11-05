import { z } from 'zod';
import { localDate } from './localDate';

/** Sanity ceiling for a single payment (1,000,000.00); guards against typos such as an extra digit. */
export const MAX_PAYMENT_CENTS = 100_000_000;

export const PaymentMethodSchema = z.enum(['cash', 'card', 'transfer']);

export const PaymentSchema = z.object({
  id: z.string().min(1),
  reservationId: z.string().min(1, 'Reservation is required'),
  /** Integer cents (see domain/money). */
  amountCents: z
    .number()
    .int()
    .positive('Amount must be greater than 0')
    .max(MAX_PAYMENT_CENTS, 'Amount is too large'),
  date: localDate('Date is required'),
  method: PaymentMethodSchema,
  note: z.string(),
});

/** A payment as stored and validated. Single source of truth for the payment shape. */
export type PaymentData = z.infer<typeof PaymentSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
