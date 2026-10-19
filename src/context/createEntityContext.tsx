import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { onCrossTabRefresh } from '../api/sync';

interface EntityContextValue<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function createEntityContext<T>(
  name: string,
  loadFn: () => Promise<T[]>,
  postProcess?: (data: T[]) => T[],
) {
  const Context = createContext<EntityContextValue<T> | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        let result = await loadFn();
        if (postProcess) result = postProcess(result);
        setData(result);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => onCrossTabRefresh(refresh), [refresh]);

    return (
      <Context.Provider value={useMemo(() => ({ data, loading, error, clearError, refresh }), [data, loading, error, clearError, refresh])}>
        {children}
      </Context.Provider>
    );
  }

  function useEntityContext(): EntityContextValue<T> {
    const context = useContext(Context);
    if (!context) throw new Error(`use${name}Context must be used within ${name}Provider`);
    return context;
  }

  return { Provider, useEntityContext };
}
