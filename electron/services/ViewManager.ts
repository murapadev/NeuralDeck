import { BrowserView, shell } from 'electron'
import configManager from '../config/configManager.js'
import { WindowManager } from './WindowManager.js'
import { logger } from './LoggerService.js'

export class ViewManager {
  private browserViews: Map<string, BrowserView> = new Map()
  private currentViewId: string | null = null
  private windowManager: WindowManager

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  public getOrCreateView(providerId: string): BrowserView {
    let view = this.browserViews.get(providerId)
    const config = configManager.getAll()

    if (!view) {
      const provider = config.providers.find((p) => p.id === providerId)
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`)
      }

      const isIncognito = config.privacy.incognitoProviders.includes(providerId)
      const partition = isIncognito ? `temp:${providerId}-${Date.now()}` : `persist:${providerId}`

      view = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition,
          webSecurity: true,
        },
      })

      view.webContents.loadURL(provider.url)

      const chromeVersion = process.versions.chrome
      view.webContents.setUserAgent(
        `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
      )

      view.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
      })

      // Handle navigation events
      view.webContents.on('did-navigate', () => {
        this.sendNavigationState(providerId)
      })

      this.browserViews.set(providerId, view)
    }

    return view
  }

  public switchView(providerId: string): void {
    const mainWindow = this.windowManager.mainWindow
    if (!mainWindow) return

    const config = configManager.getAll()
    const provider = config.providers.find((p) => p.id === providerId)
    if (!provider) return

    // Handle Native Providers (Ollama)
    if (providerId === 'ollama') {
      this.removeCurrentView()
      this.currentViewId = providerId
      configManager.set('lastProvider', providerId)
      mainWindow.webContents.send('view-changed', providerId)
      // Native navigation state
      mainWindow.webContents.send('navigation-state-changed', {
        canGoBack: false,
        canGoForward: false,
        url: 'neural://chat',
      })
      return
    }

    const view = this.getOrCreateView(providerId)

    // Remove previous view if different
    if (this.currentViewId && this.currentViewId !== providerId) {
      const oldView = this.browserViews.get(this.currentViewId)
      if (oldView) {
        mainWindow.removeBrowserView(oldView)
      }
    }

    mainWindow.addBrowserView(view)
    this.updateViewBounds(view)

    // Auto-resize handling handled by bounds update
    view.setAutoResize({ width: true, height: true })

    this.currentViewId = providerId
    configManager.set('lastProvider', providerId)

    mainWindow.webContents.send('view-changed', providerId)
    this.sendNavigationState(providerId)
  }

  private removeCurrentView(): void {
    const mainWindow = this.windowManager.mainWindow
    if (this.currentViewId && this.browserViews.has(this.currentViewId)) {
      const currentView = this.browserViews.get(this.currentViewId)
      if (currentView && mainWindow) {
        mainWindow.removeBrowserView(currentView)
      }
    }
  }

  public updateViewBounds(view?: BrowserView) {
    const mainWindow = this.windowManager.mainWindow
    if (!mainWindow) return

    // Use passed view or current view
    const targetView =
      view || (this.currentViewId ? this.browserViews.get(this.currentViewId) : null)
    if (!targetView) return

    // Skip resize for native views (they don't have BrowserView instances attached)
    if (this.currentViewId === 'ollama') return

    const config = configManager.getAll()
    const bounds = mainWindow.getBounds()

    // Calculate sidebar width
    let sidebarWidth = 60
    if (config.appearance.showProviderNames) {
      sidebarWidth = 140
    }

    targetView.setBounds({
      x: sidebarWidth,
      y: 0,
      width: bounds.width - sidebarWidth,
      height: bounds.height,
    })
  }

  public handleResize(): void {
    this.updateViewBounds()
  }

  public getCurrentViewId(): string | null {
    return this.currentViewId
  }

  public getBrowserView(id: string) {
    return this.browserViews.get(id)
  }

  private sendNavigationState(providerId: string) {
    const view = this.browserViews.get(providerId)
    if (view && this.windowManager.mainWindow) {
      this.windowManager.mainWindow.webContents.send('navigation-state-changed', {
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward(),
        url: view.webContents.getURL(),
      })
    }
  }

  public destroyUnusedViews(): void {
    const enabledProviderIds = new Set(configManager.getEnabledProviders().map((p) => p.id))
    const mainWindow = this.windowManager.mainWindow

    for (const [id, view] of Array.from(this.browserViews)) {
      if (!enabledProviderIds.has(id) && id !== this.currentViewId) {
        try {
          if (mainWindow) {
            mainWindow.removeBrowserView(view)
          }
          // Type cast since destroy is not in definition but present in runtime
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(view.webContents as any).destroy()
          this.browserViews.delete(id)
          logger.warn(`Destroyed unused view: ${id}`)
        } catch (error) {
          logger.error(`Failed to destroy view ${id}:`, error)
        }
      }
    }
  }

  public reloadCurrent(): void {
    if (this.currentViewId) {
      this.browserViews.get(this.currentViewId)?.webContents.reload()
    }
  }

  public goBack(): void {
    if (this.currentViewId) {
      const view = this.browserViews.get(this.currentViewId)
      if (view?.webContents.canGoBack()) {
        view.webContents.goBack()
      }
    }
  }

  public goForward(): void {
    if (this.currentViewId) {
      const view = this.browserViews.get(this.currentViewId)
      if (view?.webContents.canGoForward()) {
        view.webContents.goForward()
      }
    }
  }
}
