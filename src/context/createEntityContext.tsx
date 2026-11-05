import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { dataChangeService, type StoreName } from '../services/DataChangeService';

interface EntityContextValue<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  /** Reload with a loading indicator, e.g. to retry after an error. Data changes reload on their own. */
  refresh: () => Promise<void>;
}

/**
 * A context that owns one entity list. It loads on mount and reloads by itself whenever one of
 * `stores` changes (a committed write in this tab or another one), so screens never refresh
 * lists after an action.
 */
export function createEntityContext<T>(
  name: string,
  stores: readonly StoreName[],
  loadFn: () => Promise<T[]>,
  postProcess?: (data: T[]) => T[],
) {
  const Context = createContext<EntityContextValue<T> | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Loads can overlap (rapid changes); only the most recent one may update state, so a slow
    // older load cannot overwrite newer data.
    const latestLoad = useRef(0);

    const load = useCallback(async (showLoading: boolean) => {
      const loadId = ++latestLoad.current;
      if (showLoading) setLoading(true);
      try {
        let result = await loadFn();
        if (postProcess) result = postProcess(result);
        if (loadId !== latestLoad.current) return;
        setData(result);
        setError(null);
      } catch (e: unknown) {
        if (loadId !== latestLoad.current) return;
        console.error('Loading data failed:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (loadId === latestLoad.current) setLoading(false);
      }
    }, []);

    const refresh = useCallback(() => load(true), [load]);
    const clearError = useCallback(() => setError(null), []);

    useEffect(() => { refresh(); }, [refresh]);
    // Background reloads keep the current list on screen instead of flashing a loading state.
    useEffect(() => dataChangeService.subscribe(stores, () => { load(false); }), [load]);

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
