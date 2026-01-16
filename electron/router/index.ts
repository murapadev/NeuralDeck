import { mergeRouters } from './trpc.js'
import { createSettingsRouter } from './settings.js'
import { createWindowRouter } from './window.js'
import { createViewsRouter } from './views.js'
import { createProvidersRouter } from './providers.js'
import { createTelemetryRouter } from './telemetry.js'
import { WindowManager } from '../services/WindowManager.js'
import { ViewManager } from '../services/ViewManager.js'
import { ShortcutManager } from '../services/ShortcutManager.js'

export const createRouter = (
  windowManager: WindowManager,
  viewManager: ViewManager,
  shortcutManager: ShortcutManager
) => {
  return mergeRouters(
    createSettingsRouter(shortcutManager, viewManager),
    createWindowRouter(windowManager),
    createViewsRouter(viewManager, windowManager),
    createProvidersRouter(),
    createTelemetryRouter(viewManager)
  )
}

export type AppRouter = ReturnType<typeof createRouter>
