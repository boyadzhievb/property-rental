import { z } from 'zod';

export const RecurrenceRuleSchema = z.object({
  pattern: z.enum(['weekly', 'biweekly', 'monthly']),
  endDate: z.string().min(1, 'End date is required'),
});

export const ReservationSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1, 'Room is required'),
  guestId: z.string().min(1, 'Guest is required'),
  arrivalDate: z.string().min(1, 'Check-in date is required'),
  departureDate: z.string().min(1, 'Check-out date is required'),
  guestsCount: z.number().int().min(1, 'At least 1 guest required'),
  status: z.enum(['Confirmed', 'Checked In', 'Checked Out', 'Cancelled']),
  price: z.number().positive('Price must be greater than 0'),
  notes: z.string().optional(),
  recurrence: RecurrenceRuleSchema.optional(),
  seriesId: z.string().optional(),
}).refine(data => data.arrivalDate < data.departureDate, {
  message: 'Check-out must be after check-in',
  path: ['departureDate'],
});

export type ReservationInput = z.infer<typeof ReservationSchema>;
