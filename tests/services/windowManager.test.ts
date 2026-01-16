/**
 * Tests for WindowManager service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock electron modules
vi.mock('electron', () => {
  class MockBrowserWindow {
    static fromWebContents = vi.fn()
    
    webContents = {
      on: vi.fn(),
      send: vi.fn(),
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      getURL: vi.fn().mockReturnValue('https://test.com'),
    }
    
    constructor() {}
    
    on = vi.fn()
    once = vi.fn()
    show = vi.fn()
    hide = vi.fn()
    close = vi.fn()
    focus = vi.fn()
    isVisible = vi.fn().mockReturnValue(true)
    isDestroyed = vi.fn().mockReturnValue(false)
    setPosition = vi.fn()
    getPosition = vi.fn().mockReturnValue([100, 100])
    getSize = vi.fn().mockReturnValue([800, 600])
    getBounds = vi.fn().mockReturnValue({ x: 100, y: 100, width: 800, height: 600 })
    setAlwaysOnTop = vi.fn()
    setSkipTaskbar = vi.fn()
    setVisibleOnAllWorkspaces = vi.fn()
    loadURL = vi.fn().mockResolvedValue(undefined)
    loadFile = vi.fn().mockResolvedValue(undefined)
  }

  return {
    BrowserWindow: MockBrowserWindow,
    screen: {
      getPrimaryDisplay: vi.fn().mockReturnValue({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
        workAreaSize: { width: 1920, height: 1080 },
      }),
      getDisplayNearestPoint: vi.fn().mockReturnValue({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
      getCursorScreenPoint: vi.fn().mockReturnValue({ x: 500, y: 500 }),
    },
    app: {
      on: vi.fn(),
      getPath: vi.fn().mockReturnValue('/mock/path'),
      isPackaged: false,
    },
    shell: {
      openExternal: vi.fn(),
    },
  }
})

// Mock node:path
vi.mock('node:path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
    dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  },
}))

// Mock node:url
vi.mock('node:url', () => {
  const fileURLToPath = (url: string) => url.replace('file://', '')
  return {
    default: { fileURLToPath },
    fileURLToPath,
  }
})

// Mock trpc-electron
vi.mock('trpc-electron/main', () => ({
  createIPCHandler: vi.fn(),
}))

// Mock configManager
vi.mock('../../electron/config/configManager.js', () => ({
  default: {
    getAll: vi.fn().mockReturnValue({
      window: {
        width: 420,
        height: 700,
        position: 'near-tray',
        alwaysOnTop: true,
        hideOnBlur: true,
        opacity: 1.0,
      },
      appearance: {
        theme: 'dark',
      },
    }),
    get: vi.fn((key: string) => {
      if (key === 'window') {
        return {
          width: 420,
          height: 700,
          position: 'near-tray',
          alwaysOnTop: true,
          hideOnBlur: true,
          opacity: 1.0,
        }
      }
      return null
    }),
    set: vi.fn(),
  },
}))

// Mock routerRegistry
vi.mock('../../electron/services/routerRegistry.js', () => ({
  getAppRouter: vi.fn().mockReturnValue({}),
}))

// Mock logger
vi.mock('../../electron/services/LoggerService.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('WindowManager', () => {
  let WindowManager: typeof import('../../electron/services/WindowManager').WindowManager

  beforeEach(async () => {
    vi.resetModules()
    
    const module = await import('../../electron/services/WindowManager')
    WindowManager = module.WindowManager
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance with a main window', () => {
      const windowManager = new WindowManager()
      expect(windowManager).toBeDefined()
      expect(windowManager.mainWindow).toBeDefined()
    })
  })

  describe('mainWindow', () => {
    it('should have a mainWindow after construction', () => {
      const windowManager = new WindowManager()
      expect(windowManager.mainWindow).not.toBeNull()
    })
  })

  describe('settingsWindow', () => {
    it('should not have a settings window initially', () => {
      const windowManager = new WindowManager()
      expect(windowManager.settingsWindow).toBeNull()
    })
  })

  describe('showWindow', () => {
    it('should call show on the main window', () => {
      const windowManager = new WindowManager()
      windowManager.showWindow()
      expect(windowManager.mainWindow?.show).toHaveBeenCalled()
    })
  })

  describe('hideWindow', () => {
    it('should call hide on the main window', () => {
      const windowManager = new WindowManager()
      windowManager.hideWindow()
      expect(windowManager.mainWindow?.hide).toHaveBeenCalled()
    })
  })

  describe('toggleWindow', () => {
    it('should toggle window visibility without errors', () => {
      const windowManager = new WindowManager()
      // Toggle should work without throwing
      expect(() => windowManager.toggleWindow()).not.toThrow()
    })
  })

  describe('getBounds', () => {
    it('should return window bounds', () => {
      const windowManager = new WindowManager()
      const bounds = windowManager.getBounds()
      expect(bounds).toEqual({ x: 100, y: 100, width: 800, height: 600 })
    })
  })

  describe('closeSettingsWindow', () => {
    it('should close settings window if it exists', () => {
      const windowManager = new WindowManager()
      // Settings window doesn't exist initially
      expect(() => windowManager.closeSettingsWindow()).not.toThrow()
    })
  })
})
