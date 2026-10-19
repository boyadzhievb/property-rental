const CHANNEL_NAME = 'property-rental-sync';

type SyncHandler = () => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<SyncHandler>();

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => {
      for (const handler of listeners) handler();
    };
  }
  return channel;
}

export function notifyOtherTabs(): void {
  getChannel()?.postMessage('refresh');
}

export function onCrossTabRefresh(handler: SyncHandler): () => void {
  getChannel();
  listeners.add(handler);
  return () => { listeners.delete(handler); };
}
