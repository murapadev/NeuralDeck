/**
 * Persistent configuration manager using electron-store
 */
import Store from 'electron-store'
import { AppConfig, DEFAULT_CONFIG, ProviderConfig } from './types.js'
import { logger } from '../services/LoggerService.js'

// Typed store interface
interface TypedStore {
  store: AppConfig
  get<K extends keyof AppConfig>(key: K): AppConfig[K]
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void
  clear(): void
}

// Validation schema for electron-store
const schema = {
  version: { type: 'string' as const },
  firstRun: { type: 'boolean' as const },
  lastProvider: { type: ['string', 'null'] },
  window: {
    type: 'object' as const,
    properties: {
      width: { type: 'number' as const, minimum: 300 },
      height: { type: 'number' as const, minimum: 400 },
      position: { type: 'string' as const },
      lastX: { type: 'number' as const },
      lastY: { type: 'number' as const },
      alwaysOnTop: { type: 'boolean' as const },
      hideOnBlur: { type: 'boolean' as const },
      opacity: { type: 'number' as const, minimum: 0.5, maximum: 1 },
    },
  },
  shortcuts: {
    type: 'object' as const,
    properties: {
      toggleWindow: { type: 'string' as const },
      providers: { type: 'array' as const, items: { type: 'string' as const } },
      reload: { type: 'string' as const },
      goBack: { type: 'string' as const },
      goForward: { type: 'string' as const },
      openSettings: { type: 'string' as const },
    },
  },
  providers: {
    type: 'array' as const,
    items: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        name: { type: 'string' as const },
        url: { type: 'string' as const },
        icon: { type: 'string' as const },
        color: { type: 'string' as const },
        enabled: { type: 'boolean' as const },
        order: { type: 'number' as const },
        isCustom: { type: 'boolean' as const },
      },
    },
  },
  privacy: {
    type: 'object' as const,
    properties: {
      clearOnClose: { type: 'boolean' as const },
      blockTrackers: { type: 'boolean' as const },
      incognitoProviders: { type: 'array' as const, items: { type: 'string' as const } },
    },
  },
  appearance: {
    type: 'object' as const,
    properties: {
      theme: { type: 'string' as const, enum: ['dark', 'light', 'system'] },
      language: { type: 'string' as const, default: 'en' },
      showProviderNames: { type: 'boolean' as const },
      fontSize: { type: 'string' as const, enum: ['small', 'medium', 'large'] },
      accentColor: { type: 'string' as const },
    },
  },
}

class ConfigManager {
  private store: TypedStore

  constructor() {
    this.store = new Store({
      name: 'neuraldeck-config',
      defaults: DEFAULT_CONFIG,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: schema as any,
      clearInvalidConfig: true,
    }) as TypedStore

    // Migrate configuration if needed
    this.migrateIfNeeded()
  }

  /**
   * Migrate configuration from previous versions
   */
  private migrateIfNeeded(): void {
    const currentVersion = this.store.get('version')

    if (currentVersion !== DEFAULT_CONFIG.version) {
      // Add migrations here as needed
      logger.info(`Migrating config from ${currentVersion} to ${DEFAULT_CONFIG.version}`)
      this.store.set('version', DEFAULT_CONFIG.version)
    }
  }

  /**
   * Get the complete configuration
   */
  getAll(): AppConfig {
    return this.store.store
  }

