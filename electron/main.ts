import {
  app,
  BrowserView,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  NativeImage,
  screen,
  session,
  shell,
  Tray,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateSVGString } from './assets/icons.js'
import configManager from './config/configManager.js'
import { AppConfig, ProviderConfig } from './config/types.js'
import {
  getProviderIcon,
  getProviderIconDataURL,
  preloadProviderIcons,
} from './utils/faviconManager.js'
import { validateProviderConfig } from './utils/validation.js'
import { debounce } from './utils/helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Rutas de archivos
const DIST_ELECTRON = path.join(__dirname)
const DIST = path.join(__dirname, '../dist')

// Variables globales
let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tray: Tray | null = null
const browserViews: Map<string, BrowserView> = new Map()
const detachedWindows: Map<string, BrowserWindow> = new Map()
let currentViewId: string | null = null
let isWindowVisible = false
let config: AppConfig
let isQuitting = false

// Inicializar configuración
function initConfig(): void {
  config = configManager.getAll()
  console.log('NeuralDeck Main: Config loaded', JSON.stringify(config, null, 2))
  console.log('NeuralDeck Main: Providers', config.providers.length)
}

// ============================================
// GESTIÓN DE BROWSER VIEWS
// ============================================

function getOrCreateView(providerId: string): BrowserView {
  let view = browserViews.get(providerId)

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

    // User agent de Chrome actualizado para mejor compatibilidad
    const chromeVersion = process.versions.chrome
    view.webContents.setUserAgent(
      `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
    )

    // Abrir enlaces externos en el navegador del sistema
    view.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // Manejar navegación
    view.webContents.on('did-navigate', () => {
      mainWindow?.webContents.send('navigation-state-changed', {
        canGoBack: view!.webContents.canGoBack(),
        canGoForward: view!.webContents.canGoForward(),
        url: view!.webContents.getURL(),
      })
    })

    browserViews.set(providerId, view)
  }

  return view
}

/**
 * Destroy unused BrowserViews to prevent memory leaks
 */
function destroyUnusedViews(): void {
  const enabledProviderIds = new Set(configManager.getEnabledProviders().map((p) => p.id))

  for (const [id, view] of browserViews) {
    if (!enabledProviderIds.has(id) && id !== currentViewId) {
      try {
        if (mainWindow) {
          mainWindow.removeBrowserView(view)
        }
        // webContents.destroy() is not in types but exists at runtime
        view.webContents.destroy()
        browserViews.delete(id)
        console.warn('Destroyed unused view:', id)
      } catch (error) {
        console.error(`Failed to destroy view ${id}:`, error)
      }
    }
  }
}

function switchView(providerId: string): void {
  if (!mainWindow) return

  const view = getOrCreateView(providerId)
  const bounds = mainWindow.getBounds()
  const sidebarWidth = config.appearance.sidebarCollapsed ? 0 : 60

  // Remover vista anterior
  if (currentViewId && currentViewId !== providerId) {
    const oldView = browserViews.get(currentViewId)
    if (oldView) {
      mainWindow.removeBrowserView(oldView)
    }
  }

  mainWindow.addBrowserView(view)

  view.setBounds({
    x: sidebarWidth,
    y: 0,
    width: bounds.width - sidebarWidth,
    height: bounds.height,
  })
  view.setAutoResize({ width: true, height: true })

  currentViewId = providerId
  configManager.set('lastProvider', providerId)

  mainWindow.webContents.send('view-changed', providerId)
  mainWindow.webContents.send('navigation-state-changed', {
    canGoBack: view.webContents.canGoBack(),
    canGoForward: view.webContents.canGoForward(),
    url: view.webContents.getURL(),
  })
}

// ============================================
// VENTANA DE SETTINGS
// ============================================

function createSettingsWindow(): void {
  // Si ya existe, enfocarla
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  const mainBounds = mainWindow?.getBounds()
  const preloadPath = path.join(DIST_ELECTRON, 'preload.cjs')

  // Log paths for debugging
  console.log('NeuralDeck: Creating Settings window')
  console.log('NeuralDeck: DIST_ELECTRON =', DIST_ELECTRON)
  console.log('NeuralDeck: Preload path =', preloadPath)

  settingsWindow = new BrowserWindow({
    width: 650,
    height: 600,
    minWidth: 500,
    minHeight: 450,
    x: mainBounds ? mainBounds.x + 50 : undefined,
    y: mainBounds ? mainBounds.y + 50 : undefined,
    title: 'NeuralDeck - Ajustes',
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#09090b',
    parent: mainWindow || undefined,
    modal: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Error handling for preload
  settingsWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('NeuralDeck Settings: Preload error:', preloadPath, error)
  })

  // Error handling for page load failures
  settingsWindow.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription, validatedURL) => {
      console.error(
        'NeuralDeck Settings: Failed to load:',
        errorCode,
        errorDescription,
        validatedURL
      )
    }
  )

  // Log when DOM is ready
  settingsWindow.webContents.on('dom-ready', () => {
    console.log('NeuralDeck Settings: DOM ready')
  })

  // Log when page finishes loading
  settingsWindow.webContents.on('did-finish-load', () => {
    console.log('NeuralDeck Settings: Page loaded successfully')
  })

  // Cargar la misma URL pero con hash para settings
  if (process.env.VITE_DEV_SERVER_URL) {
    const settingsURL = `${process.env.VITE_DEV_SERVER_URL}#settings`
    console.log('NeuralDeck Settings: Loading URL:', settingsURL)
    settingsWindow.loadURL(settingsURL)
    // Open DevTools for settings window in development
    settingsWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = path.join(DIST, 'index.html')
    console.log('NeuralDeck Settings: Loading file:', indexPath, 'with hash: settings')
    settingsWindow.loadFile(indexPath, { hash: 'settings' })
  }

  settingsWindow.on('closed', () => {
    console.log('NeuralDeck Settings: Window closed')
    settingsWindow = null
    mainWindow?.webContents.send('settings-closed')
  })
}

