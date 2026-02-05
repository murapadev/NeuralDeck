/**
 * Persistent configuration manager using electron-store
 */
import Store from 'electron-store'
import {
  AppConfig,
  DEFAULT_CONFIG,
  DEFAULT_PROVIDERS,
  ProviderConfig,
  UI_LIMITS,
} from '../../shared/types.js'
import { AppConfigSchema } from '../../shared/schemas.js'
import { compareSemver, deepMerge, isPlainObjectLike } from '../../shared/utils/index.js'
import { logger } from '../services/LoggerService.js'
import { validateProviderConfig } from '../utils/validation.js'

// Typed store interface
interface TypedStore {
  store: AppConfig
  get<K extends keyof AppConfig>(key: K): AppConfig[K]
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void
  clear(): void
  path: string
}

const COLOR_RE = /^#([0-9a-fA-F]{3}){1,2}$/

const MIGRATIONS: Array<{ version: string; migrate: (config: AppConfig) => AppConfig }> = [
  {
    version: '0.3.0',
    migrate: (config) => {
      return {
        ...config,
        appearance: { ...DEFAULT_CONFIG.appearance, ...config.appearance },
        privacy: { ...DEFAULT_CONFIG.privacy, ...config.privacy },
        shortcuts: { ...DEFAULT_CONFIG.shortcuts, ...config.shortcuts },
        window: { ...DEFAULT_CONFIG.window, ...config.window },
      }
    },
  },
]

class ConfigManager {
  private store: TypedStore

  constructor() {
    this.store = new Store({
      name: 'neuraldeck-config',
      defaults: DEFAULT_CONFIG,
      clearInvalidConfig: false, // We handle validation manually with Zod
    }) as TypedStore

    this.bootstrapConfig()
  }

  private replaceConfig(config: AppConfig): void {
    this.store.clear()
    Object.entries(config).forEach(([key, value]) => {
      this.store.set(key as keyof AppConfig, value as AppConfig[keyof AppConfig])
    })
  }

  /**
   * Repair, normalize, and migrate configuration on startup.
   */
  private bootstrapConfig(): void {
    try {
      const normalized = this.normalizeConfig(this.store.store)
      const migrated = this.applyMigrations(normalized)
      this.replaceConfig(migrated)
    } catch (error) {
      logger.error('ConfigManager: Failed to bootstrap config, resetting to defaults', error)
      this.replaceConfig(DEFAULT_CONFIG)
    }
  }

  /**
   * Normalize and validate configuration using defaults + schema.
   */
  private normalizeConfig(raw: unknown): AppConfig {
    const base = deepMerge(DEFAULT_CONFIG, isPlainObjectLike(raw) ? (raw as Partial<AppConfig>) : {})

    const normalizedProviders = this.normalizeProviders(base.providers)
    const normalizedShortcuts = this.normalizeShortcuts(base.shortcuts)
    const normalizedWindow = this.normalizeWindow(base.window)
    const normalizedAppearance = this.normalizeAppearance(base.appearance)
    const normalizedPrivacy = this.normalizePrivacy(base.privacy)
    const normalizedLastProvider = this.normalizeLastProvider(base.lastProvider, normalizedProviders)

    const merged: AppConfig = {
      ...base,
      providers: normalizedProviders,
      shortcuts: normalizedShortcuts,
      window: normalizedWindow,
      appearance: normalizedAppearance,
      privacy: normalizedPrivacy,
      lastProvider: normalizedLastProvider,
    }

    const result = AppConfigSchema.safeParse(merged)
    if (!result.success) {
      logger.error('ConfigManager: Config validation failed', result.error)
      return DEFAULT_CONFIG
    }

    return result.data
  }

  private normalizeProviders(providers: ProviderConfig[] | unknown): ProviderConfig[] {
    const provided = Array.isArray(providers) ? providers : []
    const defaultIds = new Set(DEFAULT_PROVIDERS.map((provider) => provider.id))
    const seen = new Set<string>()

    const normalized: ProviderConfig[] = []
    let maxOrder = -1

    for (const provider of provided) {
      if (!provider || typeof provider !== 'object') continue
      const candidate = provider as ProviderConfig
      if (!candidate.id || seen.has(candidate.id)) continue

      const defaultProvider = DEFAULT_PROVIDERS.find((item) => item.id === candidate.id)
      const order = Number.isFinite(candidate.order) ? candidate.order : undefined
      const merged: ProviderConfig = {
        ...(defaultProvider ?? {}),
        ...candidate,
        isCustom: candidate.isCustom ?? !defaultIds.has(candidate.id),
        enabled: candidate.enabled ?? defaultProvider?.enabled ?? true,
        order: order ?? maxOrder + 1,
      }

      normalized.push(merged)
      seen.add(merged.id)
      if (Number.isFinite(merged.order)) {
        maxOrder = Math.max(maxOrder, merged.order)
      }
    }

    for (const provider of DEFAULT_PROVIDERS) {
      if (seen.has(provider.id)) continue
      maxOrder += 1
      normalized.push({ ...provider, order: maxOrder, isCustom: false })
      seen.add(provider.id)
    }

    // Ensure orders are deterministic and compact
    normalized
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((provider, index) => {
        provider.order = index
      })

    return normalized
  }

