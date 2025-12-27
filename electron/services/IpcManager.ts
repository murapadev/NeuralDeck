/**
 * IpcManager - Centralized IPC handler registration
 *
 * Manages all IPC (Inter-Process Communication) handlers between
 * the main process and renderer processes.
 */

import { ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { WindowManager } from './WindowManager.js'
import { ViewManager } from './ViewManager.js'
import { logger } from './LoggerService.js'

/**
 * IPC Channel constants for type-safe channel names
 */
export const IPC_CHANNELS = {
  // Settings
  OPEN_SETTINGS_WINDOW: 'open-settings-window',
  CLOSE_SETTINGS_WINDOW: 'close-settings-window',

  // View management
  SWITCH_VIEW: 'switch-view',
  OPEN_EXTERNAL: 'open-external',

  // Navigation
  RELOAD: 'reload',
  GO_BACK: 'go-back',
  GO_FORWARD: 'go-forward',

  // Auto-update
  DOWNLOAD_UPDATE: 'download-update',
  INSTALL_UPDATE: 'install-update',

  // UI toggles
  TOGGLE_SIDEBAR: 'toggle-sidebar',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/**
 * IpcManager handles registration of all IPC handlers
 */
export class IpcManager {
  private windowManager: WindowManager
  private viewManager: ViewManager
  private registered = false

  constructor(windowManager: WindowManager, viewManager: ViewManager) {
    this.windowManager = windowManager
    this.viewManager = viewManager
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
      this.viewManager.switchView(providerId)
    })

    ipcMain.on(IPC_CHANNELS.OPEN_EXTERNAL, (_, url: string) => {
      this.handleOpenExternal(url)
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
      autoUpdater.downloadUpdate()
    })

    ipcMain.on(IPC_CHANNELS.INSTALL_UPDATE, () => {
      autoUpdater.quitAndInstall()
    })

    // UI toggle handlers
    ipcMain.on(IPC_CHANNELS.TOGGLE_SIDEBAR, () => {
      // Placeholder for future implementation
      // windowManager.toggleSidebar()
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
