/**
 * Tests for ViewManager service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WindowManager } from '../../electron/services/WindowManager'

// Mock electron modules
vi.mock('electron', () => {
  // Create a proper mock class for WebContentsView
  class MockWebContentsView {
    webContents = {
      loadURL: vi.fn(),
      setUserAgent: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
      reload: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      getURL: vi.fn().mockReturnValue('https://test.com'),
      isDestroyed: vi.fn().mockReturnValue(false),
      close: vi.fn(),
      navigationHistory: {
        canGoBack: vi.fn().mockReturnValue(false),
        canGoForward: vi.fn().mockReturnValue(false),
      },
    }
    setBounds = vi.fn()
  }

  return {
    WebContentsView: MockWebContentsView,
    shell: {
      openExternal: vi.fn(),
    },
    session: {
      fromPartition: vi.fn().mockReturnValue({
        setPermissionRequestHandler: vi.fn()
      })
    }
  }
})

// Mock configManager
vi.mock('../../electron/config/configManager.js', () => ({
  default: {
    getAll: vi.fn().mockReturnValue({
      providers: [
        { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', enabled: true, order: 0 },
        { id: 'ollama', name: 'Ollama', url: 'http://localhost:11434', enabled: true, order: 1 },
      ],
      privacy: {
        incognitoProviders: [],
      },
      appearance: {
        showProviderNames: false,
      },
    }),
    set: vi.fn(),
    getEnabledProviders: vi.fn().mockReturnValue([
      { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', enabled: true, order: 0 },
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

// Mock shared types
vi.mock('../../shared/types.js', () => ({
  SIDEBAR: {
    COLLAPSED_WIDTH: 60,
    EXPANDED_WIDTH: 140,
  },
  PROVIDER_IDS: {
    OLLAMA: 'ollama',
    CHATGPT: 'chatgpt',
    GEMINI: 'gemini',
    CLAUDE: 'claude',
    DEEPSEEK: 'deepseek',
    PERPLEXITY: 'perplexity',
  },
  IPC_CHANNELS: {
    NAVIGATION_STATE_CHANGED: 'navigation-state-changed',
    VIEW_CHANGED: 'view-changed',
  },
}))

describe('ViewManager', () => {
  let ViewManager: typeof import('../../electron/services/ViewManager').ViewManager
  let mockWindowManager: {
    mainWindow: {
      getBounds: ReturnType<typeof vi.fn>
      on: ReturnType<typeof vi.fn>
      contentView: {
        addChildView: ReturnType<typeof vi.fn>
        removeChildView: ReturnType<typeof vi.fn>
      }
      webContents: {
        send: ReturnType<typeof vi.fn>
      }
    } | null
  }

  beforeEach(async () => {
    vi.resetModules()
    
    mockWindowManager = {
      mainWindow: {
        getBounds: vi.fn().mockReturnValue({ width: 800, height: 600 }),
        on: vi.fn(), // Add the missing 'on' method
        contentView: {
          addChildView: vi.fn(),
          removeChildView: vi.fn(),
        },
        webContents: {
          send: vi.fn(),
        },
      },
    }

    const module = await import('../../electron/services/ViewManager')
    ViewManager = module.ViewManager
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance with a window manager', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      expect(viewManager).toBeDefined()
    })
  })

  describe('getCurrentViewId', () => {
    it('should return null initially', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      expect(viewManager.getCurrentViewId()).toBeNull()
    })
  })

  describe('getOrCreateView', () => {
    it('should create a new BrowserView for a valid provider', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      const view = viewManager.getOrCreateView('chatgpt')
      expect(view).toBeDefined()
      expect(view.webContents.loadURL).toHaveBeenCalledWith('https://chat.openai.com')
    })

    it('should throw error for unknown provider', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      expect(() => viewManager.getOrCreateView('unknown')).toThrow('Provider unknown not found')
    })

    it('should return existing view if already created', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      const view1 = viewManager.getOrCreateView('chatgpt')
      const view2 = viewManager.getOrCreateView('chatgpt')
      expect(view1).toBe(view2)
    })
  })

  describe('switchView', () => {
    it('should switch to an external provider view', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      viewManager.switchView('chatgpt')
      
      expect(mockWindowManager.mainWindow?.contentView.addChildView).toHaveBeenCalled()
      expect(mockWindowManager.mainWindow?.webContents.send).toHaveBeenCalledWith('view-changed', 'chatgpt')
    })

    it('should handle native provider (ollama) differently', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      viewManager.switchView('ollama')
      
      // Native providers don't use BrowserView
      expect(mockWindowManager.mainWindow?.webContents.send).toHaveBeenCalledWith('view-changed', 'ollama')
      expect(mockWindowManager.mainWindow?.webContents.send).toHaveBeenCalledWith('navigation-state-changed', {
        canGoBack: false,
        canGoForward: false,
        url: 'neural://chat',
      })
    })

    it('should not crash when mainWindow is null', () => {
      mockWindowManager.mainWindow = null
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      expect(() => viewManager.switchView('chatgpt')).not.toThrow()
    })
  })

  describe('getBrowserView', () => {
    it('should return undefined for non-existent view', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      expect(viewManager.getBrowserView('unknown')).toBeUndefined()
    })

    it('should return the view after creation', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      viewManager.getOrCreateView('chatgpt')
      const view = viewManager.getBrowserView('chatgpt')
      expect(view).toBeDefined()
    })
  })

  describe('reloadCurrent', () => {
    it('should reload current view', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      viewManager.switchView('chatgpt')
      viewManager.reloadCurrent()
      
      const view = viewManager.getBrowserView('chatgpt')
      expect(view?.webContents.reload).toHaveBeenCalled()
    })

    it('should not crash when no current view', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      expect(() => viewManager.reloadCurrent()).not.toThrow()
    })
  })

  describe('handleResize', () => {
    it('should update view bounds', () => {
      const viewManager = new ViewManager(mockWindowManager as unknown as WindowManager)
      viewManager.switchView('chatgpt')
      viewManager.handleResize()
      
      const view = viewManager.getBrowserView('chatgpt')
      expect(view?.setBounds).toHaveBeenCalled()
    })
  })
})
