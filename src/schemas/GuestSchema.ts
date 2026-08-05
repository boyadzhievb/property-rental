import { z } from 'zod';

export const GuestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Guest name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').or(z.literal('')),
  previousStays: z.number().int().min(0),
  notes: z.string(),
});

export type GuestInput = z.infer<typeof GuestSchema>;
