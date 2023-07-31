import { useCallback, useContext } from "react"
import { AppContext } from "../utils/context"
import { fakeFetch, RegisteredEndpoints } from "../utils/fetch"
import { useWrappedRequest } from "./useWrappedRequest"
import { Transaction } from "src/utils/types"

export function useCustomFetch() {
  const { cache } = useContext(AppContext)
  const { loading, wrappedRequest } = useWrappedRequest()

  const fetchWithCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const cacheKey = getCacheKey(endpoint, params)
        const cacheResponse = cache?.current.get(cacheKey)

        if (cacheResponse) {
          const data = JSON.parse(cacheResponse)
          return data as Promise<TData>
        }

        const result = await fakeFetch<TData>(endpoint, params)
        cache?.current.set(cacheKey, JSON.stringify(result))
        return result
      }),
    [cache, wrappedRequest]
  )

  const fetchWithoutCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const result = await fakeFetch<TData>(endpoint, params)
        return result
      }),
    [wrappedRequest]
  )

  const fetchAndUpdateTransactionCache = useCallback(
    async <TData>(transactionId: string, value: boolean): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const params = { transactionId, value }
        const result = await fakeFetch<TData>("setTransactionApproval", params)

        if (cache?.current === undefined) {
          return result
        }

        cache.current.forEach((val, key) => {
          // no need to update the cache for employees
          if (key.startsWith("employees")) {
            return
          }

          let data: Transaction[]
          if (key.startsWith("paginatedTransactions")) {
            data = JSON.parse(val).data
          } else {
            data = JSON.parse(val)
          }

          const transactionIndex = data.findIndex((transaction) => transaction.id === transactionId)

          if (transactionIndex === -1) {
            return
          }

          data[transactionIndex].approved = value
          if (key.startsWith("paginatedTransactions")) {
            cache.current.set(key, JSON.stringify({ data, nextPage: JSON.parse(val).nextPage }))
          } else {
            cache.current.set(key, JSON.stringify(data))
          }
        })

        return result
      }),
    [wrappedRequest, cache]
  )

  const clearCache = useCallback(() => {
    if (cache?.current === undefined) {
      return
    }

    cache.current = new Map<string, string>()
  }, [cache])

  const clearCacheByEndpoint = useCallback(
    (endpointsToClear: RegisteredEndpoints[]) => {
      if (cache?.current === undefined) {
        return
      }

      const cacheKeys = Array.from(cache.current.keys())

      for (const key of cacheKeys) {
        const clearKey = endpointsToClear.some((endpoint) => key.startsWith(endpoint))

        if (clearKey) {
          cache.current.delete(key)
        }
      }
    },
    [cache]
  )

  return {
    fetchWithCache,
    fetchWithoutCache,
    clearCache,
    clearCacheByEndpoint,
    fetchAndUpdateTransactionCache,
    loading,
  }
}

function getCacheKey(endpoint: RegisteredEndpoints, params?: object) {
  return `${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
}
