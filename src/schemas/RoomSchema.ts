import { z } from 'zod';
import { RoomStatus } from '../domain/Room';

export const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Room name is required'),
  status: z.enum(RoomStatus),
  /** Integer cents (see domain/money). */
  pricePerNightCents: z.number().int().positive('Price must be greater than 0'),
  maxGuests: z.number().int().min(1, 'Must have at least 1 guest'),
});

/** A room as stored and validated. Single source of truth for the room shape. */
export type RoomData = z.infer<typeof RoomSchema>;
