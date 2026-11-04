import type { TaskData } from '../domain/Task';
import type { TranslationKeys } from './en';

/**
 * Title to show for a task: automatic tasks are built from their template in the current
 * language; manual tasks (and automatic ones saved before templates existed) use `title`.
 */
export function taskTitle(task: Pick<TaskData, 'title' | 'template'>, t: TranslationKeys): string {
  const { template } = task;
  if (!template) return task.title;

  const pattern = {
    clean: t.autoTaskClean,
    prepare: t.autoTaskPrepare,
    checkPayment: t.autoTaskCheckPayment,
  }[template.kind];
  // Function replacers, so names containing "$&" or "$1" are inserted literally.
  return pattern
    .replace('{room}', () => template.roomName ?? '')
    .replace('{guest}', () => template.guestName ?? '');
}
