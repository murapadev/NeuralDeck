// Tipos de configuración (reflejados del main process)
export type WindowPosition = 
  | 'near-tray'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'remember'

export type AppTheme = 'dark' | 'light' | 'system'

export interface ProviderConfig {
  id: string
  name: string
  url: string
  icon: string
  color: string
  enabled: boolean
  order: number
  isCustom?: boolean
}

export interface ShortcutConfig {
  toggleWindow: string
  providers: string[]
  reload: string
  goBack: string
  goForward: string
  openSettings: string
}

export interface WindowConfig {
  width: number
  height: number
  position: WindowPosition
  lastX?: number
  lastY?: number
  alwaysOnTop: boolean
  hideOnBlur: boolean
  opacity: number
}

export interface PrivacyConfig {
  clearOnClose: boolean
  blockTrackers: boolean
  incognitoProviders: string[]
}

export interface AppearanceConfig {
  theme: AppTheme
  sidebarCollapsed: boolean
  showProviderNames: boolean
  fontSize: 'small' | 'medium' | 'large'
  accentColor: string
}

export interface AppConfig {
  version: string
  firstRun: boolean
  lastProvider: string | null
  window: WindowConfig
  shortcuts: ShortcutConfig
  providers: ProviderConfig[]
  privacy: PrivacyConfig
  appearance: AppearanceConfig
}

export interface NavigationState {
  canGoBack: boolean
  canGoForward: boolean
  url: string
}

// API expuesta por el preload
export interface NeuralDeckAPI {
  // Configuración
  getConfig: () => Promise<AppConfig>
  updateConfig: (section: keyof AppConfig, updates: any) => void
  
  // Proveedores
  getProviders: () => Promise<ProviderConfig[]>
  getAllProviders: () => Promise<ProviderConfig[]>
  getCurrentProvider: () => Promise<string | null>
  switchView: (providerId: string) => void
  detachView: (providerId: string) => void
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void
  addCustomProvider: (provider: Omit<ProviderConfig, 'order' | 'isCustom'>) => void
  removeCustomProvider: (id: string) => void
  reorderProviders: (orderedIds: string[]) => void
  
  // Iconos de proveedores (favicons)
  getProviderIcon: (providerId: string) => Promise<string | null>
  getAllProviderIcons: () => Promise<Record<string, string>>
  
  // Navegación
  reload: () => void
  goBack: () => void
  goForward: () => void
  
  // Privacidad
  clearCache: (providerId: string) => void
  clearAllData: () => void
  
  // Ventana
  hideWindow: () => void
  minimizeWindow: () => void
  toggleAlwaysOnTop: (value: boolean) => void
  showBrowserView: () => void
  hideBrowserView: () => void
  openSettingsWindow: () => void
  closeSettingsWindow: () => void
  
  // Utilidades
  openExternal: (url: string) => void
  getPlatform: () => Promise<NodeJS.Platform>
  
  // Eventos
  onViewChanged: (callback: (providerId: string) => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
  onSettingsClosed: (callback: () => void) => () => void
  onConfigUpdated: (callback: (config: AppConfig) => void) => () => void
  onProvidersUpdated: (callback: (providers: ProviderConfig[]) => void) => () => void
  onNavigationStateChanged: (callback: (state: NavigationState) => void) => () => void
}

declare global {
  interface Window {
    neuralDeck: NeuralDeckAPI
  }
}

export { }

