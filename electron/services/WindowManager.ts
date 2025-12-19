import { BrowserWindow, screen, app } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import configManager from '../config/configManager.js'
import { debounce } from '../utils/helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// After bundling, main.cjs is at dist-electron/, so __dirname IS dist-electron
const DIST_ELECTRON = __dirname
const DIST = path.join(DIST_ELECTRON, '../dist')

export class WindowManager {
  public mainWindow: BrowserWindow | null = null
  private isWindowVisible = false
  private isQuitting = false

  constructor() {
    this.createWindow()
    this.registerListeners()
  }

  private createWindow(): void {
    const config = configManager.getAll()

    this.mainWindow = new BrowserWindow({
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
      },
      titleBarStyle: 'hidden', // Add this for mac/linux consistency if needed
    })

    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      this.mainWindow.loadFile(path.join(DIST, 'index.html'))
    }

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
      if (configManager.get('window').hideOnBlur) {
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
    this.isWindowVisible ? this.hideWindow() : this.showWindow()
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
        // This is a simplification; ideally we'd get tray bounds from TrayManager
        // For now, default to top-right
        return { x: screenWidth - windowWidth - margin, y: margin }
    }
  }

  public getBounds() {
    return this.mainWindow?.getBounds()
  }
}
