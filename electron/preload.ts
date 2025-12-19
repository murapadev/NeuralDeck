import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.log('[Preload] Sending tRPC message:', args)
    ipcRenderer.send('electron-trpc', args)
  },
  onMessage: (callback: (args: unknown[]) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (_: any, args: unknown[]) => callback(args)
    ipcRenderer.on('electron-trpc', handler)
    return () => ipcRenderer.removeListener('electron-trpc', handler)
  },
})

// Expose navigation events from main process
contextBridge.exposeInMainWorld('neuralDeck', {
  onViewChanged: (callback: (providerId: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (_: any, providerId: string) => callback(providerId)
    ipcRenderer.on('view-changed', handler)
    return () => ipcRenderer.removeListener('view-changed', handler)
  },
  onNavigationStateChanged: (
    callback: (state: { canGoBack: boolean; canGoForward: boolean; url: string }) => void
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (_: any, state: { canGoBack: boolean; canGoForward: boolean; url: string }) =>
      callback(state)
    ipcRenderer.on('navigation-state-changed', handler)
    return () => ipcRenderer.removeListener('navigation-state-changed', handler)
  },
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('open-settings', handler)
    return () => ipcRenderer.removeListener('open-settings', handler)
  },
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
})
