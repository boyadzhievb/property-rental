import { type Task } from '../domain/Task';
import { taskService } from '../services/TaskService';
import { createEntityContext } from './createEntityContext';

const { Provider, useEntityContext } = createEntityContext<Task>(
  'Task',
  () => taskService.getTodayTasks(),
);

export const TaskProvider = Provider;

export function useTaskContext() {
  const { data: tasks, ...rest } = useEntityContext();
  return { tasks, ...rest };
}
