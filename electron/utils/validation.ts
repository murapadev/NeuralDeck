import type { ProviderConfig } from '../../shared/types.js'

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
  const updatesRecord = updates as Record<string, unknown>
  
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(updatesRecord, key)) {
      // We can't guarantee the type of the value at runtime without a schema, 
      // but we can at least avoid the explicit 'any' and trust the caller or add specific checks if T is known.
      // For a generic sanitizer, copying the value is the goal.
      // However, Typescript still complains about assigning unknown to T[keyof T].
      // We'll use a safer cast.
      sanitized[key] = updatesRecord[key as string] as T[typeof key]
    }
  }

  return sanitized
}
