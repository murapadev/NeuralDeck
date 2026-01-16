/**
 * IpcManager - Centralized IPC handler registration
 *
 * Manages all IPC (Inter-Process Communication) handlers between
 * the main process and renderer processes.
 */

import { ipcMain, shell } from 'electron'
import { WindowManager } from './WindowManager.js'
import { ViewManager } from './ViewManager.js'
import { AutoUpdateManager } from './AutoUpdateManager.js'
import { logger } from './LoggerService.js'

import { IPC_CHANNELS } from '../../shared/types.js'

/**
 * IpcManager handles registration of all IPC handlers
 */
export class IpcManager {
  private windowManager: WindowManager
  private viewManager: ViewManager
  private autoUpdateManager: AutoUpdateManager
  private registered = false

  /**
   * @param windowManager - Main window manager
   * @param viewManager - Browser view manager
   * @param autoUpdateManager - Auto-update service
   */
  constructor(
    windowManager: WindowManager,
    viewManager: ViewManager,
    autoUpdateManager: AutoUpdateManager
  ) {
    this.windowManager = windowManager
    this.viewManager = viewManager
    this.autoUpdateManager = autoUpdateManager
  }

  /**
   * Register all IPC handlers
   * Should only be called once during app initialization
   */
  public registerAll(): void {
    if (this.registered) {
      logger.warn('IpcManager: Handlers already registered, skipping')
      return
    }

    // Settings window handlers
    ipcMain.on(IPC_CHANNELS.OPEN_SETTINGS_WINDOW, () => {
      this.windowManager.openSettingsWindow()
    })

    ipcMain.on(IPC_CHANNELS.CLOSE_SETTINGS_WINDOW, () => {
      this.windowManager.closeSettingsWindow()
    })

    // View management handlers
    ipcMain.on(IPC_CHANNELS.SWITCH_VIEW, (_, providerId: string) => {
      // Validate providerId exists in config
      if (typeof providerId === 'string' && /^[a-zA-Z0-9_-]+$/.test(providerId)) {
         this.viewManager.switchView(providerId)
      } else {
         logger.warn(`IpcManager: Invalid providerId received: ${providerId}`)
      }
    })

    ipcMain.on(IPC_CHANNELS.OPEN_EXTERNAL, (_, url: string) => {
      if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        this.handleOpenExternal(url)
      } else {
        logger.warn(`IpcManager: Invalid external URL received: ${url}`)
      }
    })

    // Navigation handlers
    ipcMain.on(IPC_CHANNELS.RELOAD, () => {
      this.viewManager.reloadCurrent()
    })

    ipcMain.on(IPC_CHANNELS.GO_BACK, () => {
      this.viewManager.goBack()
    })

    ipcMain.on(IPC_CHANNELS.GO_FORWARD, () => {
      this.viewManager.goForward()
    })

    // Auto-update handlers
    ipcMain.on(IPC_CHANNELS.DOWNLOAD_UPDATE, () => {
      this.autoUpdateManager.downloadUpdate()
    })

    ipcMain.on(IPC_CHANNELS.INSTALL_UPDATE, () => {
      this.autoUpdateManager.quitAndInstall()
    })

    // Debugging handler
    ipcMain.on(IPC_CHANNELS.RENDERER_LOG, (_, message: string) => {
      logger.info('[Renderer]', message)
    })

    this.registered = true
    logger.info('IpcManager: All handlers registered')
  }

  /**
   * Handle opening external URLs
   * Attempts to create a detached window, falls back to system browser
   */
  private handleOpenExternal(url: string): void {
    if (!url) {
      logger.warn('IpcManager: Empty URL provided to open-external')
      return
    }

    try {
      this.windowManager.createDetachedWindow(url)
    } catch (error) {
      logger.warn('IpcManager: Failed to create detached window, falling back to shell:', error)
      shell.openExternal(url)
    }
  }
}
