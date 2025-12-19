import { create } from 'zustand'
import {
  AppConfig,
  ProviderConfig,
  WindowConfig,
  PrivacyConfig,
  ShortcutConfig,
} from '../../electron/config/types'

interface AppState {
  isLoading: boolean
  isSettingsOpen: boolean
  settingsTab: 'general' | 'appearance' | 'shortcuts' | 'providers' | 'privacy'
  config: AppConfig | null
  providers: ProviderConfig[]
  currentProviderId: string | null
  navigationState: {
    canGoBack: boolean
    canGoForward: boolean
  }

  // Actions
  setLoading: (loading: boolean) => void
  openSettings: (tab?: AppState['settingsTab']) => void
  closeSettings: () => void
  setSettingsTab: (tab: AppState['settingsTab']) => void

  setConfig: (config: AppConfig) => void
  setProviders: (providers: ProviderConfig[]) => void
  setCurrentProvider: (id: string) => void
  setNavigationState: (state: { canGoBack: boolean; canGoForward: boolean }) => void

  // Optimistic/Local updates (actual persistence happens via tRPC listeners in App.tsx)
  updateWindowConfig: (config: Partial<WindowConfig>) => void
  updateAppearanceConfig: (config: Partial<AppConfig['appearance']>) => void
  updatePrivacyConfig: (config: Partial<PrivacyConfig>) => void
  updateShortcutsConfig: (config: Partial<ShortcutConfig>) => void
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: true,
  isSettingsOpen: false,
  settingsTab: 'general',
  config: null,
  providers: [],
  currentProviderId: null,
  navigationState: {
    canGoBack: false,
    canGoForward: false,
  },

  setLoading: (isLoading) => set({ isLoading }),

  openSettings: (tab = 'general') => {
    if (window.neuralDeck) {
      window.neuralDeck.openSettingsWindow()
    } else {
      set({ isSettingsOpen: true, settingsTab: tab }) // Fallback for dev/browser
    }
  },

  closeSettings: () => set({ isSettingsOpen: false }),

  setSettingsTab: (settingsTab) => set({ settingsTab }),

  setConfig: (config) =>
    set({
      config,
      providers: config.providers.filter((p) => p.enabled).sort((a, b) => a.order - b.order),
    }),

  setProviders: (providers) => set({ providers }),

  setCurrentProvider: (currentProviderId) => set({ currentProviderId }),

  setNavigationState: (navigationState) => set({ navigationState }),

  // Updaters (Synchronous local state updates, triggered by config sync or optimistic interaction)
  updateWindowConfig: (updates) =>
    set((state) => ({
      config: state.config
        ? { ...state.config, window: { ...state.config.window, ...updates } }
        : null,
    })),

  updateAppearanceConfig: (updates) =>
    set((state) => ({
      config: state.config
        ? { ...state.config, appearance: { ...state.config.appearance, ...updates } }
        : null,
    })),

  updatePrivacyConfig: (updates) =>
    set((state) => ({
      config: state.config
        ? { ...state.config, privacy: { ...state.config.privacy, ...updates } }
        : null,
    })),

  updateShortcutsConfig: (updates) =>
    set((state) => ({
      config: state.config
        ? { ...state.config, shortcuts: { ...state.config.shortcuts, ...updates } }
        : null,
    })),
}))

// Selectors
export const useWindowConfig = () => useAppStore((state) => state.config?.window)
export const useAppearanceConfig = () => useAppStore((state) => state.config?.appearance)
export const usePrivacyConfig = () => useAppStore((state) => state.config?.privacy)
export const useShortcutsConfig = () => useAppStore((state) => state.config?.shortcuts)
