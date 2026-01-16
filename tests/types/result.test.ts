/**
 * Tests for Result type utilities
 */

import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr, map, unwrap, unwrapOr } from '../../electron/types/result'

describe('Result Type Utilities', () => {
  describe('ok', () => {
    it('should create a success result', () => {
      const result = ok('test value')
      expect(result.success).toBe(true)
      expect(result.data).toBe('test value')
    })

    it('should work with objects', () => {
      const data = { id: 1, name: 'test' }
      const result = ok(data)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(data)
    })
  })

  describe('err', () => {
    it('should create a failure result', () => {
      const error = new Error('test error')
      const result = err(error)
      expect(result.success).toBe(false)
      expect(result.error).toBe(error)
    })

    it('should work with string errors', () => {
      const result = err('something went wrong')
      expect(result.success).toBe(false)
      expect(result.error).toBe('something went wrong')
    })
  })

  describe('isOk', () => {
    it('should return true for success result', () => {
      const result = ok('value')
      expect(isOk(result)).toBe(true)
    })

    it('should return false for failure result', () => {
      const result = err(new Error('error'))
      expect(isOk(result)).toBe(false)
    })
  })

  describe('isErr', () => {
    it('should return false for success result', () => {
      const result = ok('value')
      expect(isErr(result)).toBe(false)
    })

    it('should return true for failure result', () => {
      const result = err(new Error('error'))
      expect(isErr(result)).toBe(true)
    })
  })

  describe('map', () => {
    it('should transform success value', () => {
      const result = ok(5)
      const mapped = map(result, (x) => x * 2)
      expect(mapped.success).toBe(true)
      if (mapped.success) {
        expect(mapped.data).toBe(10)
      }
    })

    it('should pass through error', () => {
      const error = new Error('test')
      const result = err(error)
      const mapped = map(result, (x: number) => x * 2)
      expect(mapped.success).toBe(false)
      if (!mapped.success) {
        expect(mapped.error).toBe(error)
      }
    })
  })

  describe('unwrap', () => {
    it('should return data from success result', () => {
      const result = ok('value')
      expect(unwrap(result)).toBe('value')
    })

    it('should throw error from failure result', () => {
      const error = new Error('test error')
      const result = err(error)
      expect(() => unwrap(result)).toThrow(error)
    })
  })

  describe('unwrapOr', () => {
    it('should return data from success result', () => {
      const result = ok('value')
      expect(unwrapOr(result, 'default')).toBe('value')
    })

    it('should return default from failure result', () => {
      const result = err(new Error('error'))
      expect(unwrapOr(result, 'default')).toBe('default')
    })
  })
})
