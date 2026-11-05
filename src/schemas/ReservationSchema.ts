import { z } from 'zod';
import { localDate } from './localDate';

export const ReservationStatusSchema = z.enum(['Confirmed', 'Checked In', 'Checked Out', 'Cancelled']);
export const RecurrencePatternSchema = z.enum(['weekly', 'biweekly', 'monthly']);

export const RecurrenceRuleSchema = z.object({
  pattern: RecurrencePatternSchema,
  endDate: localDate('End date is required'),
});

export const ReservationSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1, 'Room is required'),
  guestId: z.string().min(1, 'Guest is required'),
  arrivalDate: localDate('Check-in date is required'),
  departureDate: localDate('Check-out date is required'),
  guestsCount: z.number().int().min(1, 'At least 1 guest required'),
  status: ReservationStatusSchema,
  price: z.number().positive('Price must be greater than 0'),
  notes: z.string().optional(),
  recurrence: RecurrenceRuleSchema.optional(),
  seriesId: z.string().optional(),
}).refine(data => data.arrivalDate < data.departureDate, {
  message: 'Check-out must be after check-in',
  path: ['departureDate'],
});

/** A reservation as stored and validated. Single source of truth for the reservation shape. */
export type ReservationData = z.infer<typeof ReservationSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;
export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>;
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;
