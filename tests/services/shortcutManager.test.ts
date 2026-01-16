/**
 * Tests for ShortcutManager service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WindowManager } from '../../electron/services/WindowManager'
import type { ViewManager } from '../../electron/services/ViewManager'

// Mock electron modules
vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn().mockReturnValue(true),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
  },
  app: {
    on: vi.fn(),
  },
}))

// Mock configManager
vi.mock('../../electron/config/configManager.js', () => ({
  default: {
    getAll: vi.fn().mockReturnValue({
      shortcuts: {
        toggleWindow: 'CommandOrControl+Shift+Space',
        providers: ['CommandOrControl+Shift+1', 'CommandOrControl+Shift+2'],
        openSettings: 'CommandOrControl+,',
        reload: 'CommandOrControl+R',
        goBack: 'CommandOrControl+Left',
        goForward: 'CommandOrControl+Right',
      },
    }),
    getEnabledProviders: vi.fn().mockReturnValue([
      { id: 'chatgpt', name: 'ChatGPT', enabled: true },
      { id: 'claude', name: 'Claude', enabled: true },
    ]),
  },
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

describe('ShortcutManager', () => {
  let ShortcutManager: typeof import('../../electron/services/ShortcutManager').ShortcutManager
  let mockWindowManager: Partial<WindowManager>
  let mockViewManager: Partial<ViewManager>

  beforeEach(async () => {
    vi.resetModules()
    
    mockWindowManager = {
      toggleWindow: vi.fn(),
      showWindow: vi.fn(),
      openSettingsWindow: vi.fn(),
    }

    mockViewManager = {
      switchView: vi.fn(),
    }

    const module = await import('../../electron/services/ShortcutManager')
    ShortcutManager = module.ShortcutManager
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance and register shortcuts', async () => {
      const { globalShortcut } = await import('electron')
      
      const shortcutManager = new ShortcutManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager
      )
      
      expect(shortcutManager).toBeDefined()
      // Should have registered shortcuts
      expect(globalShortcut.register).toHaveBeenCalled()
    })

    it('should register will-quit handler', async () => {
      const { app } = await import('electron')
      
      new ShortcutManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager
      )
      
      expect(app.on).toHaveBeenCalledWith('will-quit', expect.any(Function))
    })
  })

  describe('registerAll', () => {
    it('should register toggleWindow shortcut', async () => {
      const { globalShortcut } = await import('electron')
      
      new ShortcutManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager
      )
      
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+Space',
        expect.any(Function)
      )
    })

    it('should register provider shortcuts', async () => {
      const { globalShortcut } = await import('electron')
      
      new ShortcutManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager
      )
      
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+1',
        expect.any(Function)
      )
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+2',
        expect.any(Function)
      )
    })

    it('should register openSettings shortcut', async () => {
      const { globalShortcut } = await import('electron')
      
      new ShortcutManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager
      )
      
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+,',
        expect.any(Function)
      )
    })
  })

  describe('unregisterAll', () => {
    it('should unregister all shortcuts', async () => {
      const { globalShortcut } = await import('electron')
      
      const shortcutManager = new ShortcutManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager
      )
      
      shortcutManager.unregisterAll()
      
      expect(globalShortcut.unregister).toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('should re-register all shortcuts', async () => {
      const { globalShortcut } = await import('electron')
      
      const shortcutManager = new ShortcutManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager
      )
      
      // Clear call history
      vi.mocked(globalShortcut.register).mockClear()
      
      shortcutManager.refresh()
      
      // Should have re-registered shortcuts
      expect(globalShortcut.register).toHaveBeenCalled()
    })
  })
})
