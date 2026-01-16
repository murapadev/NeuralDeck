import { z } from 'zod'
import { shell } from 'electron'
import { publicProcedure, router } from './trpc.js'
import configManager from '../config/configManager.js'
import { ViewManager } from '../services/ViewManager.js'
import { WindowManager } from '../services/WindowManager.js'
import { logger } from '../services/LoggerService.js'

export const createViewsRouter = (
  viewManager: ViewManager, 
  windowManager: WindowManager
) => {
  return router({
    switchView: publicProcedure.input(z.string()).mutation(({ input }) => {
      viewManager.switchView(input)
    }),

    detachView: publicProcedure.input(z.string()).mutation(({ input }) => {
      const config = configManager.getAll()
      const provider = config.providers.find((p) => p.id === input)
      if (provider && provider.url) {
        windowManager.createDetachedWindow(provider.url)
      } else {
        throw new Error(`Provider not found or invalid: ${input}`)
      }
    }),

    openExternal: publicProcedure.input(z.string()).mutation(async ({ input }) => {
      let url = input
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }

      try {
        windowManager.createDetachedWindow(url)
      } catch (e) {
        logger.error('Backend failed to create detached window:', e)
        await shell.openExternal(url)
      }
    }),

    goBack: publicProcedure.mutation(() => {
      viewManager.goBack()
    }),

    goForward: publicProcedure.mutation(() => {
      viewManager.goForward()
    }),

    reload: publicProcedure.mutation(() => {
      viewManager.reloadCurrent()
    }),
  })
}
