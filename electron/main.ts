// Electron core
import { app } from 'electron'
import { createIPCHandler } from 'electron-trpc/main'
import { autoUpdater } from 'electron-updater'

// Services
import { logger } from './services/LoggerService.js'
import { WindowManager } from './services/WindowManager.js'
import { ViewManager } from './services/ViewManager.js'
import { TrayManager } from './services/TrayManager.js'
import { ShortcutManager } from './services/ShortcutManager.js'
import { IpcManager } from './services/IpcManager.js'

// Config & Router
import { createRouter } from './router/index.js'
import configManager from './config/configManager.js'

// Configure auto-updater
autoUpdater.logger = logger
autoUpdater.autoDownload = false // Ask user before downloading
autoUpdater.autoInstallOnAppQuit = true

// Service instances
let windowManager: WindowManager
let viewManager: ViewManager
let _trayManager: TrayManager
let shortcutManager: ShortcutManager
let ipcManager: IpcManager

/**
 * Setup auto-updater event handlers
 */
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info('Update available:', info.version)
    if (windowManager?.mainWindow) {
      windowManager.mainWindow.webContents.send('update-available', info)
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    logger.info('Update not available. Current version:', info.version)
  })

  autoUpdater.on('error', (err) => {
    logger.error('Error in auto-updater:', err)
    if (windowManager?.mainWindow) {
      windowManager.mainWindow.webContents.send('update-error', err)
    }
  })

  autoUpdater.on('download-progress', (progressObj) => {
    if (windowManager?.mainWindow) {
      windowManager.mainWindow.webContents.send('download-progress', progressObj)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded:', info.version)
    if (windowManager?.mainWindow) {
      windowManager.mainWindow.webContents.send('update-downloaded', info)
    }
  })
}

/**
 * Check for updates (only in production)
 */
function checkForUpdates() {
  if (process.env.NODE_ENV === 'production') {
    autoUpdater.checkForUpdates().catch((err) => {
      logger.error('Failed to check for updates:', err)
    })
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    windowManager?.showWindow()
  })

  app.whenReady().then(async () => {
    try {
      logger.info('NeuralDeck: Initializing...')

      // 1. Create Services
      windowManager = new WindowManager()
      viewManager = new ViewManager(windowManager)
      _trayManager = new TrayManager(windowManager, viewManager)
      // Keep reference to prevent GC (attach to global Node scope)
      ;(globalThis as typeof globalThis & { trayManager?: TrayManager }).trayManager = _trayManager
      shortcutManager = new ShortcutManager(windowManager, viewManager)

      // 2. Register IPC handlers via IpcManager
      ipcManager = new IpcManager(windowManager, viewManager)
      ipcManager.registerAll()

      // 3. Setup tRPC
      const router = createRouter(windowManager, viewManager, shortcutManager)

      if (windowManager.mainWindow) {
        createIPCHandler({ router, windows: [windowManager.mainWindow] })
      } else {
        logger.error('NeuralDeck Fatal: MainWindow not created')
      }

      // 4. Initial View Logic
      const config = configManager.getAll()
      const lastProvider = config.lastProvider
      const enabledProviders = configManager.getEnabledProviders()

      if (lastProvider && enabledProviders.some((p) => p.id === lastProvider)) {
        viewManager.switchView(lastProvider)
      } else if (enabledProviders.length > 0) {
        viewManager.switchView(enabledProviders[0].id)
      }

      // Handle First Run
      if (config.firstRun) {
        configManager.markFirstRunComplete()
      }

      // 5. Setup auto-updater
      setupAutoUpdater()

      // Check for updates on startup (after 3 seconds)
      setTimeout(() => {
        checkForUpdates()
      }, 3000)

      // Check for updates every 4 hours
      setInterval(() => {
        checkForUpdates()
      }, 4 * 60 * 60 * 1000)

      logger.info('App window created')
      logger.info('NeuralDeck: Ready')
    } catch (error) {
      logger.error('NeuralDeck: Failed to initialize', error)
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
