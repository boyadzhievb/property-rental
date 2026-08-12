import { z } from 'zod';

export const PaymentSchema = z.object({
  id: z.string().min(1),
  reservationId: z.string().min(1, 'Reservation is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  method: z.enum(['cash', 'card', 'transfer']),
  note: z.string(),
});

export type PaymentInput = z.infer<typeof PaymentSchema>;
