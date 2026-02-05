/**
 * NeuralDeck - Main Process Entry Point
 *
 * Uses ServiceManager for centralized initialization.
 */

// Electron core
import { app } from 'electron'

// Services
import { logger } from './services/LoggerService.js'
import { serviceManager } from './services/ServiceManager.js'

// ============================================================================
// Application Lifecycle
// ============================================================================

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  // Handle second instance
  app.on('second-instance', () => {
    serviceManager.windowManager?.showWindow()
  })

  // Main initialization
  app.whenReady().then(async () => {
    try {
      logger.info('NeuralDeck: Initializing...')

      // Initialize all services via ServiceManager
      await serviceManager.initialize()

      // Initialize the view based on config
      serviceManager.initializeView()

      logger.info('NeuralDeck: Ready')
    } catch (error) {
      logger.error('NeuralDeck: Failed to initialize', error)
      app.quit()
    }
  })

}
