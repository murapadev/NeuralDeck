import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants.js'

console.log('[Preload] Script starting...')

// Manual implementation of electronTRPC API that ipcLink expects
contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (operation: {
    id: number
    method: string
    params: { path: string; input?: unknown }
  }) => {
    console.log('[Preload] electronTRPC.sendMessage:', operation.params.path)
    ipcRenderer.send('trpc', operation)
  },
  onMessage: (callback: (response: { id: number; result?: unknown; error?: unknown }) => void) => {
    const handler = (
      _: Electron.IpcRendererEvent,
      response: { id: number; result?: unknown; error?: unknown }
    ) => {
      console.log('[Preload] electronTRPC.onMessage received:', response)
      callback(response)
    }
    ipcRenderer.on('trpc', handler)
    return () => ipcRenderer.removeListener('trpc', handler)
  },
})

console.log('[Preload] electronTRPC exposed to window')

// Expose custom NeuralDeck APIs separately
contextBridge.exposeInMainWorld('neuralDeck', {
  // Navigation & Views
  switchView: (providerId: string) => ipcRenderer.send(IPC_CHANNELS.SWITCH_VIEW, providerId),
  openExternal: (url: string) => ipcRenderer.send(IPC_CHANNELS.OPEN_EXTERNAL, url),
  reload: () => ipcRenderer.send(IPC_CHANNELS.RELOAD),
  goBack: () => ipcRenderer.send(IPC_CHANNELS.GO_BACK),
  goForward: () => ipcRenderer.send(IPC_CHANNELS.GO_FORWARD),

  // Window & Layout
  openSettingsWindow: () => ipcRenderer.send(IPC_CHANNELS.OPEN_SETTINGS_WINDOW),
  closeSettingsWindow: () => ipcRenderer.send(IPC_CHANNELS.CLOSE_SETTINGS_WINDOW),

  // Auto-Update
  downloadUpdate: () => ipcRenderer.send(IPC_CHANNELS.DOWNLOAD_UPDATE),
  installUpdate: () => ipcRenderer.send(IPC_CHANNELS.INSTALL_UPDATE),
  onUpdateAvailable: (callback: (info: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, info: unknown) => callback(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, handler)
  },
  onUpdateDownloaded: (callback: (info: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, info: unknown) => callback(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOADED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_DOWNLOADED, handler)
  },
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, progress: { percent: number }) =>
      callback(progress)
    ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler)
  },
  onUpdateError: (callback: (error: Error) => void) => {
    const handler = (_: Electron.IpcRendererEvent, error: Error) => callback(error)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_ERROR, handler)
  },

  // System
  getPlatform: () => Promise.resolve(process.platform),

  // Events
  onViewChanged: (callback: (providerId: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, providerId: string) => callback(providerId)
    ipcRenderer.on(IPC_CHANNELS.VIEW_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.VIEW_CHANGED, handler)
  },
  onNavigationStateChanged: (
    callback: (state: { canGoBack: boolean; canGoForward: boolean; url: string }) => void
  ) => {
    const handler = (
      _: Electron.IpcRendererEvent,
      state: { canGoBack: boolean; canGoForward: boolean; url: string }
    ) => callback(state)
    ipcRenderer.on(IPC_CHANNELS.NAVIGATION_STATE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATION_STATE_CHANGED, handler)
  },
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.OPEN_SETTINGS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OPEN_SETTINGS, handler)
  },
})
