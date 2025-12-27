/**
 * ErrorService - Centralized error handling for main process
 *
 * Provides consistent error normalization, logging, and user notification
 * for both recoverable and fatal errors.
 */

import { app, dialog } from 'electron'
import { logger } from './LoggerService.js'

/**
 * Structured application error with context
 */
export interface AppError {
  /** Error code for programmatic handling */
  code: string
  /** Human-readable error message */
  message: string
  /** Additional context for debugging */
  context?: Record<string, unknown>
  /** Whether the app can continue after this error */
  recoverable: boolean
}

/**
 * Error codes used throughout the application
 */
export const ERROR_CODES = {
  UNKNOWN: 'UNKNOWN_ERROR',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  WINDOW_CREATION_FAILED: 'WINDOW_CREATION_FAILED',
  CONFIG_LOAD_FAILED: 'CONFIG_LOAD_FAILED',
  IPC_ERROR: 'IPC_ERROR',
  VIEW_ERROR: 'VIEW_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/**
 * Centralized error handling service (singleton)
 */
export class ErrorService {
  private static instance: ErrorService

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  /**
   * Handle a recoverable error
   * Logs the error and returns a normalized AppError
   */
  public handleError(error: unknown, context?: string): AppError {
    const appError = this.normalizeError(error, context)
    logger.error(`[${appError.code}] ${appError.message}`, appError.context)
    return appError
  }

  /**
   * Handle a fatal error that requires app restart
   * Shows a dialog and quits the application
   */
  public handleFatalError(error: unknown, context?: string): never {
    const appError = this.handleError(error, context)
    
    dialog.showErrorBox(
      'NeuralDeck Error',
      `${appError.message}\n\nThe application will now close. Please restart.`
    )
    
    app.quit()
    process.exit(1)
  }

  /**
   * Create a structured AppError from a code and message
   */
  public createError(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>
  ): AppError {
    return {
      code,
      message,
      context,
      recoverable: true,
    }
  }

  /**
   * Normalize any error type to AppError
   */
  private normalizeError(error: unknown, contextInfo?: string): AppError {
    const context: Record<string, unknown> = {}
    if (contextInfo) {
      context.context = contextInfo
    }

    if (error instanceof Error) {
      context.stack = error.stack
      return {
        code: error.name || ERROR_CODES.UNKNOWN,
        message: error.message,
        context,
        recoverable: true,
      }
    }

    if (typeof error === 'string') {
      return {
        code: ERROR_CODES.UNKNOWN,
        message: error,
        context,
        recoverable: true,
      }
    }

    return {
      code: ERROR_CODES.UNKNOWN,
      message: String(error),
      context,
      recoverable: true,
    }
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance()
