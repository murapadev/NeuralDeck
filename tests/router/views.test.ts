/**
 * Tests for views router
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WindowManager } from '../../electron/services/WindowManager'
import type { ViewManager } from '../../electron/services/ViewManager'

// Mock electron
vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock configManager
vi.mock('../../electron/config/configManager.js', () => ({
  default: {
    getAll: vi.fn().mockReturnValue({
      providers: [
        { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', enabled: true },
        { id: 'claude', name: 'Claude', url: 'https://claude.ai', enabled: true },
      ],
    }),
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

describe('views router', () => {
  let createViewsRouter: typeof import('../../electron/router/views').createViewsRouter
  let mockViewManager: Partial<ViewManager>
  let mockWindowManager: Partial<WindowManager>

  beforeEach(async () => {
    vi.resetModules()
    
    mockViewManager = {
      switchView: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      reloadCurrent: vi.fn(),
    }

    mockWindowManager = {
      createDetachedWindow: vi.fn(),
    }

    const module = await import('../../electron/router/views')
    createViewsRouter = module.createViewsRouter
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createViewsRouter', () => {
    it('should create a router with all procedures', () => {
      const router = createViewsRouter(
        mockViewManager as ViewManager,
        mockWindowManager as WindowManager
      )
      
      expect(router).toBeDefined()
      // Check that router has the expected procedures
      expect(router._def.procedures).toBeDefined()
    })
  })

  describe('procedure definitions', () => {
    it('should have switchView procedure', () => {
      const router = createViewsRouter(
        mockViewManager as ViewManager,
        mockWindowManager as WindowManager
      )
      
      expect(router._def.procedures.switchView).toBeDefined()
    })

    it('should have detachView procedure', () => {
      const router = createViewsRouter(
        mockViewManager as ViewManager,
        mockWindowManager as WindowManager
      )
      
      expect(router._def.procedures.detachView).toBeDefined()
    })

    it('should have openExternal procedure', () => {
      const router = createViewsRouter(
        mockViewManager as ViewManager,
        mockWindowManager as WindowManager
      )
      
      expect(router._def.procedures.openExternal).toBeDefined()
    })

    it('should have goBack procedure', () => {
      const router = createViewsRouter(
        mockViewManager as ViewManager,
        mockWindowManager as WindowManager
      )
      
      expect(router._def.procedures.goBack).toBeDefined()
    })

    it('should have goForward procedure', () => {
      const router = createViewsRouter(
        mockViewManager as ViewManager,
        mockWindowManager as WindowManager
      )
      
      expect(router._def.procedures.goForward).toBeDefined()
    })

    it('should have reload procedure', () => {
      const router = createViewsRouter(
        mockViewManager as ViewManager,
        mockWindowManager as WindowManager
      )
      
      expect(router._def.procedures.reload).toBeDefined()
    })
  })
})
