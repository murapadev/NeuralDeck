/**
 * AutoUpdateManager - Handles application auto-updates
 *
 * Wraps electron-updater functionality and communicates with the renderer process.
 */

import { autoUpdater } from 'electron-updater'
import { WindowManager } from './WindowManager.js'
import { logger } from './LoggerService.js'
import { TIMING, IPC_CHANNELS } from '../../shared/types.js'

export class AutoUpdateManager {
  private windowManager: WindowManager
  private updateInterval: NodeJS.Timeout | null = null
  private startupTimeout: NodeJS.Timeout | null = null

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
    this.initialize()
  }

  /**
   * Initialize auto-updater configuration and listeners
   */
  private initialize(): void {
    autoUpdater.logger = logger
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    this.setupListeners()
  }

  /**
   * Setup auto-updater event listeners
   */
  private setupListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for updates...')
    })

    autoUpdater.on('update-available', (info) => {
      logger.info('Update available:', info.version)
      const mainWindow = this.windowManager.mainWindow
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, info)
      }
    })

    autoUpdater.on('update-not-available', (info) => {
      logger.info('Update not available. Current version:', info.version)
    })

    autoUpdater.on('error', (err) => {
      logger.error('Error in auto-updater:', err)
      const mainWindow = this.windowManager.mainWindow
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.UPDATE_ERROR, err)
      }
    })

    autoUpdater.on('download-progress', (progressObj) => {
      const mainWindow = this.windowManager.mainWindow
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.DOWNLOAD_PROGRESS, progressObj)
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded:', info.version)
      const mainWindow = this.windowManager.mainWindow
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED, info)
      }
    })
  }

  /**
   * Start checking for updates periodically
   */
  public startUpdateChecks(): void {
    // Check for updates on startup (after delay)
    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout)
    }
    this.startupTimeout = setTimeout(() => {
      this.checkForUpdates()
    }, TIMING.UPDATE_CHECK_DELAY)

    // Check for updates periodically
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    this.updateInterval = setInterval(() => {
      this.checkForUpdates()
    }, TIMING.UPDATE_CHECK_INTERVAL)
  }

  /**
   * Stop scheduled update checks (used on shutdown)
   */
  public stopUpdateChecks(): void {
    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout)
      this.startupTimeout = null
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * Trigger an update check (only in production)
   */
  public checkForUpdates(): void {
    if (process.env.NODE_ENV === 'production') {
      autoUpdater.checkForUpdates().catch((err) => {
        logger.error('Failed to check for updates:', err)
      })
    } else {
        logger.info('Skipping update check in development mode')
    }
  }

  /**
   * Download the available update
   */
  public downloadUpdate(): void {
    autoUpdater.downloadUpdate()
  }

  /**
   * Quit and install the downloaded update
   */
  public quitAndInstall(): void {
    autoUpdater.quitAndInstall()
  }
}
