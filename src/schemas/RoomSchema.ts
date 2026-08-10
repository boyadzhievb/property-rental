import { z } from 'zod';
import { RoomStatus } from '../domain/Room';

export const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Room name is required'),
  status: z.nativeEnum(RoomStatus),
  pricePerNight: z.number().positive('Price must be greater than 0'),
  maxGuests: z.number().int().min(1, 'Must have at least 1 guest'),
});

export type RoomInput = z.infer<typeof RoomSchema>;
