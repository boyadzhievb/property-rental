import { z } from 'zod';
import { localDate } from './localDate';

export const TaskCategorySchema = z.enum(['cleaning', 'preparation', 'payment', 'communication', 'custom']);

/**
 * What an automatic task says, stored as data so its title can be translated when shown
 * (see i18n/taskTitle). `title` keeps an English copy for older app versions.
 */
export const TaskTemplateSchema = z.object({
  kind: z.enum(['clean', 'prepare', 'checkPayment']),
  roomName: z.string().optional(),
  guestName: z.string().optional(),
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  category: TaskCategorySchema,
  completed: z.boolean(),
  date: localDate('Date is required'),
  linkedRoomId: z.string().optional(),
  linkedReservationId: z.string().optional(),
  linkedGuestId: z.string().optional(),
  auto: z.boolean(),
  template: TaskTemplateSchema.optional(),
});

/** A task as stored and validated. Single source of truth for the task shape. */
export type TaskData = z.infer<typeof TaskSchema>;
export type TaskCategory = z.infer<typeof TaskCategorySchema>;
export type TaskTemplate = z.infer<typeof TaskTemplateSchema>;
