import { Tray, Menu, nativeImage, app, NativeImage } from 'electron'
import { WindowManager } from './WindowManager.js'
import { ViewManager } from './ViewManager.js'
import configManager from '../config/configManager.js'
import { logger } from './LoggerService.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export class TrayManager {
  private tray: Tray | null = null
  private windowManager: WindowManager
  private viewManager: ViewManager
  private contextMenu: Menu | null = null

  constructor(windowManager: WindowManager, viewManager: ViewManager) {
    this.windowManager = windowManager
    this.viewManager = viewManager
    this.init()
  }

  private init(): void {
    const icon = this.createTrayIcon()
    this.tray = new Tray(icon)
    this.tray.setToolTip('NeuralDeck - Your AI Command Center')

    this.updateMenu()

    // Left-click: toggle window visibility
    this.tray.on('click', () => this.windowManager.toggleWindow())

    // Right-click: show context menu manually (don't use setContextMenu which overrides left-click on Linux)
    this.tray.on('right-click', () => {
      if (this.contextMenu) {
        const bounds = this.tray?.getBounds()
        if (bounds) {
          this.tray?.popUpContextMenu(this.contextMenu, { x: bounds.x, y: bounds.y })
        } else {
          this.tray?.popUpContextMenu(this.contextMenu)
        }
      }
    })
  }

  public updateMenu(): void {
    if (!this.tray) return

    const enabledProviders = configManager.getEnabledProviders()

    this.contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show/Hide',
        click: () => this.windowManager.toggleWindow(),
      },
      { type: 'separator' },
      { label: '🧠 NeuralDeck', enabled: false },
      { type: 'separator' },
      ...enabledProviders.map((provider) => ({
        label: provider.name,
        submenu: [
          {
            label: 'Open here',
            click: () => {
              this.windowManager.showWindow()
              this.viewManager.switchView(provider.id)
            },
          },
          {
            label: 'Open in separate window',
            click: () => {
              logger.info('Detach requested for ' + provider.id)
              // Resolve URL from provider config if needed (though here we have provider object)
              if (provider.url) {
                this.windowManager.createDetachedWindow(provider.url)
              } else {
                logger.warn(`Cannot detach ${provider.id}: No URL found`)
              }
            },
          },
        ],
      })),
      { type: 'separator' },
      {
        label: '⚙️ Settings',
        click: () => {
          this.windowManager.openSettingsWindow()
        },
      },
      { type: 'separator' },
      {
        label: '🚪 Quit',
        click: () => {
          app.quit()
        },
      },
    ])

    // Set standard context menu - this ensures right-click works reliably.
    this.tray.setContextMenu(this.contextMenu)
  }

  private createTrayIcon(): NativeImage {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const DIST = path.join(__dirname, '../dist')
    const PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(DIST, '../public') : DIST
    const iconPath = path.join(PUBLIC, 'tray-icon.png')
    
    return nativeImage.createFromPath(iconPath)
  }
}
