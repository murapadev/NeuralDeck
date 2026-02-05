/**
 * ViewManager - Manages WebContentsViews for AI provider webpages
 *
 * Migrated from deprecated BrowserView to WebContentsView for Electron 35+
 * Each provider gets its own isolated WebContentsView with optional incognito mode.
 */

import { WebContentsView, shell, session } from 'electron'
import configManager from '../config/configManager.js'
import { WindowManager } from './WindowManager.js'
import { logger } from './LoggerService.js'
import { SIDEBAR, PROVIDER_IDS, NavigationState, IPC_CHANNELS } from '../../shared/types.js'

export class ViewManager {
  private views: Map<string, WebContentsView> = new Map()
  private currentViewId: string | null = null
  private windowManager: WindowManager
  private incognitoViewIds: Set<string> = new Set()

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
    logger.info('ViewManager: Initialized with WebContentsView API')

    // WebContentsView does not support setAutoResize, so we must handle resize events manually
    if (this.windowManager.mainWindow) {
      this.windowManager.mainWindow.on('resize', () => {
        this.handleResize()
      })
      this.windowManager.mainWindow.on('maximize', () => {
        this.handleResize()
      })
      this.windowManager.mainWindow.on('unmaximize', () => {
        this.handleResize()
      })
    }
  }

  /**
   * Get or create a WebContentsView for the given provider
   */
  public getOrCreateView(providerId: string): WebContentsView {
    let view = this.views.get(providerId)
    const config = configManager.getAll()

    if (!view) {
      const provider = config.providers.find((p) => p.id === providerId)
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`)
      }

      const isIncognito = config.privacy.incognitoProviders.includes(providerId)
      const partition = isIncognito ? `temp:${providerId}-${Date.now()}` : `persist:${providerId}`

      // Create session for this provider
      const providerSession = session.fromPartition(partition)

      // Handle permission requests (e.g. camera, microphone)
      providerSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const url = webContents.getURL()
        
        // Auto-approve media permissions for the provider's own origin
        if (permission === 'media') {
          try {
            const providerUrlObj = new URL(provider.url)
            const requestUrlObj = new URL(url)
            
            if (requestUrlObj.origin === providerUrlObj.origin) {
              return callback(true)
            }
          } catch (error) {
            logger.error(`ViewManager: Error checking permission origin for ${providerId}`, error)
          }
        }
        
        // Deny other permissions by default (notifications, midi, etc.)
        callback(false)
      })

      view = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          session: providerSession,
          webSecurity: true,
          enableBlinkFeatures: '',
        },
      })

      // Load provider URL
      view.webContents.loadURL(provider.url)

      // Set realistic user agent
      const chromeVersion = process.versions.chrome
      view.webContents.setUserAgent(
        `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
      )

      // Handle external links
      view.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
      })

      // Handle navigation events for back/forward state
      view.webContents.on('did-navigate', () => {
        this.sendNavigationState(providerId)
      })

      view.webContents.on('did-navigate-in-page', () => {
        this.sendNavigationState(providerId)
      })

      // Page load diagnostics
      const viewContents = view.webContents
      viewContents.on('did-finish-load', () => {
        logger.info(`ViewManager: Page loaded successfully for ${providerId} - URL: ${viewContents.getURL()}`)
      })

      viewContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        logger.error(`ViewManager: Page failed to load for ${providerId} - Code: ${errorCode}, Description: ${errorDescription}`)
      })

      // DevTools shortcut handler (Ctrl+Shift+I or F12)
      const viewWebContents = view.webContents
      viewWebContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
          if (
            input.key === 'F12' ||
            ((input.control || input.meta) && input.shift && input.code === 'KeyI')
          ) {
            viewWebContents.toggleDevTools()
            event.preventDefault()
          }
        }
      })

      this.views.set(providerId, view)
      if (isIncognito) {
        this.incognitoViewIds.add(providerId)
      }
      logger.info(`ViewManager: Created view for ${providerId} (partition: ${partition})`)
    }

    return view
  }

  /**
   * Switch to a different provider view
   */
  public switchView(providerId: string): void {
    const mainWindow = this.windowManager.mainWindow
    if (!mainWindow) return

    const config = configManager.getAll()
    const provider = config.providers.find((p) => p.id === providerId)
    if (!provider) return

    // Handle Native Providers (Ollama) - no WebContentsView needed
    if (providerId === PROVIDER_IDS.OLLAMA) {
      this.removeCurrentView()
      this.currentViewId = providerId
      configManager.set('lastProvider', providerId)
      mainWindow.webContents.send(IPC_CHANNELS.VIEW_CHANGED, providerId)
      // Native navigation state
      mainWindow.webContents.send(IPC_CHANNELS.NAVIGATION_STATE_CHANGED, {
        canGoBack: false,
        canGoForward: false,
        url: 'neural://chat',
      })
      return
    }

    const view = this.getOrCreateView(providerId)

    // Remove previous view if different
    if (this.currentViewId && this.currentViewId !== providerId && this.currentViewId !== PROVIDER_IDS.OLLAMA) {
      const oldView = this.views.get(this.currentViewId)
      if (oldView) {
        mainWindow.contentView.removeChildView(oldView)
      }
    }

    // Add new view to window's content view
    mainWindow.contentView.addChildView(view)
    this.updateViewBounds(view)

    this.currentViewId = providerId
    configManager.set('lastProvider', providerId)

    mainWindow.webContents.send(IPC_CHANNELS.VIEW_CHANGED, providerId)
    this.sendNavigationState(providerId)
    
    logger.info(`ViewManager: Switched to ${providerId}`)
  }

  /**
   * Remove current view from window without destroying it
   */
  private removeCurrentView(): void {
    const mainWindow = this.windowManager.mainWindow
    if (!mainWindow) return
    
    if (this.currentViewId && this.currentViewId !== PROVIDER_IDS.OLLAMA) {
      const currentView = this.views.get(this.currentViewId)
      if (currentView) {
        mainWindow.contentView.removeChildView(currentView)
      }
    }
  }

  /**
   * Update view bounds to account for sidebar width
   */
  public updateViewBounds(view?: WebContentsView): void {
    const mainWindow = this.windowManager.mainWindow
    if (!mainWindow) return

    // Use passed view or current view
    const targetView = view || (this.currentViewId ? this.views.get(this.currentViewId) : null)
    if (!targetView) return

    // Skip resize for native views (Ollama doesn't use WebContentsView)
    if (this.currentViewId === PROVIDER_IDS.OLLAMA) return

    const config = configManager.getAll()
    // Use getContentBounds() for internal dimensions (getBounds includes window frame)
    const bounds = mainWindow.getContentBounds()

    // Calculate sidebar width using constants
    const sidebarWidth = config.appearance.showProviderNames
      ? SIDEBAR.EXPANDED_WIDTH
      : SIDEBAR.COLLAPSED_WIDTH

    const viewBounds = {
      x: sidebarWidth,
      y: 0,
      width: bounds.width - sidebarWidth,
      height: bounds.height,
    }

    targetView.setBounds(viewBounds)
  }

  /**
   * Handle window resize
   */
  public handleResize(): void {
    this.updateViewBounds()
  }

  /**
   * Get the current active view ID
   */
  public getCurrentViewId(): string | null {
    return this.currentViewId
  }

  /**
   * Get a view by provider ID
   */
  public getView(id: string): WebContentsView | undefined {
    return this.views.get(id)
  }

  /**
   * @deprecated Use getView instead
   */
  public getBrowserView(id: string): WebContentsView | undefined {
    return this.getView(id)
  }

  /**
   * Send navigation state to renderer for UI updates
   */
  private sendNavigationState(providerId: string): void {
    const view = this.views.get(providerId)
    if (!view || view.webContents.isDestroyed() || !this.windowManager.mainWindow) return

    const state: NavigationState = {
      canGoBack: view.webContents.navigationHistory.canGoBack(),
      canGoForward: view.webContents.navigationHistory.canGoForward(),
      url: view.webContents.getURL(),
    }
    this.windowManager.mainWindow.webContents.send(IPC_CHANNELS.NAVIGATION_STATE_CHANGED, state)
  }

  /**
   * Destroy unused views to free memory
   */
  public destroyUnusedViews(): void {
    const enabledProviderIds = new Set(configManager.getEnabledProviders().map((p) => p.id))
    const mainWindow = this.windowManager.mainWindow

    for (const [id, view] of Array.from(this.views)) {
      if (!enabledProviderIds.has(id) && id !== this.currentViewId) {
        try {
          if (mainWindow) {
            mainWindow.contentView.removeChildView(view)
          }
          if (this.incognitoViewIds.has(id)) {
            const viewSession = view.webContents.session
            if (viewSession?.clearStorageData) {
              void viewSession.clearStorageData()
            }
            if (viewSession?.clearCache) {
              void viewSession.clearCache()
            }
            this.incognitoViewIds.delete(id)
          }
          view.webContents.close()
          this.views.delete(id)
          logger.info(`ViewManager: Destroyed unused view: ${id}`)
        } catch (error) {
          logger.error(`ViewManager: Failed to destroy view ${id}:`, error)
        }
      }
    }
  }

  /**
   * Reload the current view
   */
  public reloadCurrent(): void {
    if (this.currentViewId && this.currentViewId !== PROVIDER_IDS.OLLAMA) {
      this.views.get(this.currentViewId)?.webContents.reload()
    }
  }

  /**
   * Navigate back in current view
   */
  public goBack(): void {
    if (this.currentViewId && this.currentViewId !== PROVIDER_IDS.OLLAMA) {
      const view = this.views.get(this.currentViewId)
      if (view?.webContents.navigationHistory.canGoBack()) {
        view.webContents.goBack()
      }
    }
  }

  /**
   * Navigate forward in current view
   */
  public goForward(): void {
    if (this.currentViewId && this.currentViewId !== PROVIDER_IDS.OLLAMA) {
      const view = this.views.get(this.currentViewId)
      if (view?.webContents.navigationHistory.canGoForward()) {
        view.webContents.goForward()
      }
    }
  }

  /**
   * Get all cached views (for debugging/monitoring)
   */
  public getAllViews(): Map<string, WebContentsView> {
    return new Map(this.views)
  }

  /**
   * Get memory stats for views
   */
  public getMemoryStats(): { viewCount: number; currentView: string | null } {
    return {
      viewCount: this.views.size,
      currentView: this.currentViewId,
    }
  }

  /**
   * Preload views for top N enabled providers
   * This improves UX by having views ready before user switches
   */
  public preloadTopProviders(count: number = 3): void {
    const enabledProviders = configManager.getEnabledProviders()
    const toPreload = enabledProviders.slice(0, count)

    for (const provider of toPreload) {
      if (!this.views.has(provider.id) && provider.id !== PROVIDER_IDS.OLLAMA) {
        logger.info(`ViewManager: Preloading view for ${provider.id}`)
        this.getOrCreateView(provider.id)
      }
    }
  }

  /**
   * Enforce memory limit by destroying least recently used views
   * @param maxViews Maximum number of views to keep in memory
   */
  public enforceMemoryLimit(maxViews: number = 5): void {
    if (this.views.size <= maxViews) return

    const enabledIds = new Set(configManager.getEnabledProviders().map(p => p.id))
    const viewsToDestroy: string[] = []

    // Find views to destroy (disabled providers first, then oldest)
    for (const [id] of this.views) {
      if (id !== this.currentViewId && !enabledIds.has(id)) {
        viewsToDestroy.push(id)
      }
    }

    // If still over limit, destroy enabled but not current
    if (this.views.size - viewsToDestroy.length > maxViews) {
      for (const [id] of this.views) {
        if (id !== this.currentViewId && !viewsToDestroy.includes(id)) {
          viewsToDestroy.push(id)
          if (this.views.size - viewsToDestroy.length <= maxViews) break
        }
      }
    }

    // Destroy views
    for (const id of viewsToDestroy) {
      const view = this.views.get(id)
      if (view) {
        try {
          const mainWindow = this.windowManager.mainWindow
          if (mainWindow) {
            mainWindow.contentView.removeChildView(view)
          }
          if (this.incognitoViewIds.has(id)) {
            const viewSession = view.webContents.session
            if (viewSession?.clearStorageData) {
              void viewSession.clearStorageData()
            }
            if (viewSession?.clearCache) {
              void viewSession.clearCache()
            }
            this.incognitoViewIds.delete(id)
          }
          view.webContents.close()
          this.views.delete(id)
          logger.info(`ViewManager: Destroyed view to free memory: ${id}`)
        } catch (error) {
          logger.error(`ViewManager: Error destroying view ${id}`, error)
        }
      }
    }
  }

  /**
   * Start background garbage collection timer
   * Periodically cleans up unused views
   */
  public startBackgroundGC(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.enforceMemoryLimit(5)
    }, intervalMs)
  }

  /**
   * Get detailed memory statistics for monitoring
   */
  public getDetailedMemoryStats(): {
    viewCount: number
    currentView: string | null
    viewIds: string[]
    processMemory: NodeJS.MemoryUsage
  } {
    return {
      viewCount: this.views.size,
      currentView: this.currentViewId,
      viewIds: Array.from(this.views.keys()),
      processMemory: process.memoryUsage(),
    }
  }
}
