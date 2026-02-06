import { app, BrowserWindow, globalShortcut, screen, shell, WebContentsView } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppConfig } from '../../src/types/electron.js'
import configManager from '../config/configManager.js'
import { debounce } from '../utils/helpers.js'
import { logger } from './LoggerService.js'
import { getAppRouter } from './routerRegistry.js'
import { createTRPCIPCHandler } from './TRPCHandler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// After bundling, main.cjs is at dist-electron/, so __dirname IS dist-electron
const DIST_ELECTRON = __dirname
const DIST = path.join(DIST_ELECTRON, '../dist')
const PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(DIST, '../public') : DIST

export class WindowManager {
  public mainWindow: BrowserWindow | null = null
  public settingsWindow: BrowserWindow | null = null
  private isWindowVisible = false
  private isQuitting = false
  private trayBoundsProvider: (() => Electron.Rectangle | undefined) | null = null

  constructor() {
    logger.info('WindowManager initialized')
    logger.info('Preload path:', path.join(DIST_ELECTRON, 'preload.cjs'))
    this.createWindow()
    this.registerListeners()
  }

  private createWindow(): void {
    const config = configManager.getAll()

    const windowOptions = this.getMainWindowOptions(config)

    this.mainWindow = new BrowserWindow(windowOptions)

    // Debounced resize handler
    const debouncedResize = debounce(() => {
      if (!this.mainWindow) return
      const [width, height] = this.mainWindow.getSize()
      configManager.saveWindowSize(width, height)
      // View resizing will be handled by ViewManager listening to window events
    }, 300)

    this.mainWindow.on('resize', debouncedResize)

    this.mainWindow.on('move', () => {
      if (this.mainWindow && configManager.get('window').position === 'remember') {
        const [x, y] = this.mainWindow.getPosition()
        configManager.saveWindowPosition(x, y)
      }
    })

    this.mainWindow.on('blur', () => {
      const windowConfig = configManager.get('window')
      // Don't hide on blur if window is pinned (alwaysOnTop) or hideOnBlur is disabled
      if (windowConfig.hideOnBlur && !windowConfig.alwaysOnTop) {
        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isFocused()) {
            this.hideWindow()
          }
        }, 150)
      }
    })

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault()
        this.hideWindow()
      }
    })
    this.mainWindow.once('ready-to-show', () => {
      // Always show in dev mode, or if debug is enabled
      if (
        process.env.VITE_DEV_SERVER_URL ||
        configManager.get('debug') ||
        process.env.NODE_ENV !== 'production'
      ) {
        this.showWindow()
      }
    })

    // Local DevTools Shortcut - use globalShortcut when window is focused
    // Note: before-input-event only works when focus is on the main webContents,
    // not on embedded WebContentsViews. Using a global shortcut scoped to focus.
    const toggleDevTools = () => {
      // Toggle DevTools for the currently focused webContents
      if (this.mainWindow?.isFocused()) {
        // Always toggle main window devtools first for debugging React UI
        this.mainWindow?.webContents.toggleDevTools()
      } else if (this.mainWindow) {
        // Check if a view is active and focused
        const views = this.mainWindow.contentView.children
        if (views.length > 0) {
          // Get the last added view (current provider)
          const activeView = views[views.length - 1]
          if (activeView && 'webContents' in activeView) {
            ;(activeView as WebContentsView).webContents.toggleDevTools()
          }
        }
      }
    }

    // Register global shortcuts for DevTools (only in dev mode)
    if (!app.isPackaged && (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV !== 'production')) {
      // Use Ctrl+Shift+I globally when main window is focused
      app.whenReady().then(() => {
        globalShortcut.register('CommandOrControl+Shift+I', () => {
          // Toggle DevTools regardless of focus check (focus detection can be unreliable)
          if (this.mainWindow) {
            this.mainWindow.webContents.toggleDevTools()
          }
        })
      })
    }

    // F12 and Ctrl+Shift+I work on the main window webContents (backup)
    if (!app.isPackaged) {
      this.mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
          if (
            input.key === 'F12' ||
            ((input.control || input.meta) && input.shift && input.code === 'KeyI')
          ) {
            toggleDevTools()
            event.preventDefault()
          }
        }
      })
    }
  }

  public loadApp(): void {
    if (!this.mainWindow) return

    // Add listener to verify preload execution
    this.mainWindow.webContents.on('did-finish-load', () => {
      logger.info('[WindowManager] Main window finished loading')
    })

    this.mainWindow.webContents.on('console-message', (_event, _level, message) => {
      // Log renderer console messages to main process (for debugging)
      if (message.includes('[Preload]') || message.includes('[App]')) {
        logger.info(`[Renderer Console] ${message}`)
      }
    })

    if (process.env.VITE_DEV_SERVER_URL) {
      logger.info('[WindowManager] Loading dev server URL:', process.env.VITE_DEV_SERVER_URL)
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      this.mainWindow.loadFile(path.join(DIST, 'index.html'))
      const config = configManager.getAll()
      if (config.debug && !app.isPackaged) {
        this.mainWindow.webContents.openDevTools({ mode: 'detach' })
      }
    }
  }

  private registerListeners(): void {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow()
      }
    })

    app.on('before-quit', () => {
      this.isQuitting = true
    })
  }

  public showWindow(): void {
    if (!this.mainWindow) return

    const { x, y } = this.calculateWindowPosition()
    this.mainWindow.setPosition(x, y)
    this.mainWindow.show()
    this.mainWindow.focus()
    this.isWindowVisible = true
  }

  public hideWindow(): void {
    if (!this.mainWindow) return

    const config = configManager.getAll()
    if (config.window.position === 'remember') {
      const [x, y] = this.mainWindow.getPosition()
      configManager.saveWindowPosition(x, y)
    }

    this.mainWindow.hide()
    this.isWindowVisible = false
  }

  public toggleWindow(): void {
    if (this.isWindowVisible) {
      this.hideWindow()
    } else {
      this.showWindow()
    }
  }

  private calculateWindowPosition(): { x: number; y: number } {
    const config = configManager.getAll()
    const display = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = display.workAreaSize
    const windowWidth = config.window.width
    const windowHeight = config.window.height
    const margin = 10

    const position = config.window.position

    if (
      position === 'remember' &&
      config.window.lastX !== undefined &&
      config.window.lastY !== undefined
    ) {
      return { x: config.window.lastX, y: config.window.lastY }
    }

    switch (position) {
      case 'top-left':
        return { x: margin, y: margin }
      case 'top-right':
        return { x: screenWidth - windowWidth - margin, y: margin }
      case 'bottom-left':
        return { x: margin, y: screenHeight - windowHeight - margin }
      case 'bottom-right':
        return { x: screenWidth - windowWidth - margin, y: screenHeight - windowHeight - margin }
      case 'center':
        return {
          x: Math.round((screenWidth - windowWidth) / 2),
          y: Math.round((screenHeight - windowHeight) / 2),
        }
      case 'near-tray':
      default:
        // Prefer tray bounds when available to position near the system tray
        if (this.trayBoundsProvider) {
          const bounds = this.trayBoundsProvider()
          if (bounds) {
            const trayCenterX = bounds.x + bounds.width / 2
            const trayCenterY = bounds.y + bounds.height / 2
            const trayDisplay = screen.getDisplayNearestPoint({ x: trayCenterX, y: trayCenterY })
            const workArea = trayDisplay.workArea

            const isRight = trayCenterX > workArea.x + workArea.width / 2
            const isBottom = trayCenterY > workArea.y + workArea.height / 2

            const x = isRight
              ? workArea.x + workArea.width - windowWidth - margin
              : workArea.x + margin
            const y = isBottom
              ? workArea.y + workArea.height - windowHeight - margin
              : workArea.y + margin

            return { x, y }
          }
        }

        // Fallback to top-right
        return { x: screenWidth - windowWidth - margin, y: margin }
    }
  }

  public getBounds() {
    return this.mainWindow?.getBounds()
  }

  /**
   * Provide tray bounds for positioning the window near the system tray.
   */
  public setTrayBoundsProvider(provider: () => Electron.Rectangle | undefined): void {
    this.trayBoundsProvider = provider
  }

  /**
   * Create a detached window for a specific URL
   * Window has native frame for proper window controls (move, resize, close)
   */
  public createDetachedWindow(url: string): void {
    // Create new window with slightly offset position
    const { x, y } = this.calculateWindowPosition()
    const offset = 40 // px offset from main window
    const isMac = process.platform === 'darwin'

    const win = new BrowserWindow({
      width: 1000,
      height: 800,
      minWidth: 400,
      minHeight: 500,
      x: x + offset,
      y: y + offset,
      show: true,
      // Use native frame for proper window controls on all platforms
      frame: true,
      // On macOS, use hidden-inset for cleaner look with traffic lights
      titleBarStyle: isMac ? 'hiddenInset' : 'default',
      backgroundColor: '#09090b',
      vibrancy: isMac ? 'sidebar' : undefined,
      trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
      autoHideMenuBar: true, // Auto-hide menu bar but allow access with Alt
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true, // Safer for external content
      },
    })

    // Load the target URL directly
    win.loadURL(url)

    // Handle new window requests from inside the detached window (e.g. login popups)
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  }

  public openSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus()
      return
    }

    // const { x, y } = this.calculateWindowPosition()
    // const config = configManager.getAll()
    // settings window slightly smaller/centered or custom?
    // Let's use a reasonable default, or maybe centered.
    const width = 900
    const height = 700

    // Center it relative to screen if possible, or separate logic
    // For now, let's offset from main or center.
    const display = screen.getPrimaryDisplay()
    const CenterX = Math.round((display.workAreaSize.width - width) / 2)
    const CenterY = Math.round((display.workAreaSize.height - height) / 2)

    this.settingsWindow = new BrowserWindow({
      width,
      height,
      minWidth: 800,
      minHeight: 600,
      x: CenterX,
      y: CenterY,
      show: false,
      frame: false,
      transparent: false,
      resizable: true,
      backgroundColor: '#09090b',
      titleBarStyle: 'hidden',
      icon: path.join(PUBLIC, 'icon.png'),
      webPreferences: {
        preload: path.join(DIST_ELECTRON, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Register Settings window with tRPC IPC handler
    const router = getAppRouter()
    if (router && this.settingsWindow) {
      createTRPCIPCHandler({ router, windows: [this.settingsWindow] })
    }

    // Add App Drag support via CSS app-drag (already in Settings.tsx)
    // But we need to allow moving the window via IPC or standard frame if hidden.
    // Settings.tsx handles drag regions.

    if (process.env.VITE_DEV_SERVER_URL) {
      this.settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#settings`)
      // this.settingsWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      this.settingsWindow.loadURL(`file://${path.join(DIST, 'index.html')}#settings`)
      if (configManager.get('debug')) {
        this.settingsWindow.webContents.openDevTools({ mode: 'detach' })
      }
    }

    this.settingsWindow.on('ready-to-show', () => {
      this.settingsWindow?.show()
    })

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null
    })

    // Open external links in browser
    this.settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  }

  public closeSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.close()
    }
  }

  private getMainWindowOptions(config: AppConfig): Electron.BrowserWindowConstructorOptions {
    return {
      width: config.window.width,
      height: config.window.height,
      minWidth: 380,
      minHeight: 500,
      show: false,
      frame: false,
      transparent: false,
      resizable: true,
      skipTaskbar: true,
      alwaysOnTop: config.window.alwaysOnTop,
      opacity: config.window.opacity,
      backgroundColor: '#09090b',
      webPreferences: {
        preload: path.join(DIST_ELECTRON, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // TODO: Re-enable after fixing electron-trpc compatibility
      },
      titleBarStyle: 'hidden',
      icon: path.join(PUBLIC, 'icon.png'),
    }
  }
}