  private normalizeShortcuts(shortcuts: AppConfig['shortcuts'] | unknown): AppConfig['shortcuts'] {
    const base = {
      ...DEFAULT_CONFIG.shortcuts,
      ...(isPlainObjectLike(shortcuts) ? (shortcuts as AppConfig['shortcuts']) : {}),
    }

    const maxShortcuts = UI_LIMITS.MAX_PROVIDER_SHORTCUTS
    const defaults = DEFAULT_CONFIG.shortcuts.providers
    const providers = Array.isArray(base.providers) ? base.providers.slice(0, maxShortcuts) : []

    while (providers.length < maxShortcuts) {
      providers.push(defaults[providers.length] ?? '')
    }

    return {
      ...base,
      providers,
    }
  }

  private normalizeWindow(windowConfig: AppConfig['window']): AppConfig['window'] {
    const width = Number.isFinite(windowConfig.width)
      ? Math.max(300, windowConfig.width)
      : DEFAULT_CONFIG.window.width
    const height = Number.isFinite(windowConfig.height)
      ? Math.max(400, windowConfig.height)
      : DEFAULT_CONFIG.window.height
    const opacity = Number.isFinite(windowConfig.opacity)
      ? Math.min(1, Math.max(0.1, windowConfig.opacity))
      : DEFAULT_CONFIG.window.opacity

    return {
      ...DEFAULT_CONFIG.window,
      ...windowConfig,
      width,
      height,
      opacity,
    }
  }

  private normalizeAppearance(appearance: AppConfig['appearance']): AppConfig['appearance'] {
    const accentColor = COLOR_RE.test(appearance.accentColor)
      ? appearance.accentColor
      : DEFAULT_CONFIG.appearance.accentColor

    return {
      ...DEFAULT_CONFIG.appearance,
      ...appearance,
      accentColor,
    }
  }

  private normalizePrivacy(privacy: AppConfig['privacy']): AppConfig['privacy'] {
    return {
      ...DEFAULT_CONFIG.privacy,
      ...privacy,
      incognitoProviders: Array.isArray(privacy.incognitoProviders)
        ? privacy.incognitoProviders.filter((value) => typeof value === 'string')
        : DEFAULT_CONFIG.privacy.incognitoProviders,
    }
  }

  private normalizeLastProvider(
    lastProvider: AppConfig['lastProvider'],
    providers: ProviderConfig[]
  ): AppConfig['lastProvider'] {
    if (!lastProvider) return null
    const exists = providers.some((provider) => provider.id === lastProvider && provider.enabled)
    return exists ? lastProvider : null
  }

  /**
   * Apply versioned migrations when config version is older than defaults.
   */
  private applyMigrations(config: AppConfig): AppConfig {
    let migrated = { ...config }

    for (const migration of MIGRATIONS) {
      if (compareSemver(migrated.version, migration.version) < 0) {
        migrated = migration.migrate(migrated)
      }
    }

    migrated.version = DEFAULT_CONFIG.version
    migrated.providers = this.normalizeProviders(migrated.providers)

    return migrated
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
   * Update general settings (root level)
   */
  updateGeneral(updates: Partial<Pick<AppConfig, 'firstRun' | 'lastProvider' | 'debug'>>): void {
    if (updates.firstRun !== undefined) this.store.set('firstRun', updates.firstRun)
    if (updates.lastProvider !== undefined) this.store.set('lastProvider', updates.lastProvider)
    if (updates.debug !== undefined) this.store.set('debug', updates.debug)
  }

  /**
   * Update all providers (batch)
   */
  updateProviders(providers: ProviderConfig[]): void {
    this.store.set('providers', providers)
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

    const tempProvider = { ...provider, order: 0, isCustom: true }
    if (!validateProviderConfig(tempProvider)) {
      logger.warn(`NeuralDeck Config: Invalid custom provider config for ${provider.id}`)
      return
    }

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
    this.replaceConfig(DEFAULT_CONFIG)
  }

  /**
   * Mark first run as complete
   */
  markFirstRunComplete(): void {
    this.store.set('firstRun', false)
  }

  /**
   * Export config to JSON string
   */
  exportConfig(): string {
    return JSON.stringify(this.getAll(), null, 2)
  }

  /**
   * Import config from JSON string
   * returns true if successful
   */
  importConfig(jsonString: string): boolean {
    try {
      const newConfig = JSON.parse(jsonString)
      const normalized = this.normalizeConfig(newConfig)
      const migrated = this.applyMigrations(normalized)
      this.replaceConfig(migrated)
      return true
    } catch (error) {
      logger.error('ConfigManager: Import failed', error)
      return false
    }
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.store.path
  }
}

// Export singleton instance
export const configManager = new ConfigManager()

// Default export for compatibility
export default configManager
