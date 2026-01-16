/**
 * CrashReporter - Handles application crashes and error reporting
 *
 * Provides a centralized way to capture, log, and potentially report crashes.
 */

import { app, crashReporter } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { logger } from './LoggerService.js'

export class CrashReporter {
  private crashDumpDir: string

  constructor() {
    this.crashDumpDir = path.join(app.getPath('userData'), 'crash-dumps')
    this.ensureCrashDumpDir()
  }

  /**
   * Initialize crash reporting
   */
  public initialize(): void {
    try {
      logger.info(`CrashReporter: Initializing (dump dir: ${this.crashDumpDir})`)

      crashReporter.start({
        productName: 'NeuralDeck',
        companyName: 'MurapaDev',
        submitURL: '', // TODO: Add endpoint when backend is ready
        uploadToServer: false, // Local only for now
        ignoreSystemCrashHandler: true,
      })

      // Log last crash if exists
      const lastCrash = crashReporter.getLastCrashReport()
      if (lastCrash) {
        logger.error('CrashReporter: Detect prior crash:', lastCrash)
      }

    } catch (error) {
      logger.error('CrashReporter: Failed to initialize', error)
    }
  }

  private ensureCrashDumpDir(): void {
    if (!fs.existsSync(this.crashDumpDir)) {
      try {
        fs.mkdirSync(this.crashDumpDir, { recursive: true })
      } catch (error) {
        logger.error('CrashReporter: Failed to create dump dir', error)
      }
    }
  }
}

export const crashReporterService = new CrashReporter()
