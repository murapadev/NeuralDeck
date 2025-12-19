import { app } from 'electron'
import { createIPCHandler } from 'electron-trpc/main'
import { WindowManager } from './services/WindowManager.js'
import { ViewManager } from './services/ViewManager.js'
import { TrayManager } from './services/TrayManager.js'
import { createRouter } from './router/index.js'
import configManager from './config/configManager.js'

let windowManager: WindowManager
let viewManager: ViewManager
let _trayManager: TrayManager

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    windowManager?.showWindow()
  })

  app.whenReady().then(async () => {
    try {
      // 1. Initialize Config
      // Config is singleton lazy-loaded, so just ensuring it's ready if needed,
      // but usually accessing it via configManager is enough.
      console.log('NeuralDeck: Initializing...')

      // 2. Create Services
      windowManager = new WindowManager()
      // Wait for window creation
      // Note: WindowManager creates window in constructor, but it's synchronous logic.

      viewManager = new ViewManager(windowManager)
      _trayManager = new TrayManager(windowManager, viewManager)

      // 3. Setup tRPC
      const router = createRouter(windowManager, viewManager)

      if (windowManager.mainWindow) {
        createIPCHandler({ router, windows: [windowManager.mainWindow] })
      } else {
        console.error('NeuralDeck Fatal: MainWindow not created')
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

      console.log('NeuralDeck: Ready')
    } catch (error) {
      console.error('NeuralDeck: Failed to initialize', error)
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
