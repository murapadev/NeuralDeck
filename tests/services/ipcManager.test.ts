/**
 * Tests for IpcManager service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IPC_CHANNELS } from '../../shared/types'
import type { WindowManager } from '../../electron/services/WindowManager'
import type { ViewManager } from '../../electron/services/ViewManager'
import type { AutoUpdateManager } from '../../electron/services/AutoUpdateManager'

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
}))

vi.mock('electron-updater', () => ({
  autoUpdater: {
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  },
}))

// Mock logger
vi.mock('../../electron/services/LoggerService.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('IpcManager', () => {
  let IpcManager: typeof import('../../electron/services/IpcManager').IpcManager
  let mockWindowManager: Partial<WindowManager>
  let mockViewManager: Partial<ViewManager>
  let mockAutoUpdateManager: Partial<AutoUpdateManager>

  beforeEach(async () => {
    vi.resetModules()
    
    mockWindowManager = {
      openSettingsWindow: vi.fn(),
      closeSettingsWindow: vi.fn(),
      createDetachedWindow: vi.fn(),
    }

    mockViewManager = {
      switchView: vi.fn(),
      reloadCurrent: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
    }

    mockAutoUpdateManager = {
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    }

    const module = await import('../../electron/services/IpcManager')
    IpcManager = module.IpcManager
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('IPC_CHANNELS', () => {
    it('should export all required channel constants', () => {
      expect(IPC_CHANNELS.OPEN_SETTINGS_WINDOW).toBe('open-settings-window')
      expect(IPC_CHANNELS.CLOSE_SETTINGS_WINDOW).toBe('close-settings-window')
      expect(IPC_CHANNELS.SWITCH_VIEW).toBe('switch-view')
      expect(IPC_CHANNELS.OPEN_EXTERNAL).toBe('open-external')
      expect(IPC_CHANNELS.RELOAD).toBe('reload')
      expect(IPC_CHANNELS.GO_BACK).toBe('go-back')
      expect(IPC_CHANNELS.GO_FORWARD).toBe('go-forward')
      expect(IPC_CHANNELS.DOWNLOAD_UPDATE).toBe('download-update')
      expect(IPC_CHANNELS.INSTALL_UPDATE).toBe('install-update')
    })
  })

  describe('constructor', () => {
    it('should create an instance with managers', () => {
      const ipcManager = new IpcManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager,
        mockAutoUpdateManager as AutoUpdateManager
      )
      expect(ipcManager).toBeDefined()
    })
  })

  describe('registerAll', () => {
    it('should register all IPC handlers', async () => {
      const { ipcMain } = await import('electron')
      
      const ipcManager = new IpcManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager,
        mockAutoUpdateManager as AutoUpdateManager
      )
      
      ipcManager.registerAll()
      
      // Should register handlers for all channels
      expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.OPEN_SETTINGS_WINDOW, expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.CLOSE_SETTINGS_WINDOW, expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.SWITCH_VIEW, expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.RELOAD, expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.GO_BACK, expect.any(Function))
      expect(ipcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.GO_FORWARD, expect.any(Function))
    })

    it('should not register handlers twice', async () => {
      const { ipcMain } = await import('electron')
      
      const ipcManager = new IpcManager(
        mockWindowManager as WindowManager,
        mockViewManager as ViewManager,
        mockAutoUpdateManager as AutoUpdateManager
      )
      
      ipcManager.registerAll()
      const firstCallCount = (ipcMain.on as ReturnType<typeof vi.fn>).mock.calls.length
      
      ipcManager.registerAll()
      const secondCallCount = (ipcMain.on as ReturnType<typeof vi.fn>).mock.calls.length
      
      // Should not add more handlers on second call
      expect(secondCallCount).toBe(firstCallCount)
    })
  })
})
