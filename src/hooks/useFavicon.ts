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
  // Create a stable key for the providers list
  const providersKey = providerIds.join(',')

  // Initialize from cache
  useEffect(() => {
    const initial: Record<string, string | null> = {}
    // Reconstruct list from key to avoid dependency on providerIds array reference
    // This assumes providerIds do not contain commas
    if (providersKey) {
      providersKey.split(',').forEach((providerId) => {
        const cacheKey = `${providerId}-${size}`
        initial[providerId] = faviconCache.get(cacheKey) || null
      })
    }
    setFavicons(initial)
  }, [providersKey, size])

  return favicons
}

/**
 * Clear favicon cache (useful after config changes)
 */
export function clearFaviconCache() {
  faviconCache.clear()
}
