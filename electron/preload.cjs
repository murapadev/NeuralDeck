/**
 * Preload script for NeuralDeck
 * This file is CommonJS and is loaded by Electron's preload mechanism.
 */
const { contextBridge, ipcRenderer } = require('electron')

const IPC_CHANNELS = {
  // Settings
  OPEN_SETTINGS_WINDOW: 'open-settings-window',
  CLOSE_SETTINGS_WINDOW: 'close-settings-window',
  // View management
  SWITCH_VIEW: 'switch-view',
  OPEN_EXTERNAL: 'open-external',
  // Navigation
  RELOAD: 'reload',
  GO_BACK: 'go-back',
  GO_FORWARD: 'go-forward',
  // Auto-update
  DOWNLOAD_UPDATE: 'download-update',
  INSTALL_UPDATE: 'install-update',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_DOWNLOADED: 'update-downloaded',
  DOWNLOAD_PROGRESS: 'download-progress',
  UPDATE_ERROR: 'update-error',
  // Events
  VIEW_CHANGED: 'view-changed',
  NAVIGATION_STATE_CHANGED: 'navigation-state-changed',
  OPEN_SETTINGS: 'open-settings',
  CONFIG_UPDATED: 'config-updated',
}

// Manual implementation of electronTRPC API that ipcLink expects
contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (operation) => {
    ipcRenderer.send('trpc', operation)
  },
  onMessage: (callback) => {
    const handler = (_, response) => {
      callback(response)
    }
    ipcRenderer.on('trpc', handler)
    return () => ipcRenderer.removeListener('trpc', handler)
  },
})

// Expose custom NeuralDeck APIs separately
contextBridge.exposeInMainWorld('neuralDeck', {
  // Navigation & Views
  switchView: (providerId) => ipcRenderer.send(IPC_CHANNELS.SWITCH_VIEW, providerId),
  openExternal: (url) => ipcRenderer.send(IPC_CHANNELS.OPEN_EXTERNAL, url),
  reload: () => ipcRenderer.send(IPC_CHANNELS.RELOAD),
  goBack: () => ipcRenderer.send(IPC_CHANNELS.GO_BACK),
  goForward: () => ipcRenderer.send(IPC_CHANNELS.GO_FORWARD),

  // Window & Layout
  openSettingsWindow: () => ipcRenderer.send(IPC_CHANNELS.OPEN_SETTINGS_WINDOW),
  closeSettingsWindow: () => ipcRenderer.send(IPC_CHANNELS.CLOSE_SETTINGS_WINDOW),

  // Auto-Update
  downloadUpdate: () => ipcRenderer.send(IPC_CHANNELS.DOWNLOAD_UPDATE),
  installUpdate: () => ipcRenderer.send(IPC_CHANNELS.INSTALL_UPDATE),
  onUpdateAvailable: (callback) => {
    const handler = (_, info) => callback(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_, info) => callback(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOADED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_DOWNLOADED, handler)
  },
  onDownloadProgress: (callback) => {
    const handler = (_, progress) => callback(progress)
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler)
  },
  onUpdateError: (callback) => {
    const handler = (_, error) => callback(error)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_ERROR, handler)
  },

  // System
  getPlatform: () => Promise.resolve(process.platform),

  // Events
  onViewChanged: (callback) => {
    const handler = (_, providerId) => callback(providerId)
    ipcRenderer.on(IPC_CHANNELS.VIEW_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.VIEW_CHANGED, handler)
  },
  onNavigationStateChanged: (callback) => {
    const handler = (_, state) => callback(state)
    ipcRenderer.on(IPC_CHANNELS.NAVIGATION_STATE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATION_STATE_CHANGED, handler)
  },
  onOpenSettings: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.OPEN_SETTINGS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OPEN_SETTINGS, handler)
  },
  onConfigUpdated: (callback) => {
    const handler = (_, config) => callback(config)
    ipcRenderer.on(IPC_CHANNELS.CONFIG_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONFIG_UPDATED, handler)
  },
})
