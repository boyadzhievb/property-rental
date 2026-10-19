import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'

vi.mock('../api/sync', () => ({
  onCrossTabRefresh: vi.fn(() => vi.fn()),
}))

import { createEntityContext } from '../context/createEntityContext'
import { onCrossTabRefresh } from '../api/sync'

const mockedOnCrossTabRefresh = vi.mocked(onCrossTabRefresh)

interface TestItem {
  id: string
  name: string
}

describe('createEntityContext', () => {
  let mockLoadFunction: ReturnType<typeof vi.fn<() => Promise<TestItem[]>>>

  beforeEach(() => {
    mockLoadFunction = vi.fn<() => Promise<TestItem[]>>()
    mockedOnCrossTabRefresh.mockClear()
    // Default: return a cleanup function
    mockedOnCrossTabRefresh.mockReturnValue(vi.fn())
  })

  function createTestContext(
    loadFunction?: () => Promise<TestItem[]>,
    postProcess?: (data: TestItem[]) => TestItem[],
  ) {
    const actualLoadFunction = loadFunction ?? (() => mockLoadFunction())
    return createEntityContext<TestItem>('Test', actualLoadFunction, postProcess)
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

  it('registers cross-tab refresh handler on mount', async () => {
    mockLoadFunction.mockResolvedValue([])

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(mockedOnCrossTabRefresh).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  it('unsubscribes cross-tab handler on unmount', async () => {
    mockLoadFunction.mockResolvedValue([])

    const unsubscribeMock = vi.fn()
    mockedOnCrossTabRefresh.mockReturnValue(unsubscribeMock)

    const { Provider, useEntityContext } = createTestContext()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    )

    const { unmount } = renderHook(() => useEntityContext(), { wrapper })

    await waitFor(() => {
      expect(mockedOnCrossTabRefresh).toHaveBeenCalled()
    })

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
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
