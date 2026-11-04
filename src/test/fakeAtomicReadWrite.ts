import type { StoreAccessor } from '../api/client'

type RecordMap = Map<string, Record<string, unknown>>

/**
 * In-memory stand-in for `atomicReadWrite` over Map-backed test stores. Index lookups match the
 * field with the index's name (the real indexes are named after their key paths). Writes are
 * buffered and applied only when the callback succeeds, mirroring a transaction rollback.
 */
export async function fakeAtomicReadWrite<T>(
  maps: Record<string, RecordMap>,
  storeNames: string[],
  callback: (stores: Record<string, StoreAccessor>) => Promise<T>,
): Promise<T> {
  const working = new Map(storeNames.map(name => [name, new Map(maps[name] ?? [])]))

  const stores: Record<string, StoreAccessor> = {}
  for (const name of storeNames) {
    const map = working.get(name)!
    stores[name] = {
      get: async <V>(key: string) => map.get(key) as V | undefined,
      getAll: async <V>() => [...map.values()] as V[],
      getAllByIndex: async <V>(indexName: string, key: IDBValidKey) =>
        [...map.values()].filter(record => record[indexName] === key) as V[],
      put: (data: unknown) => {
        const record = data as Record<string, unknown>
        map.set(String(record.id), record)
      },
      delete: (key: string) => { map.delete(key) },
    }
  }

  const result = await callback(stores)

  for (const [name, map] of working) {
    const target = maps[name]
    if (!target) continue
    target.clear()
    for (const [key, value] of map) target.set(key, value)
  }
  return result
}
