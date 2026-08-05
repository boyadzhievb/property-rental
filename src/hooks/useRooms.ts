import { useRoomContext } from '../context/RoomContext';

export function useRooms() {
  return useRoomContext();
}
