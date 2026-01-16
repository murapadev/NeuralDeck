import { z } from 'zod'
import { app } from 'electron'
import { publicProcedure, router } from './trpc.js'
import configManager from '../config/configManager.js'
import { ShortcutManager } from '../services/ShortcutManager.js'
import { ViewManager } from '../services/ViewManager.js'

export const createSettingsRouter = (
  shortcutManager: ShortcutManager,
  viewManager: ViewManager
) => {
  return router({
    // Application version from package.json
    getAppVersion: publicProcedure.query(() => {
      return app.getVersion()
    }),

    // Configuration common
    getConfig: publicProcedure.query(() => {
      return { ...configManager.getAll() }
    }),

    // Appearance
    updateAppearance: publicProcedure
      .input(
        z.object({
          theme: z.enum(['dark', 'light', 'system']).optional(),
          language: z.enum(['en', 'es']).optional(),
          showProviderNames: z.boolean().optional(),
          fontSize: z.enum(['small', 'medium', 'large']).optional(),
          accentColor: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        configManager.updateAppearance(input)
        if (input.showProviderNames !== undefined) {
          viewManager.handleResize()
        }
        return configManager.getAll()
      }),

    // Privacy
    updatePrivacy: publicProcedure
      .input(
        z.object({
          clearOnClose: z.boolean().optional(),
          blockTrackers: z.boolean().optional(),
          incognitoProviders: z.array(z.string()).optional(),
        })
      )
      .mutation(({ input }) => {
        configManager.updatePrivacy(input)
        return configManager.getAll()
      }),

    // Shortcuts
    updateShortcuts: publicProcedure
      .input(
        z.object({
          toggleWindow: z.string().optional(),
          reload: z.string().optional(),
          goBack: z.string().optional(),
          goForward: z.string().optional(),
          openSettings: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        configManager.updateShortcuts(input)
        shortcutManager.refresh()
        return configManager.getAll()
      }),

    // General
    updateGeneral: publicProcedure
      .input(
        z.object({
          firstRun: z.boolean().optional(),
          lastProvider: z.string().nullable().optional(),
          debug: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        configManager.updateGeneral(input)
        return configManager.getAll()
      }),
    exportConfig: publicProcedure.mutation(() => {
      return configManager.exportConfig()
    }),

    importConfig: publicProcedure.input(z.string()).mutation(({ input }) => {
      const success = configManager.importConfig(input)
      if (success) {
        shortcutManager.refresh()
        viewManager.handleResize()
      }
      return success
    }),

    resetConfig: publicProcedure.mutation(() => {
      configManager.reset()
      shortcutManager.refresh()
      viewManager.handleResize()
      return configManager.getAll()
    }),
  })
}
