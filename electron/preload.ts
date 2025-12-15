import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Tipos importados del config
import type { AppConfig, ProviderConfig } from './config/types.js'

// API expuesta al renderer
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
  onNavigationStateChanged: (callback: (state: { canGoBack: boolean; canGoForward: boolean; url: string }) => void) => () => void
}

// Exponer la API de forma segura
contextBridge.exposeInMainWorld('neuralDeck', {
  // Configuración
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (section: keyof AppConfig, updates: any) => 
    ipcRenderer.send('update-config', section, updates),
  
  // Proveedores
  getProviders: () => ipcRenderer.invoke('get-providers'),
  getAllProviders: () => ipcRenderer.invoke('get-all-providers'),
  getCurrentProvider: () => ipcRenderer.invoke('get-current-provider'),
  switchView: (providerId: string) => ipcRenderer.send('switch-view', providerId),
  detachView: (providerId: string) => ipcRenderer.send('detach-view', providerId),
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => 
    ipcRenderer.send('update-provider', id, updates),
  addCustomProvider: (provider: Omit<ProviderConfig, 'order' | 'isCustom'>) => 
    ipcRenderer.send('add-custom-provider', provider),
  removeCustomProvider: (id: string) => ipcRenderer.send('remove-custom-provider', id),
  reorderProviders: (orderedIds: string[]) => ipcRenderer.send('reorder-providers', orderedIds),
  
  // Iconos de proveedores (favicons)
  getProviderIcon: (providerId: string) => ipcRenderer.invoke('get-provider-icon', providerId),
  getAllProviderIcons: () => ipcRenderer.invoke('get-all-provider-icons'),
  
  // Navegación
  reload: () => ipcRenderer.send('reload-view'),
  goBack: () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
  
  // Privacidad
  clearCache: (providerId: string) => ipcRenderer.send('clear-cache', providerId),
  clearAllData: () => ipcRenderer.send('clear-all-data'),
  
  // Ventana
  hideWindow: () => ipcRenderer.send('hide-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  toggleAlwaysOnTop: (value: boolean) => ipcRenderer.send('toggle-always-on-top', value),
  showBrowserView: () => ipcRenderer.send('show-browser-view'),
  hideBrowserView: () => ipcRenderer.send('hide-browser-view'),
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),
  
  // Utilidades
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Eventos del main process
  onViewChanged: (callback: (providerId: string) => void) => {
    const handler = (_: IpcRendererEvent, providerId: string) => callback(providerId)
    ipcRenderer.on('view-changed', handler)
    return () => ipcRenderer.removeListener('view-changed', handler)
  },
  
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('open-settings', handler)
    return () => ipcRenderer.removeListener('open-settings', handler)
  },
  
  onSettingsClosed: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('settings-closed', handler)
    return () => ipcRenderer.removeListener('settings-closed', handler)
  },
  
  onConfigUpdated: (callback: (config: AppConfig) => void) => {
    const handler = (_: IpcRendererEvent, config: AppConfig) => callback(config)
    ipcRenderer.on('config-updated', handler)
    return () => ipcRenderer.removeListener('config-updated', handler)
  },
  
  onProvidersUpdated: (callback: (providers: ProviderConfig[]) => void) => {
    const handler = (_: IpcRendererEvent, providers: ProviderConfig[]) => callback(providers)
    ipcRenderer.on('providers-updated', handler)
    return () => ipcRenderer.removeListener('providers-updated', handler)
  },
  
  onNavigationStateChanged: (callback: (state: { canGoBack: boolean; canGoForward: boolean; url: string }) => void) => {
    const handler = (_: IpcRendererEvent, state: { canGoBack: boolean; canGoForward: boolean; url: string }) => callback(state)
    ipcRenderer.on('navigation-state-changed', handler)
    return () => ipcRenderer.removeListener('navigation-state-changed', handler)
  }
} as NeuralDeckAPI)
