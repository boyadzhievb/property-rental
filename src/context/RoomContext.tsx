import { type Room } from '../domain/Room';
import { roomService } from '../services/RoomService';
import { createEntityContext } from './createEntityContext';

const { Provider, useEntityContext } = createEntityContext<Room>(
  'Room',
  () => roomService.getRooms(),
  (rooms) => rooms.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
);

export const RoomProvider = Provider;

export function useRoomContext() {
  const { data: rooms, ...rest } = useEntityContext();
  return { rooms, ...rest };
}
