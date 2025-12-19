import { contextBridge, ipcRenderer } from 'electron'

// Expose tRPC communication
contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (args: unknown[]) => ipcRenderer.send('electron-trpc', args),
  onMessage: (callback: (args: unknown[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, args: unknown[]) => callback(args)
    ipcRenderer.on('electron-trpc', handler)
    return () => ipcRenderer.removeListener('electron-trpc', handler)
  },
})

// Expose navigation events from main process
contextBridge.exposeInMainWorld('neuralDeck', {
  // Listen for view changes
  onViewChanged: (callback: (providerId: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, providerId: string) => callback(providerId)
    ipcRenderer.on('view-changed', handler)
    return () => ipcRenderer.removeListener('view-changed', handler)
  },
  // Listen for navigation state changes
  onNavigationStateChanged: (
    callback: (state: { canGoBack: boolean; canGoForward: boolean; url: string }) => void
  ) => {
    const handler = (
      _: Electron.IpcRendererEvent,
      state: { canGoBack: boolean; canGoForward: boolean; url: string }
    ) => callback(state)
    ipcRenderer.on('navigation-state-changed', handler)
    return () => ipcRenderer.removeListener('navigation-state-changed', handler)
  },
  // Listen for settings open request
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('open-settings', handler)
    return () => ipcRenderer.removeListener('open-settings', handler)
  },
})
