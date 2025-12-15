import { create } from 'zustand'
import type {
    AppConfig,
    NavigationState,
    ProviderConfig
} from '../types/electron'

interface AppState {
  // Configuración completa
  config: AppConfig | null
  
  // Estado de los proveedores
  providers: ProviderConfig[]
  currentProviderId: string | null
  isLoading: boolean
  
  // Estado de navegación del webview actual
  navigationState: NavigationState
  
  // Estado de la UI
  isSidebarCollapsed: boolean
  isSettingsOpen: boolean
  settingsTab: 'general' | 'appearance' | 'shortcuts' | 'providers' | 'privacy'
  
  // Acciones de configuración
  setConfig: (config: AppConfig) => void
  updateWindowConfig: (updates: Partial<AppConfig['window']>) => void
  updateAppearanceConfig: (updates: Partial<AppConfig['appearance']>) => void
  updatePrivacyConfig: (updates: Partial<AppConfig['privacy']>) => void
  updateShortcutsConfig: (updates: Partial<AppConfig['shortcuts']>) => void
  
  // Acciones de proveedores
  setProviders: (providers: ProviderConfig[]) => void
  setCurrentProvider: (id: string | null) => void
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void
  
  // Acciones de UI
  setLoading: (loading: boolean) => void
  toggleSidebar: () => void
  openSettings: (tab?: AppState['settingsTab']) => void
  closeSettings: () => void
  setSettingsTab: (tab: AppState['settingsTab']) => void
  
  // Acciones de navegación
  setNavigationState: (state: NavigationState) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Estado inicial
  config: null,
  providers: [],
  currentProviderId: null,
  isLoading: true,
  navigationState: {
    canGoBack: false,
    canGoForward: false,
    url: ''
  },
  isSidebarCollapsed: false,
  isSettingsOpen: false,
  settingsTab: 'general',
  
  // Acciones de configuración
  setConfig: (config) => set({ 
    config,
    providers: config.providers.filter(p => p.enabled),
    isSidebarCollapsed: config.appearance.sidebarCollapsed
  }),
  
  updateWindowConfig: (updates) => {
    const { config } = get()
    if (!config) return
    
    set({
      config: {
        ...config,
        window: { ...config.window, ...updates }
      }
    })
    
    // Sincronizar con el main process
    window.neuralDeck.updateConfig('window', updates)
  },
  
  updateAppearanceConfig: (updates) => {
    const { config } = get()
    if (!config) return
    
    const newConfig = {
      ...config,
      appearance: { ...config.appearance, ...updates }
    }
    
    set({ config: newConfig })
    
    if (updates.sidebarCollapsed !== undefined) {
      set({ isSidebarCollapsed: updates.sidebarCollapsed })
    }
    
    window.neuralDeck.updateConfig('appearance', updates)
  },
  
  updatePrivacyConfig: (updates) => {
    const { config } = get()
    if (!config) return
    
    set({
      config: {
        ...config,
        privacy: { ...config.privacy, ...updates }
      }
    })
    
    window.neuralDeck.updateConfig('privacy', updates)
  },
  
  updateShortcutsConfig: (updates) => {
    const { config } = get()
    if (!config) return
    
    set({
      config: {
        ...config,
        shortcuts: { ...config.shortcuts, ...updates }
      }
    })
    
    window.neuralDeck.updateConfig('shortcuts', updates)
  },
  
  // Acciones de proveedores
  setProviders: (providers) => set({ providers: providers.filter(p => p.enabled) }),
  setCurrentProvider: (id) => set({ currentProviderId: id }),
  
  updateProvider: (id, updates) => {
    const { providers, config } = get()
    
    const newProviders = providers.map(p => 
      p.id === id ? { ...p, ...updates } : p
    )
    
    set({ providers: newProviders })
    
    if (config) {
      set({
        config: {
          ...config,
          providers: config.providers.map(p => 
            p.id === id ? { ...p, ...updates } : p
          )
        }
      })
    }
    
    window.neuralDeck.updateProvider(id, updates)
  },
  
  // Acciones de UI
  setLoading: (loading) => set({ isLoading: loading }),
  toggleSidebar: () => {
    const { isSidebarCollapsed, updateAppearanceConfig } = get()
    updateAppearanceConfig({ sidebarCollapsed: !isSidebarCollapsed })
  },
  openSettings: (tab = 'general') => {
    // Abrir Settings en ventana separada
    window.neuralDeck?.openSettingsWindow()
    set({ isSettingsOpen: true, settingsTab: tab })
  },
  closeSettings: () => {
    // Cerrar ventana de Settings
    window.neuralDeck?.closeSettingsWindow()
    set({ isSettingsOpen: false })
  },
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  
  // Acciones de navegación
  setNavigationState: (state) => set({ navigationState: state }),
}))

// Selectores útiles
export const useCurrentProvider = () => {
  const { providers, currentProviderId } = useAppStore()
  return providers.find(p => p.id === currentProviderId)
}

export const useWindowConfig = () => {
  return useAppStore(state => state.config?.window)
}

export const useAppearanceConfig = () => {
  return useAppStore(state => state.config?.appearance)
}

export const usePrivacyConfig = () => {
  return useAppStore(state => state.config?.privacy)
}

export const useShortcutsConfig = () => {
  return useAppStore(state => state.config?.shortcuts)
}