  /**
   * Get a specific value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key)
  }

  /**
   * Set a value
   */
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value)
  }

  /**
   * Update window configuration
   */
  updateWindow(updates: Partial<AppConfig['window']>): void {
    const current = this.store.get('window')
    this.store.set('window', { ...current, ...updates })
  }

  /**
   * Update appearance configuration
   */
  updateAppearance(updates: Partial<AppConfig['appearance']>): void {
    const current = this.store.get('appearance')
    this.store.set('appearance', { ...current, ...updates })
  }

  /**
   * Update privacy configuration
   */
  updatePrivacy(updates: Partial<AppConfig['privacy']>): void {
    const current = this.store.get('privacy')
    this.store.set('privacy', { ...current, ...updates })
  }

  /**
   * Update keyboard shortcuts
   */
  updateShortcuts(updates: Partial<AppConfig['shortcuts']>): void {
    const current = this.store.get('shortcuts')
    this.store.set('shortcuts', { ...current, ...updates })
  }

  /**
   * Get enabled providers sorted by order
   */
  getEnabledProviders(): ProviderConfig[] {
    const providers = this.store.get('providers')
    return providers
      .filter((p: ProviderConfig) => p.enabled)
      .sort((a: ProviderConfig, b: ProviderConfig) => a.order - b.order)
  }

  /**
   * Update a specific provider
   */
  updateProvider(id: string, updates: Partial<ProviderConfig>): void {
    const providers = this.store.get('providers')
    const index = providers.findIndex((p: ProviderConfig) => p.id === id)

    if (index !== -1) {
      providers[index] = { ...providers[index], ...updates }
      this.store.set('providers', providers)
    }
  }

  /**
   * Add a custom provider
   */
  addCustomProvider(provider: Omit<ProviderConfig, 'order' | 'isCustom'>): void {
    const providers = this.store.get('providers')
    const maxOrder = Math.max(...providers.map((p: ProviderConfig) => p.order), 0)

    providers.push({
      ...provider,
      order: maxOrder + 1,
      isCustom: true,
    })

    this.store.set('providers', providers)
  }

  /**
   * Remove a custom provider
   */
  removeCustomProvider(id: string): boolean {
    const providers = this.store.get('providers')
    const provider = providers.find((p: ProviderConfig) => p.id === id)

    if (provider?.isCustom) {
      this.store.set(
        'providers',
        providers.filter((p: ProviderConfig) => p.id !== id)
      )
      return true
    }

    return false
  }

  /**
   * Reorder providers
   */
  reorderProviders(orderedIds: string[]): void {
    const providers = this.store.get('providers')

    orderedIds.forEach((id, index) => {
      const provider = providers.find((p: ProviderConfig) => p.id === id)
      if (provider) {
        provider.order = index
      }
    })

    this.store.set('providers', providers)
  }

  /**
   * Save window position
   */
  saveWindowPosition(x: number, y: number): void {
    this.updateWindow({ lastX: x, lastY: y })
  }

  /**
   * Save window size
   */
  saveWindowSize(width: number, height: number): void {
    this.updateWindow({ width, height })
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.store.clear()
    // Defaults will be applied automatically
  }

  /**
   * Mark first run as complete
   */
  markFirstRunComplete(): void {
    this.store.set('firstRun', false)
  }
}

// Export singleton instance (lazy initialization)
let _configManager: ConfigManager | null = null

export function getConfigManager(): ConfigManager {
  if (!_configManager) {
    _configManager = new ConfigManager()
  }
  return _configManager
}

export const configManager = {
  get instance() {
    return getConfigManager()
  },
  getAll: () => getConfigManager().getAll(),
  get: <K extends keyof AppConfig>(key: K) => getConfigManager().get(key),
  set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
    getConfigManager().set(key, value),
  updateWindow: (updates: Partial<AppConfig['window']>) => getConfigManager().updateWindow(updates),
  updateAppearance: (updates: Partial<AppConfig['appearance']>) =>
    getConfigManager().updateAppearance(updates),
  updatePrivacy: (updates: Partial<AppConfig['privacy']>) =>
    getConfigManager().updatePrivacy(updates),
  updateShortcuts: (updates: Partial<AppConfig['shortcuts']>) =>
    getConfigManager().updateShortcuts(updates),
  getEnabledProviders: () => getConfigManager().getEnabledProviders(),
  updateProvider: (id: string, updates: Partial<ProviderConfig>) =>
    getConfigManager().updateProvider(id, updates),
  addCustomProvider: (provider: Omit<ProviderConfig, 'order' | 'isCustom'>) =>
    getConfigManager().addCustomProvider(provider),
  removeCustomProvider: (id: string) => getConfigManager().removeCustomProvider(id),
  reorderProviders: (orderedIds: string[]) => getConfigManager().reorderProviders(orderedIds),
  saveWindowPosition: (x: number, y: number) => getConfigManager().saveWindowPosition(x, y),
  saveWindowSize: (width: number, height: number) =>
    getConfigManager().saveWindowSize(width, height),
  reset: () => getConfigManager().reset(),
  markFirstRunComplete: () => getConfigManager().markFirstRunComplete(),
}

export default configManager
