export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class LoggerService {
  private static instance: LoggerService

  private constructor() {}

  /* eslint-disable no-console */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`
  }

  public info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage('info', message), ...args)
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args)
  }

  public error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message), ...args)
  }

  public debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }
}

export const logger = LoggerService.getInstance()
