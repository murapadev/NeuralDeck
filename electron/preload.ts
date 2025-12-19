import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (args: unknown[]) => ipcRenderer.send('electron-trpc', args),
  onMessage: (callback: (args: unknown[]) => void) => {
    const handler = (_: any, args: unknown[]) => callback(args)
    ipcRenderer.on('electron-trpc', handler)
    return () => ipcRenderer.removeListener('electron-trpc', handler)
  },
})
