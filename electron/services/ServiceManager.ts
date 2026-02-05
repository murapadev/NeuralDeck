/**
 * ServiceManager - Service container with lifecycle management
 *
 * Provides centralized service initialization, dependency injection,
 * and cleanup handling for the main process.
 */

import { app } from 'electron'
import { createTRPCIPCHandler } from './TRPCHandler.js'
import { WindowManager } from './WindowManager.js'
import { ViewManager } from './ViewManager.js'
import { TrayManager } from './TrayManager.js'
import { ShortcutManager } from './ShortcutManager.js'
import { IpcManager } from './IpcManager.js'
import { AutoUpdateManager } from './AutoUpdateManager.js'
import { logger } from './LoggerService.js'
import { crashReporterService } from './CrashReporter.js'
import { setAppRouter } from './routerRegistry.js'
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
  public autoUpdateManager!: AutoUpdateManager

  private initialized = false
  private gcInterval: NodeJS.Timeout | null = null

  /**
   * Initialize services.
   * Core services are initialized immediately.
   * Secondary services are initialized lazily.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('ServiceManager: Already initialized, skipping')
      return
    }

    // 0. Initialize Crash Detection (First priority)
    crashReporterService.initialize()

    logger.info('ServiceManager: Initializing services...')

    try {
      // 1. Create CORE services in dependency order
      this.windowManager = new WindowManager()

      // Verify window was created
      if (!this.windowManager.mainWindow) {
        throw new Error('MainWindow creation failed')
      }

      this.viewManager = new ViewManager(this.windowManager)

      // 2. Create tray manager (essential for interaction)
      this.trayManager = new TrayManager(this.windowManager, this.viewManager)
      ;(globalThis as typeof globalThis & { trayManager?: TrayManager }).trayManager =
        this.trayManager
      this.windowManager.setTrayBoundsProvider(() => this.trayManager.getBounds())

      // 3. Create shortcut manager (essential for interaction)
      this.shortcutManager = new ShortcutManager(this.windowManager, this.viewManager)

      // 4. Create IPC manager and register handlers (essential for frontend)
      // Pass null for AutoUpdateManager initially, we will inject it later or handle it optionally
      // Better: Create AutoUpdateManager but don't start checks yet
      this.autoUpdateManager = new AutoUpdateManager(this.windowManager)
      
      this.ipcManager = new IpcManager(this.windowManager, this.viewManager, this.autoUpdateManager)
      this.ipcManager.registerAll()

      // 5. Setup tRPC router
      const router = createRouter(this.windowManager, this.viewManager, this.shortcutManager)
      setAppRouter(router) // Store for use by other modules (e.g., WindowManager)
      createTRPCIPCHandler({ router, windows: [this.windowManager.mainWindow] })

      // 6. Register cleanup handlers
      this.registerCleanupHandlers()

      // 7. Load app content (safe now that everything is initialized)
      this.windowManager.loadApp()

      // 8. Deferred Initialization (Lazy Loading)
      this.initializeBackgroundServices()

      this.initialized = true
      logger.info('ServiceManager: Core services initialized successfully')
    } catch (error) {
      logger.error('ServiceManager: Failed to initialize services:', error)
      throw error
    }
  }

  /**
   * Initialize non-critical services in the background
   * to improve startup time.
   */
  private initializeBackgroundServices(): void {
    setTimeout(() => {
      logger.info('ServiceManager: Initializing background services...')
      try {
        // Start auto-update checks after app is stable
        this.autoUpdateManager.startUpdateChecks()
        
        // Preload top 3 providers for faster switching
        this.viewManager.preloadTopProviders(3)
        
        // Start background memory garbage collection
        this.gcInterval = this.viewManager.startBackgroundGC(60000) // Every 60 seconds
        
        logger.info('ServiceManager: Background services initialized')
      } catch (error) {
        logger.error('ServiceManager: Failed to initialize background services', error)
      }
    }, 2000) // 2 second delay
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

      // Stop background update checks
      this.autoUpdateManager?.stopUpdateChecks()

      if (this.gcInterval) {
        clearInterval(this.gcInterval)
        this.gcInterval = null
      }

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
