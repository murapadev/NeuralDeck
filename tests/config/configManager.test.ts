import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron-store before importing configManager
vi.mock('electron-store', () => {
  return {
    default: class Store {
      private data: any

      constructor(options: any) {
        this.data = { ...options.defaults }
      }

      get store() {
        return this.data
      }

      get(key: string) {
        return this.data[key]
      }

      set(key: string, value: any) {
        this.data[key] = value
      }

      clear() {
        this.data = {}
      }
    },
  }
})

import { DEFAULT_CONFIG } from '../../electron/config/types'

// Since configManager uses singleton pattern, we need to reset it between tests
describe('ConfigManager', () => {
  // We'll test the exported functions since they use the singleton
  let configManager: any

  beforeEach(async () => {
    // Reset module cache to get fresh instance
    vi.resetModules()
    const module = await import('../../electron/config/configManager')
    configManager = module.default
  })

  describe('getAll', () => {
    it('should return default config on first load', () => {
      const config = configManager.getAll()
      expect(config).toBeDefined()
      expect(config.version).toBe(DEFAULT_CONFIG.version)
      expect(config.providers).toBeDefined()
      expect(Array.isArray(config.providers)).toBe(true)
    })
  })

  describe('Provider Management', () => {
    it('should get enabled providers only', () => {
      const enabled = configManager.getEnabledProviders()
      expect(Array.isArray(enabled)).toBe(true)
      enabled.forEach((provider: any) => {
        expect(provider.enabled).toBe(true)
      })
    })

    it('should update provider settings', () => {
      const providers = configManager.getEnabledProviders()
      if (providers.length > 0) {
        const firstProvider = providers[0]
        const originalName = firstProvider.name

        configManager.updateProvider(firstProvider.id, { name: 'Updated Name' })

        const updated = configManager.getAll().providers.find((p: any) => p.id === firstProvider.id)
        expect(updated.name).toBe('Updated Name')

        // Restore
        configManager.updateProvider(firstProvider.id, { name: originalName })
      }
    })

    it('should add custom provider', () => {
      const customProvider = {
        id: 'test-custom',
        name: 'Test Custom',
        url: 'https://test.com',
        icon: 'custom',
        color: '#FF5733',
        enabled: true,
      }

      configManager.addCustomProvider(customProvider)

      const providers = configManager.getAll().providers
      const added = providers.find((p: any) => p.id === 'test-custom')

      expect(added).toBeDefined()
      expect(added.isCustom).toBe(true)
      expect(added.order).toBeDefined()
      expect(added.name).toBe('Test Custom')

      // Cleanup
      configManager.removeCustomProvider('test-custom')
    })

    it('should remove custom provider', () => {
      const customProvider = {
        id: 'test-remove',
        name: 'Test Remove',
        url: 'https://test.com',
        icon: 'custom',
        color: '#FF5733',
        enabled: true,
      }

      configManager.addCustomProvider(customProvider)
      const removed = configManager.removeCustomProvider('test-remove')

      expect(removed).toBe(true)

      const providers = configManager.getAll().providers
      const found = providers.find((p: any) => p.id === 'test-remove')
      expect(found).toBeUndefined()
    })

    it('should not remove built-in provider', () => {
      const providers = configManager.getAll().providers
      const builtIn = providers.find((p: any) => !p.isCustom)

      if (builtIn) {
        const removed = configManager.removeCustomProvider(builtIn.id)
        expect(removed).toBe(false)
      }
    })

    it('should reorder providers', () => {
      const providers = configManager.getAll().providers
      const ids = providers.map((p: any) => p.id)
      const reversed = [...ids].reverse()

      configManager.reorderProviders(reversed)

      const reordered = configManager.getAll().providers
      reversed.forEach((id, index) => {
        const provider = reordered.find((p: any) => p.id === id)
        expect(provider.order).toBe(index)
      })

      // Restore original order
      configManager.reorderProviders(ids)
    })
  })

  describe('Window Configuration', () => {
    it('should update window settings', () => {
      configManager.updateWindow({ alwaysOnTop: true })
      const config = configManager.getAll()
      expect(config.window.alwaysOnTop).toBe(true)

      // Restore
      configManager.updateWindow({ alwaysOnTop: DEFAULT_CONFIG.window.alwaysOnTop })
    })

    it('should save window position', () => {
      configManager.saveWindowPosition(100, 200)
      const config = configManager.getAll()
      expect(config.window.lastX).toBe(100)
      expect(config.window.lastY).toBe(200)
    })

    it('should save window size', () => {
      configManager.saveWindowSize(800, 600)
      const config = configManager.getAll()
      expect(config.window.width).toBe(800)
      expect(config.window.height).toBe(600)
    })
  })

  describe('Appearance Configuration', () => {
    it('should update appearance settings', () => {
      configManager.updateAppearance({ showProviderNames: true })
      const config = configManager.getAll()
      expect(config.appearance.showProviderNames).toBe(true)

      // Restore
      configManager.updateAppearance({
        showProviderNames: DEFAULT_CONFIG.appearance.showProviderNames,
      })
    })
  })

  describe('Privacy Configuration', () => {
    it('should update privacy settings', () => {
      configManager.updatePrivacy({ clearOnClose: true })
      const config = configManager.getAll()
      expect(config.privacy.clearOnClose).toBe(true)

      // Restore
      configManager.updatePrivacy({ clearOnClose: DEFAULT_CONFIG.privacy.clearOnClose })
    })
  })

  describe('First Run', () => {
    it('should mark first run as complete', () => {
      configManager.markFirstRunComplete()
      const config = configManager.getAll()
      expect(config.firstRun).toBe(false)
    })
  })
})
