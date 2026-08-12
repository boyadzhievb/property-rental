import { api } from '../api/client';
import { Task } from '../domain/Task';

export class TaskRepository {
  async getAll(): Promise<Task[]> {
    const data = await api.tasks.getAll();
    return data.map(d => new Task(d));
  }

  async getByDate(date: string): Promise<Task[]> {
    const data = await api.tasks.getByDate(date);
    return data.map(d => new Task(d));
  }

  async getById(id: string): Promise<Task | null> {
    try {
      const data = await api.tasks.getById(id);
      return data ? new Task(data) : null;
    } catch {
      return null;
    }
  }

  async save(task: Task): Promise<Task> {
    const data = task.toData();
    const saved = await api.tasks.put(data);
    return new Task(saved);
  }

  async delete(id: string): Promise<void> {
    await api.tasks.delete(id);
  }
}

export const taskRepository = new TaskRepository();
