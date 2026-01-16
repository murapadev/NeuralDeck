/**
 * Tests for ErrorService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    quit: vi.fn(),
  },
  dialog: {
    showErrorBox: vi.fn(),
  },
}))

// Mock logger
vi.mock('../../electron/services/LoggerService.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ErrorService', () => {
  let ErrorService: typeof import('../../electron/services/ErrorService').ErrorService
  let errorService: typeof import('../../electron/services/ErrorService').errorService
  let ERROR_CODES: typeof import('../../electron/services/ErrorService').ERROR_CODES

  beforeEach(async () => {
    vi.resetModules()
    
    const module = await import('../../electron/services/ErrorService')
    ErrorService = module.ErrorService
    errorService = module.errorService
    ERROR_CODES = module.ERROR_CODES
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ERROR_CODES', () => {
    it('should export all error code constants', () => {
      expect(ERROR_CODES.UNKNOWN).toBe('UNKNOWN_ERROR')
      expect(ERROR_CODES.PROVIDER_NOT_FOUND).toBe('PROVIDER_NOT_FOUND')
      expect(ERROR_CODES.WINDOW_CREATION_FAILED).toBe('WINDOW_CREATION_FAILED')
      expect(ERROR_CODES.CONFIG_LOAD_FAILED).toBe('CONFIG_LOAD_FAILED')
      expect(ERROR_CODES.IPC_ERROR).toBe('IPC_ERROR')
      expect(ERROR_CODES.VIEW_ERROR).toBe('VIEW_ERROR')
    })
  })

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ErrorService.getInstance()
      const instance2 = ErrorService.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should return same instance as exported errorService', () => {
      const instance = ErrorService.getInstance()
      expect(instance).toBe(errorService)
    })
  })

  describe('handleError', () => {
    it('should normalize Error objects', () => {
      const error = new Error('Test error message')
      const result = errorService.handleError(error)
      
      expect(result.code).toBe('Error')
      expect(result.message).toBe('Test error message')
      expect(result.recoverable).toBe(true)
      expect(result.context?.stack).toBeDefined()
    })

    it('should normalize string errors', () => {
      const result = errorService.handleError('Something went wrong')
      
      expect(result.code).toBe(ERROR_CODES.UNKNOWN)
      expect(result.message).toBe('Something went wrong')
      expect(result.recoverable).toBe(true)
    })

    it('should include context information', () => {
      const error = new Error('Test')
      const result = errorService.handleError(error, 'During initialization')
      
      expect(result.context?.context).toBe('During initialization')
    })

    it('should handle unknown error types', () => {
      const result = errorService.handleError({ weird: 'object' })
      
      expect(result.code).toBe(ERROR_CODES.UNKNOWN)
      expect(result.message).toContain('[object Object]')
    })
  })

  describe('createError', () => {
    it('should create a structured error', () => {
      const error = errorService.createError(
        ERROR_CODES.PROVIDER_NOT_FOUND,
        'Provider chatgpt not found',
        { providerId: 'chatgpt' }
      )
      
      expect(error.code).toBe(ERROR_CODES.PROVIDER_NOT_FOUND)
      expect(error.message).toBe('Provider chatgpt not found')
      expect(error.context?.providerId).toBe('chatgpt')
      expect(error.recoverable).toBe(true)
    })
  })
})
