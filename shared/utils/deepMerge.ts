export type PlainObject = Record<string, unknown>

function isPlainObject(value: unknown): value is PlainObject {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Deep merge two objects. Arrays are replaced, not merged.
 */
export function deepMerge<T>(base: T, override: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override ?? base) as T
  }

  const result: PlainObject = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      result[key] = value
      continue
    }

    if (isPlainObject(value)) {
      const baseValue = result[key]
      result[key] = deepMerge(isPlainObject(baseValue) ? baseValue : {}, value)
      continue
    }

    if (value !== undefined) {
      result[key] = value
    }
  }

  return result as T
}

export function isPlainObjectLike(value: unknown): value is PlainObject {
  return isPlainObject(value)
}
