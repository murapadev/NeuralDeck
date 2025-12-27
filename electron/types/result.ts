/**
 * Result type for operations that can fail
 *
 * Provides a type-safe way to handle errors without exceptions,
 * following the Railway Oriented Programming pattern.
 *
 * @example
 * const result = validateProvider(input)
 * if (result.success) {
 *   console.log(result.data) // ProviderConfig
 * } else {
 *   console.error(result.error) // Error
 * }
 */

/**
 * Success variant of Result
 */
export interface Success<T> {
  success: true
  data: T
}

/**
 * Failure variant of Result
 */
export interface Failure<E> {
  success: false
  error: E
}

/**
 * Result type - either Success with data or Failure with error
 */
export type Result<T, E = Error> = Success<T> | Failure<E>

/**
 * Create a success result
 */
export const ok = <T>(data: T): Success<T> => ({ success: true, data })

/**
 * Create a failure result
 */
export const err = <E>(error: E): Failure<E> => ({ success: false, error })

/**
 * Check if result is success
 */
export const isOk = <T, E>(result: Result<T, E>): result is Success<T> =>
  result.success

/**
 * Check if result is failure
 */
export const isErr = <T, E>(result: Result<T, E>): result is Failure<E> =>
  !result.success

/**
 * Map over a success result
 */
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> => {
  if (result.success) {
    return ok(fn(result.data))
  }
  return result
}

/**
 * Unwrap a result, throwing if it's an error
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.success) {
    return result.data
  }
  throw result.error
}

/**
 * Unwrap a result with a default value
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (result.success) {
    return result.data
  }
  return defaultValue
}
