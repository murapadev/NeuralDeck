import { z } from 'zod'
import { BrowserWindow } from 'electron'
import { publicProcedure, router } from './trpc.js'
import configManager from '../config/configManager.js'
import { WindowManager } from '../services/WindowManager.js'
import { IPC_CHANNELS } from '../../shared/constants.js'

const broadcastConfig = () => {
  const config = configManager.getAll()
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.CONFIG_UPDATED, config)
  }
}

export const createWindowRouter = (windowManager: WindowManager) => {
  return router({
    updateWindow: publicProcedure
      .input(
        z.object({
          width: z.number().optional(),
          height: z.number().optional(),
          opacity: z.number().optional(),
          alwaysOnTop: z.boolean().optional(),
          hideOnBlur: z.boolean().optional(),
          position: z
            .enum([
              'center',
              'top-right',
              'top-left',
              'bottom-right',
              'bottom-left',
              'remember',
              'near-tray',
            ])
            .optional(),
        })
      )
      .mutation(({ input }) => {
        if (input.alwaysOnTop !== undefined)
          windowManager.mainWindow?.setAlwaysOnTop(input.alwaysOnTop)
        if (input.opacity !== undefined) windowManager.mainWindow?.setOpacity(input.opacity)
        
        if (input.width || input.height) {
          const bounds = windowManager.mainWindow?.getBounds()
          if (bounds) {
            windowManager.mainWindow?.setSize(
              input.width ?? bounds.width,
              input.height ?? bounds.height
            )
          }
        }
        configManager.updateWindow(input)
        broadcastConfig()
        return configManager.getAll()
      }),

    toggleWindow: publicProcedure.mutation(() => {
      windowManager.toggleWindow()
    }),

    setAlwaysOnTop: publicProcedure.input(z.object({ value: z.boolean() })).mutation(({ input }) => {
      windowManager.mainWindow?.setAlwaysOnTop(input.value)
      configManager.updateWindow({ alwaysOnTop: input.value })
      broadcastConfig()
      return input.value
    }),
    
    closeSettingsWindow: publicProcedure.mutation(() => {
        windowManager.closeSettingsWindow()
    }),
    
    clearAllData: publicProcedure.mutation(async () => {
      const ses = windowManager.mainWindow?.webContents.session
      if (ses) {
        await ses.clearStorageData()
        await ses.clearCache()
      }
    }),
  })
}
