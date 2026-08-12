import { format } from 'date-fns';
import { Task, type TaskData, type TaskCategory } from '../domain/Task';
import { TaskSchema } from '../schemas/TaskSchema';
import { taskRepository } from '../repositories/TaskRepository';
import { roomRepository } from '../repositories/RoomRepository';

export class TaskService {
  async getAllTasks(): Promise<Task[]> {
    return taskRepository.getAll();
  }

  async getTodayTasks(): Promise<Task[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return taskRepository.getByDate(today);
  }

  async createTask(data: TaskData): Promise<Task> {
    const validated = TaskSchema.parse(data);
    const task = new Task(validated);
    return taskRepository.save(task);
  }

  async toggleTask(id: string): Promise<Task | null> {
    const task = await taskRepository.getById(id);
    if (!task) return null;
    if (task.completed) {
      task.reopen();
    } else {
      task.complete();
      if (task.category === 'cleaning' && task.linkedRoomId) {
        const room = await roomRepository.getById(task.linkedRoomId);
        if (room) {
          room.vacate();
          await roomRepository.save(room);
        }
      }
    }
    return taskRepository.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    return taskRepository.delete(id);
  }

  async ensureAutoTasks(params: {
    cleaningRoomIds: { id: string; name: string }[];
    preparationRoomIds: { id: string; name: string; guestName: string }[];
    pendingPayments: { reservationId: string; guestName: string }[];
  }): Promise<Task[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = await taskRepository.getByDate(today);
    const existingAutoIds = new Set(existing.filter(t => t.auto).map(t => t.id));

    const needed: TaskData[] = [];

    for (const room of params.cleaningRoomIds) {
      const id = `auto-clean-${room.id}-${today}`;
      if (!existingAutoIds.has(id)) {
        needed.push({
          id,
          title: `Clean ${room.name}`,
          category: 'cleaning',
          completed: false,
          date: today,
          linkedRoomId: room.id,
          auto: true,
        });
      }
    }

    for (const room of params.preparationRoomIds) {
      const id = `auto-prep-${room.id}-${today}`;
      if (!existingAutoIds.has(id)) {
        needed.push({
          id,
          title: `Prepare ${room.name} for ${room.guestName}`,
          category: 'preparation',
          completed: false,
          date: today,
          linkedRoomId: room.id,
          auto: true,
        });
      }
    }

    for (const payment of params.pendingPayments) {
      const id = `auto-pay-${payment.reservationId}-${today}`;
      if (!existingAutoIds.has(id)) {
        needed.push({
          id,
          title: `Check payment from ${payment.guestName}`,
          category: 'payment',
          completed: false,
          date: today,
          linkedReservationId: payment.reservationId,
          auto: true,
        });
      }
    }

    for (const data of needed) {
      const task = new Task(data);
      await taskRepository.save(task);
    }

    return taskRepository.getByDate(today);
  }
}

export const taskService = new TaskService();
