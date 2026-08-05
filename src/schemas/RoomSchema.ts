import { z } from 'zod';

export const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Room name is required'),
  status: z.enum(['Available', 'Occupied', 'Cleaning', 'Not available']),
  pricePerNight: z.number().positive('Price must be greater than 0'),
  image: z.string().url('Must be a valid URL'),
});

export type RoomInput = z.infer<typeof RoomSchema>;
