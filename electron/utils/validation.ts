import type { ProviderConfig } from '../config/types'

/**
 * Validates a URL string to ensure it uses http or https protocol
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Validates a complete provider configuration object
 */
export function validateProviderConfig(
  provider: Partial<ProviderConfig>
): provider is ProviderConfig {
  return !!(
    provider.id &&
    provider.name &&
    provider.url &&
    validateURL(provider.url) &&
    provider.color &&
    /^#[0-9A-F]{6}$/i.test(provider.color)
  )
}

/**
 * Sanitizes a config update object to only include allowed keys
 */
export function sanitizeConfigUpdate<T extends object>(
  updates: unknown,
  allowedKeys: (keyof T)[]
): Partial<T> {
  if (!updates || typeof updates !== 'object') {
    return {}
  }

  const sanitized: Partial<T> = {}
  for (const key of allowedKeys) {
    if (key in updates) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sanitized[key] = (updates as any)[key]
    }
  }

  return sanitized
}
