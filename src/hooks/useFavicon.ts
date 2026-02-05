/**
 * Hook for loading provider favicons from the backend
 */

import { useEffect, useState } from 'react'
import { trpc } from '../utils/trpc'

// Cache favicons in memory to avoid repeated requests
const faviconCache = new Map<string, string>()

/**
 * Hook to get a provider's favicon as a data URL
 * Returns null while loading, the data URL when loaded, or null if failed
 */
export function useFavicon(providerId: string, size: number = 32) {
  const [favicon, setFavicon] = useState<string | null>(() => {
    // Check cache first
    const cached = faviconCache.get(`${providerId}-${size}`)
    return cached || null
  })

  const { data, isLoading } = trpc.getProviderIcon.useQuery(
    { providerId, size },
    {
      enabled: !faviconCache.has(`${providerId}-${size}`),
      staleTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )

  useEffect(() => {
    if (data) {
      const cacheKey = `${providerId}-${size}`
      faviconCache.set(cacheKey, data)
      setFavicon(data)
    }
  }, [data, providerId, size])

  return { favicon, isLoading }
}

/**
 * Preload favicons for multiple providers
 */
export function useFavicons(providerIds: string[], size: number = 32) {
  const [favicons, setFavicons] = useState<Record<string, string | null>>({})

  // Create queries for each provider
  const queries = providerIds.map((providerId) => {
    const cacheKey = `${providerId}-${size}`
    return {
      providerId,
      cached: faviconCache.get(cacheKey) || null,
    }
  })

  // Initialize from cache
  useEffect(() => {
    const initial: Record<string, string | null> = {}
    queries.forEach(({ providerId, cached }) => {
      initial[providerId] = cached
    })
    setFavicons(initial)
  }, [providerIds.join(',')])

  return favicons
}

/**
 * Clear favicon cache (useful after config changes)
 */
export function clearFaviconCache() {
  faviconCache.clear()
}
