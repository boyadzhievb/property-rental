/**
 * Change announcements: after a write commits, the data layer announces which stores changed.
 * Listeners in this tab are called directly; other tabs hear it over a BroadcastChannel (which
 * never delivers a tab's own messages, hence both paths).
 */
import { ALL_STORES, type StoreName } from './db';

const CHANNEL_NAME = 'property-rental-sync';

export type ChangeHandler = (changedStores: ReadonlySet<StoreName>) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<ChangeHandler>();

function isStoreName(value: unknown): value is StoreName {
  return (ALL_STORES as readonly unknown[]).includes(value);
}

/** Stores named in a message from another tab. Anything unreadable means "assume everything changed". */
function storesFromMessage(message: unknown): Set<StoreName> {
  if (typeof message === 'object' && message !== null && 'stores' in message && Array.isArray(message.stores)) {
    const stores = message.stores.filter(isStoreName);
    if (stores.length > 0) return new Set(stores);
  }
  return new Set(ALL_STORES);
}

function deliver(changedStores: ReadonlySet<StoreName>): void {
  // Iterate over a copy: a handler may subscribe or unsubscribe while being called.
  for (const handler of Array.from(listeners)) {
    try {
      handler(changedStores);
    } catch (error) {
      // One failing listener must not stop the others from hearing about the change.
      console.error('Data change listener failed:', error);
    }
  }
}

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent) => deliver(storesFromMessage(event.data));
  }
  return channel;
}

/** Call only after the write has committed. Does nothing when no store changed. */
export function announceChanges(stores: Iterable<StoreName>): void {
  const changedStores = new Set(stores);
  if (changedStores.size === 0) return;
  deliver(changedStores);
  getChannel()?.postMessage({ stores: [...changedStores] });
}

/** Listen for committed changes from this tab and from other tabs. Returns an unsubscribe function. */
export function onDataChange(handler: ChangeHandler): () => void {
  getChannel();
  listeners.add(handler);
  return () => { listeners.delete(handler); };
}
