/**
 * ServiceManager - Service container with lifecycle management
 *
 * Provides centralized service initialization, dependency injection,
 * and cleanup handling for the main process.
 */

import { app } from 'electron'
import { createIPCHandler } from 'electron-trpc/main'
import { WindowManager } from './WindowManager.js'
import { ViewManager } from './ViewManager.js'
import { TrayManager } from './TrayManager.js'
import { ShortcutManager } from './ShortcutManager.js'
import { IpcManager } from './IpcManager.js'
import { logger } from './LoggerService.js'
import { createRouter } from '../router/index.js'
import configManager from '../config/configManager.js'

/**
 * ServiceManager handles all service lifecycle operations
 */
export class ServiceManager {
  // Service instances
  public windowManager!: WindowManager
  public viewManager!: ViewManager
  public trayManager!: TrayManager
  public shortcutManager!: ShortcutManager
  public ipcManager!: IpcManager

  private initialized = false

  /**
   * Initialize all services in dependency order
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('ServiceManager: Already initialized, skipping')
      return
    }

    logger.info('ServiceManager: Initializing services...')

    try {
      // 1. Create core services in dependency order
      this.windowManager = new WindowManager()

      // Verify window was created
      if (!this.windowManager.mainWindow) {
        throw new Error('MainWindow creation failed')
      }

      this.viewManager = new ViewManager(this.windowManager)

      // 2. Create tray manager (attach to global to prevent GC)
      this.trayManager = new TrayManager(this.windowManager, this.viewManager)
      ;(globalThis as typeof globalThis & { trayManager?: TrayManager }).trayManager =
        this.trayManager

      // 3. Create shortcut manager
      this.shortcutManager = new ShortcutManager(this.windowManager, this.viewManager)

      // 4. Create IPC manager and register handlers
      this.ipcManager = new IpcManager(this.windowManager, this.viewManager)
      this.ipcManager.registerAll()

      // 5. Setup tRPC router
      const router = createRouter(this.windowManager, this.viewManager, this.shortcutManager)
      createIPCHandler({ router, windows: [this.windowManager.mainWindow] })

      // 6. Register cleanup handlers
      this.registerCleanupHandlers()

      this.initialized = true
      logger.info('ServiceManager: All services initialized successfully')
    } catch (error) {
      logger.error('ServiceManager: Failed to initialize services:', error)
      throw error
    }
  }

  /**
   * Initialize the initial view based on config
   */
  public initializeView(): void {
    const config = configManager.getAll()
    const lastProvider = config.lastProvider
    const enabledProviders = configManager.getEnabledProviders()

    if (lastProvider && enabledProviders.some((p) => p.id === lastProvider)) {
      this.viewManager.switchView(lastProvider)
    } else if (enabledProviders.length > 0) {
      this.viewManager.switchView(enabledProviders[0].id)
    }

    // Mark first run as complete
    if (config.firstRun) {
      configManager.markFirstRunComplete()
    }
  }

  /**
   * Register app lifecycle cleanup handlers
   */
  private registerCleanupHandlers(): void {
    app.on('before-quit', () => {
      logger.info('ServiceManager: App quitting, cleaning up...')
      this.cleanup()
    })

    // Handle window-all-closed for non-macOS
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })
  }

  /**
   * Clean up all services
   */
  private cleanup(): void {
    try {
      // Unregister global shortcuts
      this.shortcutManager?.unregisterAll()

      // Destroy unused views
      this.viewManager?.destroyUnusedViews()

      logger.info('ServiceManager: Cleanup complete')
    } catch (error) {
      logger.error('ServiceManager: Cleanup failed:', error)
    }
  }

  /**
   * Check if services are initialized
   */
  public isInitialized(): boolean {
    return this.initialized
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager()
