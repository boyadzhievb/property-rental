import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Room } from '../domain/Room';
import { roomService } from '../services/RoomService';

interface RoomContextValue {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomService.getRooms();
      data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setRooms(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <RoomContext.Provider value={{ rooms, loading, error, refresh }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext() {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoomContext must be used within RoomProvider');
  return context;
}
