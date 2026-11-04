import { format } from 'date-fns';
import { Task, type TaskData, type TaskCategory } from '../domain/Task';
import { TaskSchema } from '../schemas/TaskSchema';
import { taskRepository } from '../repositories/TaskRepository';
import { Room, type RoomData } from '../domain/Room';
import { atomicReadWrite } from '../api/client';

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

  /**
   * Complete or reopen a task. Completing a cleaning task also moves its room from Cleaning to
   * Available; task and room are read and written in one transaction, so both change or neither.
   */
  async toggleTask(id: string): Promise<Task | null> {
    return atomicReadWrite(['tasks', 'rooms'], async (stores) => {
      const taskData = await stores.tasks.get<TaskData>(id);
      if (!taskData) return null;
      const task = new Task(taskData);

      if (task.completed) {
        task.reopen();
      } else {
        task.complete();
        if (task.category === 'cleaning' && task.linkedRoomId) {
          const roomData = await stores.rooms.get<RoomData>(task.linkedRoomId);
          if (roomData) {
            const room = new Room(roomData);
            room.vacate();
            stores.rooms.put(room.toData());
          }
        }
      }

      stores.tasks.put(task.toData());
      return task;
    });
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
