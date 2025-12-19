import { Tray, Menu, nativeImage, app, NativeImage } from 'electron'
import { WindowManager } from './WindowManager.js'
import { ViewManager } from './ViewManager.js'
import configManager from '../config/configManager.js'

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
              console.log('Detach requested for', provider.id)
              // TODO: Re-implement detach logic
            },
          },
        ],
      })),
      { type: 'separator' },
      {
        label: '⚙️ Settings',
        click: () => {
          this.windowManager.showWindow()
          this.windowManager.mainWindow?.webContents.send('open-settings')
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
    // On some Linux environments this may disable the 'click' (left-click) event,
    // which is why we added "Mostrar/Ocultar" as the first menu item.
    this.tray.setContextMenu(this.contextMenu)
  }

  private createTrayIcon(): NativeImage {
    const size = 22
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#6366f1"/>
        <path d="M${size / 2 - 3} ${size / 2 + 4} L${size / 2 - 3} ${size / 2 - 4} L${size / 2} ${size / 2 - 4} Q${size / 2 + 4} ${size / 2 - 4} ${size / 2 + 4} ${size / 2} Q${size / 2 + 4} ${size / 2 + 4} ${size / 2} ${size / 2 + 4} L${size / 2 - 3} ${size / 2 + 4}" fill="white"/>
        <circle cx="${size / 2 + 1}" cy="${size / 2}" r="2" fill="#6366f1"/>
      </svg>
    `

    return nativeImage
      .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
      .resize({ width: size, height: size })
  }
}
