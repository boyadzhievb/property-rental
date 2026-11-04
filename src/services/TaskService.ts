import { format } from 'date-fns';
import { Task, type TaskData, type TaskCategory } from '../domain/Task';
import { TaskSchema } from '../schemas/TaskSchema';
import { taskRepository } from '../repositories/TaskRepository';
import { Room, RoomStatus, type RoomData } from '../domain/Room';
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
          // The room may already have been made Available (or moved on) by hand; then the
          // task is simply done and the room is left as it is.
          if (roomData && roomData.status === RoomStatus.CLEANING) {
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
    const existingAutoTasks = new Map(existing.filter(task => task.auto).map(task => [task.id, task]));

    const wanted: TaskData[] = [
      ...params.cleaningRoomIds.map((room): TaskData => ({
        id: `auto-clean-${room.id}-${today}`,
        title: `Clean ${room.name}`,
        template: { kind: 'clean', roomName: room.name },
        category: 'cleaning',
        completed: false,
        date: today,
        linkedRoomId: room.id,
        auto: true,
      })),
      ...params.preparationRoomIds.map((room): TaskData => ({
        id: `auto-prep-${room.id}-${today}`,
        title: `Prepare ${room.name} for ${room.guestName}`,
        template: { kind: 'prepare', roomName: room.name, guestName: room.guestName },
        category: 'preparation',
        completed: false,
        date: today,
        linkedRoomId: room.id,
        auto: true,
      })),
      ...params.pendingPayments.map((payment): TaskData => ({
        id: `auto-pay-${payment.reservationId}-${today}`,
        title: `Check payment from ${payment.guestName}`,
        template: { kind: 'checkPayment', guestName: payment.guestName },
        category: 'payment',
        completed: false,
        date: today,
        linkedReservationId: payment.reservationId,
        auto: true,
      })),
    ];

    for (const data of wanted) {
      const current = existingAutoTasks.get(data.id);
      if (!current) {
        await taskRepository.save(new Task(data));
      } else if (!current.template) {
        // Created by an older version with an English-only title: add the template, keep its state.
        await taskRepository.save(new Task({ ...current.toData(), template: data.template }));
      }
    }

    return taskRepository.getByDate(today);
  }
}

export const taskService = new TaskService();
