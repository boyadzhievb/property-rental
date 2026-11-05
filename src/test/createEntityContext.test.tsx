import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'

vi.mock('../services/DataChangeService', () => ({
  dataChangeService: { subscribe: vi.fn() },
}))

import { createEntityContext } from '../context/createEntityContext'
import { dataChangeService, type StoreName } from '../services/DataChangeService'

const mockedSubscribe = vi.mocked(dataChangeService.subscribe)

/** Handlers the context registered, so a test can play the part of the data layer. */
let changeHandlers: { stores: readonly StoreName[]; handler: () => void }[] = []

function announceChange(store: StoreName) {
  for (const { stores, handler } of changeHandlers) if (stores.includes(store)) handler()
}

interface TestItem {
  id: string
  name: string
}

describe('createEntityContext', () => {
  let mockLoadFunction: ReturnType<typeof vi.fn<() => Promise<TestItem[]>>>

  beforeEach(() => {
    mockLoadFunction = vi.fn<() => Promise<TestItem[]>>()
    changeHandlers = []
    mockedSubscribe.mockReset()
    mockedSubscribe.mockImplementation((stores, handler) => {
      const entry = { stores, handler }
      changeHandlers.push(entry)
      return () => { changeHandlers = changeHandlers.filter(e => e !== entry) }
    })
  })

  function createTestContext(
    loadFunction?: () => Promise<TestItem[]>,
    postProcess?: (data: TestItem[]) => TestItem[],
  ) {
    const actualLoadFunction = loadFunction ?? (() => mockLoadFunction())
    return createEntityContext<TestItem>('Test', ['rooms'], actualLoadFunction, postProcess)
  }

  it('starts in loading state and resolves with data', async () => {
    const items: TestItem[] = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
    ]
    mockLoadFunction.mockResolvedValue(items)

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    // Initially loading
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(items)
    expect(result.current.error).toBeNull()
  })

  it('sets error when loadFn throws', async () => {
    mockLoadFunction.mockRejectedValue(new Error('Database connection failed'))

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Database connection failed')
    expect(result.current.data).toEqual([])
  })

  it('sets "Unknown error" when loadFn throws a non-Error value', async () => {
    mockLoadFunction.mockRejectedValue('string error')

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Unknown error')
  })

  it('clearError resets error to null', async () => {
    mockLoadFunction.mockRejectedValue(new Error('Load failure'))

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.error).toBe('Load failure')
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('refresh reloads data from loadFn', async () => {
    const initialItems: TestItem[] = [{ id: '1', name: 'First' }]
    const updatedItems: TestItem[] = [
      { id: '1', name: 'First' },
      { id: '2', name: 'Second' },
    ]
    mockLoadFunction
      .mockResolvedValueOnce(initialItems)
      .mockResolvedValueOnce(updatedItems)

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual(initialItems)

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.data).toEqual(updatedItems)
    expect(mockLoadFunction).toHaveBeenCalledTimes(2)
  })

  it('refresh clears previous error on success', async () => {
    const items: TestItem[] = [{ id: '1', name: 'Recovered' }]
    mockLoadFunction
      .mockRejectedValueOnce(new Error('First load failed'))
      .mockResolvedValueOnce(items)

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.error).toBe('First load failed')
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(items)
  })

  it('applies postProcess function to loaded data', async () => {
    const unsortedItems: TestItem[] = [
      { id: '2', name: 'Beta' },
      { id: '1', name: 'Alpha' },
    ]
    mockLoadFunction.mockResolvedValue(unsortedItems)

    const sortByName = (items: TestItem[]) =>
      [...items].sort((a, b) => a.name.localeCompare(b.name))

    const { Provider, useEntityContext } = createTestContext(undefined, sortByName)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data[0].name).toBe('Alpha')
    expect(result.current.data[1].name).toBe('Beta')
  })

  it('throws when useEntityContext is used outside Provider', () => {
    const { useEntityContext } = createTestContext()

    // Suppress console.error from React error boundary
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useEntityContext())
    }).toThrow('useTestContext must be used within TestProvider')

    consoleSpy.mockRestore()
  })

  it('subscribes to its own stores on mount', async () => {
    mockLoadFunction.mockResolvedValue([])

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(mockedSubscribe).toHaveBeenCalledWith(['rooms'], expect.any(Function))
    })
  })

  it('reloads without a loading state when its store changes', async () => {
    mockLoadFunction
      .mockResolvedValueOnce([{ id: '1', name: 'Before' }])
      .mockResolvedValueOnce([{ id: '1', name: 'After' }])

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'Before' }]))

    act(() => announceChange('rooms'))

    expect(result.current.loading).toBe(false)
    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'After' }]))
    expect(mockLoadFunction).toHaveBeenCalledTimes(2)
  })

  it('does not reload when an unrelated store changes', async () => {
    mockLoadFunction.mockResolvedValue([])

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => announceChange('guests'))

    expect(mockLoadFunction).toHaveBeenCalledTimes(1)
  })

  it('keeps the newest data when an older reload finishes last', async () => {
    let resolveSlowLoad: (value: TestItem[]) => void = () => {}
    mockLoadFunction
      .mockResolvedValueOnce([{ id: '1', name: 'Initial' }])
      .mockReturnValueOnce(new Promise<TestItem[]>((resolve) => { resolveSlowLoad = resolve }))
      .mockResolvedValueOnce([{ id: '1', name: 'Newest' }])

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'Initial' }]))

    act(() => announceChange('rooms')) // slow load starts
    act(() => announceChange('rooms')) // newer load starts
    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'Newest' }]))

    await act(async () => { resolveSlowLoad([{ id: '1', name: 'Stale' }]) })

    expect(result.current.data).toEqual([{ id: '1', name: 'Newest' }])
  })

  it('unsubscribes on unmount', async () => {
    mockLoadFunction.mockResolvedValue([])

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { unmount } = renderHook(() => useEntityContext(), { wrapper })
    await waitFor(() => expect(changeHandlers).toHaveLength(1))

    unmount()

    expect(changeHandlers).toHaveLength(0)
  })

  it('returns empty data array when loadFn returns empty', async () => {
    mockLoadFunction.mockResolvedValue([])

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('sets loading to true during refresh and back to false after', async () => {
    let resolveSecondLoad: (value: TestItem[]) => void
    mockLoadFunction
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(
        new Promise<TestItem[]>((resolve) => {
          resolveSecondLoad = resolve
        }),
      )

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { result } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Start refresh but don't resolve yet
    let refreshPromise: Promise<void>
    act(() => {
      refreshPromise = result.current.refresh()
    })

    // Loading should be true while awaiting
    expect(result.current.loading).toBe(true)

    // Resolve and complete
    await act(async () => {
      resolveSecondLoad!([{ id: '1', name: 'Loaded' }])
      await refreshPromise!
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual([{ id: '1', name: 'Loaded' }])
  })
})
