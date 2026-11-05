import { onDataChange, type StoreName } from '../api/client';

export type { StoreName };

/**
 * Lets contexts and hooks react to committed data changes (from this tab or another one)
 * without importing the data layer. The data layer announces changes; nothing here writes.
 */
export class DataChangeService {
  /** Call `handler` whenever any of `stores` changed. Returns an unsubscribe function. */
  subscribe(stores: readonly StoreName[], handler: () => void): () => void {
    return onDataChange((changedStores) => {
      if (stores.some((store) => changedStores.has(store))) handler();
    });
  }
}

export const dataChangeService = new DataChangeService();
