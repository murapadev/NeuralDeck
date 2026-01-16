/**
 * Persistent configuration manager using electron-store
 */
import Store from 'electron-store'
import { AppConfig, DEFAULT_CONFIG, ProviderConfig } from '../../shared/types.js'
import { AppConfigSchema } from '../../shared/schemas.js'
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

class ConfigManager {
  private store: TypedStore

  constructor() {
    this.store = new Store({
      name: 'neuraldeck-config',
      defaults: DEFAULT_CONFIG,
      clearInvalidConfig: false, // We handle validation manually with Zod
    }) as TypedStore

    // Validate config integrity on startup
    this.validateConfig()

    // Migrate configuration if needed
    this.migrateIfNeeded()
  }

  /**
   * Validate configuration using Zod schema
   */
  private validateConfig(): void {
    try {
      const currentConfig = this.store.store
      const result = AppConfigSchema.safeParse(currentConfig)

      if (!result.success) {
        logger.error('ConfigManager: Config validation failed', result.error)
        // Attempt to fix by merging with defaults
        logger.info('ConfigManager: Attempting to repair config...')
        const repaired = { ...DEFAULT_CONFIG, ...currentConfig }
        // Ensure version is preserved if it exists
        if (currentConfig.version) repaired.version = currentConfig.version
        
        // Re-validate
        const repairResult = AppConfigSchema.safeParse(repaired)
        if (repairResult.success) {
           this.store.store = repairResult.data
           logger.info('ConfigManager: Config repaired successfully')
        } else {
           logger.error('ConfigManager: Failed to repair config, resetting to defaults')
           this.store.clear()
        }
      }
    } catch (error) {
      logger.error('ConfigManager: Validation error', error)
    }
  }

  /**
   * Migrate configuration from previous versions
   */
  private migrateIfNeeded(): void {
    const currentVersion = this.store.get('version')

    if (currentVersion !== DEFAULT_CONFIG.version) {
      logger.info(`Migrating config from ${currentVersion} to ${DEFAULT_CONFIG.version}`)
      
      // Perform migrations here
      if (!currentVersion || currentVersion < '0.3.0') {
         // Example migration logic
      }

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
   * Update general settings (root level)
   */
  updateGeneral(updates: Partial<Pick<AppConfig, 'firstRun' | 'lastProvider' | 'debug'>>): void {
    // only update allowed fields
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
    
    // Validate provider config
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
    this.store.clear()
    // Defaults will be applied automatically
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
      const result = AppConfigSchema.safeParse(newConfig)
      
      if (result.success) {
        this.store.store = result.data
        return true
      } else {
        logger.error('ConfigManager: Import validation failed', result.error)
        return false
      }
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