// ============================================
// VENTANAS SEPARADAS (POP-OUT)
// ============================================

function detachProviderToWindow(providerId: string): void {
  console.log('NeuralDeck: Detaching provider:', providerId)

  // Si ya existe una ventana separada, enfocarla
  const existingWindow = detachedWindows.get(providerId)
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus()
    return
  }

  const provider = config.providers.find((p) => p.id === providerId)
  if (!provider) {
    console.error('NeuralDeck: Provider not found:', providerId)
    return
  }

  // Crear ventana inicialmente sin icono
  const detachedWindow = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 400,
    minHeight: 500,
    title: `${provider.name} - NeuralDeck`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: `persist:${providerId}`,
    },
  })

  // Obtener icono async y establecerlo cuando esté listo
  getProviderIconAsync(provider)
    .then((icon) => {
      if (!detachedWindow.isDestroyed()) {
        detachedWindow.setIcon(icon)
      }
    })
    .catch((err) => {
      console.warn('NeuralDeck: Could not set detached window icon:', err)
    })

  console.log('NeuralDeck: Loading URL in detached window:', provider.url)
  detachedWindow.loadURL(provider.url)

  const chromeVersion = process.versions.chrome
  detachedWindow.webContents.setUserAgent(
    `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
  )

  detachedWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Error handling
  detachedWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('NeuralDeck Detached: Failed to load:', errorCode, errorDescription)
  })

  detachedWindow.on('closed', () => {
    console.log('NeuralDeck: Detached window closed:', providerId)
    detachedWindows.delete(providerId)
  })

  detachedWindows.set(providerId, detachedWindow)

  // Si estaba siendo mostrada en el main, cambiar a otra
  if (currentViewId === providerId) {
    const enabledProviders = configManager.getEnabledProviders()
    const nextProvider = enabledProviders.find((p) => p.id !== providerId)
    if (nextProvider) {
      switchView(nextProvider.id)
    }
  }
}

function createProviderIcon(provider: ProviderConfig): NativeImage {
  // Esta función ahora es síncrona para uso inmediato
  // Para iconos con favicons reales, usar getProviderIcon async
  const svg = generateSVGString(provider.icon || 'custom', provider.color, 32)
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  )
}

/**
 * Obtiene el icono del proveedor con favicon (async)
 */
async function getProviderIconAsync(provider: ProviderConfig): Promise<NativeImage> {
  try {
    return await getProviderIcon(provider, 32)
  } catch (error) {
    console.warn('NeuralDeck: Failed to get provider icon, using fallback:', error)
    return createProviderIcon(provider)
  }
}

// ============================================
// POSICIONAMIENTO DE VENTANA
// ============================================

function calculateWindowPosition(): { x: number; y: number } {
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = display.workAreaSize
  const windowWidth = config.window.width
  const windowHeight = config.window.height
  const margin = 10

  const position = config.window.position

  // Si es "remember" y hay posición guardada
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
    default: {
      const trayBounds = tray?.getBounds()
      let x = screenWidth - windowWidth - margin
      let y = screenHeight - windowHeight - margin

      if (trayBounds) {
        if (trayBounds.y < screenHeight / 2) {
          y = trayBounds.y + trayBounds.height + margin
        } else {
          y = trayBounds.y - windowHeight - margin
        }

        x = Math.max(
          margin,
          Math.min(
            trayBounds.x + trayBounds.width / 2 - windowWidth / 2,
            screenWidth - windowWidth - margin
          )
        )
      }

      return { x: Math.round(x), y: Math.round(y) }
    }
  }
}

// ============================================
// MOSTRAR/OCULTAR VENTANA
// ============================================

function toggleWindow(): void {
  if (!mainWindow) return
  isWindowVisible ? hideWindow() : showWindow()
}

function showWindow(): void {
  if (!mainWindow) return

  const { x, y } = calculateWindowPosition()
  mainWindow.setPosition(x, y)
  mainWindow.show()
  mainWindow.focus()
  isWindowVisible = true
}

function hideWindow(): void {
  if (!mainWindow) return

  // Guardar posición si está configurado
  if (config.window.position === 'remember') {
    const [x, y] = mainWindow.getPosition()
    configManager.saveWindowPosition(x, y)
  }

  mainWindow.hide()
  isWindowVisible = false
}

// ============================================
// CREAR VENTANA PRINCIPAL
// ============================================

function createWindow(): void {
  mainWindow = new BrowserWindow({
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
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // Abrir DevTools en desarrollo
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(DIST, 'index.html'))
  }

  // Ocultar al perder foco (si está configurado)
  mainWindow.on('blur', () => {
    if (config.window.hideOnBlur) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isFocused()) {
          hideWindow()
        }
      }, 150)
    }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      hideWindow()
    }
  })

  const debouncedResize = debounce(() => {
    if (!mainWindow) return

    const [width, height] = mainWindow.getSize()
    configManager.saveWindowSize(width, height)

    if (currentViewId) {
      const view = browserViews.get(currentViewId)
      if (view) {
        const bounds = mainWindow.getBounds()
        const sidebarWidth = config.appearance.sidebarCollapsed ? 0 : 60
        view.setBounds({
          x: sidebarWidth,
          y: 0,
          width: bounds.width - sidebarWidth,
          height: bounds.height,
        })
      }
    }
  }, 300)

  mainWindow.on('resize', debouncedResize)

  mainWindow.on('move', () => {
    if (config.window.position === 'remember' && mainWindow) {
      const [x, y] = mainWindow.getPosition()
      configManager.saveWindowPosition(x, y)
    }
  })
}

// ============================================
// SYSTEM TRAY
// ============================================

function createTray(): void {
  const trayIcon = createTrayIcon()
  tray = new Tray(trayIcon)
  tray.setToolTip('NeuralDeck - Tu centro de mando de IA')

  updateTrayMenu()

  tray.on('click', () => toggleWindow())
}

function createTrayIcon(): NativeImage {
  const size = 22
  // Usar un ícono más simple sin texto (mejor compatibilidad)
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

function updateTrayMenu(): void {
  if (!tray) return

  const enabledProviders = configManager.getEnabledProviders()

  const contextMenu = Menu.buildFromTemplate([
    { label: '🧠 NeuralDeck', enabled: false },
    { type: 'separator' },
    ...enabledProviders.map((provider) => ({
      label: provider.name,
      submenu: [
        {
          label: 'Abrir aquí',
          click: () => {
            showWindow()
            switchView(provider.id)
          },
        },
        {
          label: 'Abrir en ventana separada',
          click: () => detachProviderToWindow(provider.id),
        },
      ],
    })),
    { type: 'separator' },
    {
      label: '⚙️ Configuración',
      click: () => {
        showWindow()
        mainWindow?.webContents.send('open-settings')
      },
    },
    { type: 'separator' },
    {
      label: '🚪 Salir',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

// ============================================
// ATAJOS DE TECLADO
// ============================================

function registerGlobalShortcuts(): void {
  globalShortcut.unregisterAll()

  const shortcuts = config.shortcuts

  // Toggle window
  if (shortcuts.toggleWindow) {
    globalShortcut.register(shortcuts.toggleWindow, toggleWindow)
  }

  // Atajos por proveedor
  const enabledProviders = configManager.getEnabledProviders()
  enabledProviders.forEach((provider, index) => {
    if (shortcuts.providers[index]) {
      globalShortcut.register(shortcuts.providers[index], () => {
        showWindow()
        switchView(provider.id)
      })
    }
  })

  // Otros atajos
  if (shortcuts.openSettings) {
    globalShortcut.register(shortcuts.openSettings, () => {
      showWindow()
      mainWindow?.webContents.send('open-settings')
    })
  }
}

// ============================================
// IPC HANDLERS
// ============================================

function setupIPC(): void {
  // Configuración
  ipcMain.handle('get-config', () => configManager.getAll())
  ipcMain.handle('get-providers', () => configManager.getEnabledProviders())
  ipcMain.handle('get-all-providers', () => config.providers)
  ipcMain.handle('get-current-provider', () => currentViewId)

  // Actualizar configuración
  ipcMain.on('update-config', (_, section: keyof AppConfig, updates: any) => {
    switch (section) {
      case 'window':
        configManager.updateWindow(updates)
        if (updates.alwaysOnTop !== undefined) {
          mainWindow?.setAlwaysOnTop(updates.alwaysOnTop)
        }
        if (updates.opacity !== undefined) {
          mainWindow?.setOpacity(updates.opacity)
        }
        break
      case 'appearance':
        configManager.updateAppearance(updates)
        break
      case 'privacy':
        configManager.updatePrivacy(updates)
        break
      case 'shortcuts':
        configManager.updateShortcuts(updates)
        registerGlobalShortcuts()
        break
    }
    config = configManager.getAll()
    mainWindow?.webContents.send('config-updated', config)
  })

  // Proveedores
  ipcMain.on('update-provider', (_, id: string, updates: Partial<ProviderConfig>) => {
    configManager.updateProvider(id, updates)
    config = configManager.getAll()

    // Cleanup disabled views
    if (updates.enabled === false) {
      destroyUnusedViews()
    }

    updateTrayMenu()
    mainWindow?.webContents.send('providers-updated', config.providers)
  })

  ipcMain.on('add-custom-provider', (_, provider: Omit<ProviderConfig, 'order' | 'isCustom'>) => {
    if (!validateProviderConfig(provider as ProviderConfig)) {
      console.error('Invalid provider config:', provider)
      mainWindow?.webContents.send('error', {
        message: 'Invalid provider configuration',
        details: 'URL must be https:// or http:// and color must be valid hex',
      })
      return
    }

    configManager.addCustomProvider(provider)
    config = configManager.getAll()
    updateTrayMenu()
    mainWindow?.webContents.send('providers-updated', config.providers)
  })

  ipcMain.on('remove-custom-provider', (_, id: string) => {
    configManager.removeCustomProvider(id)
    config = configManager.getAll()
    destroyUnusedViews()
    updateTrayMenu()
    mainWindow?.webContents.send('providers-updated', config.providers)
  })

  ipcMain.on('reorder-providers', (_, orderedIds: string[]) => {
    configManager.reorderProviders(orderedIds)
    config = configManager.getAll()
    updateTrayMenu()
    mainWindow?.webContents.send('providers-updated', config.providers)
  })

  // Navegación
  ipcMain.on('switch-view', (_, providerId: string) => switchView(providerId))
  ipcMain.on('detach-view', (_, providerId: string) => detachProviderToWindow(providerId))

  ipcMain.on('reload-view', () => {
    if (currentViewId) {
      browserViews.get(currentViewId)?.webContents.reload()
    }
  })

  ipcMain.on('go-back', () => {
    if (currentViewId) {
      const view = browserViews.get(currentViewId)
      if (view?.webContents.canGoBack()) {
        view.webContents.goBack()
      }
    }
  })

  ipcMain.on('go-forward', () => {
    if (currentViewId) {
      const view = browserViews.get(currentViewId)
      if (view?.webContents.canGoForward()) {
        view.webContents.goForward()
      }
    }
  })

  // Privacidad
  ipcMain.on('clear-cache', async (_, providerId: string) => {
    const ses = session.fromPartition(`persist:${providerId}`)
    await ses.clearStorageData()

    const view = browserViews.get(providerId)
    if (view) {
      const provider = config.providers.find((p) => p.id === providerId)
      if (provider) {
        view.webContents.loadURL(provider.url)
      }
    }
  })

  ipcMain.on('clear-all-data', async () => {
    await clearAllData()
  })

  // Ventana
  ipcMain.on('hide-window', () => hideWindow())
  ipcMain.on('minimize-window', () => mainWindow?.minimize())
  ipcMain.on('toggle-always-on-top', (_, value: boolean) => {
    mainWindow?.setAlwaysOnTop(value)
    configManager.updateWindow({ alwaysOnTop: value })
    config = configManager.getAll()
  })

  // Mostrar/ocultar BrowserView (para Settings overlay)
  ipcMain.on('show-browser-view', () => {
    if (currentViewId && mainWindow) {
      const view = browserViews.get(currentViewId)
      if (view) {
        mainWindow.addBrowserView(view)
        const bounds = mainWindow.getBounds()
        const sidebarWidth = config.appearance.sidebarCollapsed ? 0 : 60
        view.setBounds({
          x: sidebarWidth,
          y: 0,
          width: bounds.width - sidebarWidth,
          height: bounds.height,
        })
      }
    }
  })

  ipcMain.on('hide-browser-view', () => {
    if (currentViewId && mainWindow) {
      const view = browserViews.get(currentViewId)
      if (view) {
        mainWindow.removeBrowserView(view)
      }
    }
  })

  // Abrir Settings en ventana separada
  ipcMain.on('open-settings-window', () => {
    createSettingsWindow()
  })

  ipcMain.on('close-settings-window', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close()
      settingsWindow = null
    }
  })

  // Utilidades
  ipcMain.on('open-external', (_, url: string) => shell.openExternal(url))

  ipcMain.handle('get-platform', () => process.platform)

  // Iconos de proveedores (favicons)
  ipcMain.handle('get-provider-icon', async (_, providerId: string) => {
    const provider = config.providers.find((p) => p.id === providerId)
    if (!provider) return null

    try {
      return await getProviderIconDataURL(provider, 32)
    } catch (error) {
      console.warn('NeuralDeck: Failed to get provider icon:', error)
      return null
    }
  })

  ipcMain.handle('get-all-provider-icons', async () => {
    const icons: Record<string, string> = {}

    for (const provider of config.providers) {
      try {
        icons[provider.id] = await getProviderIconDataURL(provider, 32)
      } catch (error) {
        console.warn(`NeuralDeck: Failed to get icon for ${provider.id}:`, error)
      }
    }

    return icons
  })
}

async function clearAllData(): Promise<void> {
  const providerIds = Array.from(browserViews.keys())
  for (const providerId of providerIds) {
    const ses = session.fromPartition(`persist:${providerId}`)
    await ses.clearStorageData()
  }
}

// ============================================
// INICIALIZACIÓN
// ============================================

app.whenReady().then(async () => {
  try {
    initConfig()
    createWindow()
    createTray()
    registerGlobalShortcuts()
    setupIPC()

    // Pre-cargar favicons en background
    preloadProviderIcons(config.providers).catch((err) => {
      console.warn('NeuralDeck: Failed to preload provider icons:', err)
    })

    // Cargar última vista usada o la primera disponible
    const lastProvider = config.lastProvider
    const enabledProviders = configManager.getEnabledProviders()

    if (lastProvider && enabledProviders.some((p) => p.id === lastProvider)) {
      switchView(lastProvider)
    } else if (enabledProviders.length > 0) {
      switchView(enabledProviders[0].id)
    }

    // Mostrar ventana automáticamente en desarrollo
    if (process.env.VITE_DEV_SERVER_URL) {
      showWindow()
    }

    // Marcar primera ejecución completada
    if (config.firstRun) {
      configManager.markFirstRunComplete()
    }
  } catch (error) {
    console.error('Failed to initialize NeuralDeck:', error)
    dialog.showErrorBox(
      'Initialization Error',
      `NeuralDeck failed to start.\n\nError: ${error}\n\nPlease check the logs and try again.`
    )
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  if (app.isReady()) {
    globalShortcut.unregisterAll()
  }

  if (config?.privacy?.clearOnClose) {
    // Intentar limpiar datos de manera no bloqueante
    browserViews.forEach((_, providerId) => {
      const ses = session.fromPartition(`persist:${providerId}`)
      ses.clearStorageData().catch((err) => {
        console.warn(`NeuralDeck: Failed to clear storage for ${providerId}:`, err)
      })
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Single instance
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      showWindow()
    }
  })
}
