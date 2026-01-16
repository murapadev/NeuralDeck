/**
 * Logger Service using electron-log
 * Provides file logging, rotation, and multiple transports
 */
import log from 'electron-log'

// Configure electron-log
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// Set log file location
// Linux: ~/.config/NeuralDeck/logs/
// macOS: ~/Library/Logs/NeuralDeck/
// Windows: %USERPROFILE%\AppData\Roaming\NeuralDeck\logs\
log.transports.file.fileName = 'main.log'
log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB

// Format
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}'

// Catch errors
log.errorHandler.startCatching({
  showDialog: false,
  onError: (error) => {
    log.error('Uncaught error:', error)
  }
})

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * Logger wrapper for consistent API
 */
class LoggerService {
  private static instance: LoggerService

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  public info(message: string, ...args: unknown[]): void {
    log.info(message, ...args)
  }

  public warn(message: string, ...args: unknown[]): void {
    log.warn(message, ...args)
  }

  public error(message: string, ...args: unknown[]): void {
    log.error(message, ...args)
  }

  public debug(message: string, ...args: unknown[]): void {
    log.debug(message, ...args)
  }

  // Additional electron-log features
  public verbose(message: string, ...args: unknown[]): void {
    log.verbose(message, ...args)
  }

  public silly(message: string, ...args: unknown[]): void {
    log.silly(message, ...args)
  }

  // Get log file path
  public getLogPath(): string {
    return log.transports.file.getFile().path
  }
}

export const logger = LoggerService.getInstance()

// Export electron-log for advanced usage
export { log }
