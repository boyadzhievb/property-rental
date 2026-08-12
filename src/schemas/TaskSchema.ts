import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['cleaning', 'preparation', 'payment', 'communication', 'custom']),
  completed: z.boolean(),
  date: z.string().min(1, 'Date is required'),
  linkedRoomId: z.string().optional(),
  linkedReservationId: z.string().optional(),
  linkedGuestId: z.string().optional(),
  auto: z.boolean(),
});

export type TaskInput = z.infer<typeof TaskSchema>;
