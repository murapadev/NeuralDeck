import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import { shell } from 'electron'
import { WindowManager } from '../services/WindowManager.js'
import { ViewManager } from '../services/ViewManager.js'
import { ShortcutManager } from '../services/ShortcutManager.js'
import configManager from '../config/configManager.js'
import faviconManager from '../utils/faviconManager.js'
// import type { AppConfig, ProviderConfig } from '../config/types.js' // unused

const t = initTRPC.create()

export const createRouter = (
  windowManager: WindowManager,
  viewManager: ViewManager,
  shortcutManager: ShortcutManager
) => {
  return t.router({
    // Configuration
    getConfig: t.procedure.query(() => {
      // Return a copy to avoid mutation
      return { ...configManager.getAll() }
    }),

    updateAppearance: t.procedure
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
        // Trigger resize if sidebar changed
        if (input.showProviderNames !== undefined) {
          viewManager.handleResize()
        }
        return configManager.getAll()
      }),

    updateWindow: t.procedure
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
        // Helper to apply other window props if needed, or mostly config sync
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
        return configManager.getAll()
      }),

    updatePrivacy: t.procedure
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

    updateShortcuts: t.procedure
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
        // Re-register global shortcuts with new config
        shortcutManager.refresh()
        return configManager.getAll()
      }),

    // Providers Management
    addCustomProvider: t.procedure
      .input(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          url: z.string().url(),
          icon: z.string().default('custom'),
          color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default('#6366f1'),
          enabled: z.boolean().default(true),
          isCustom: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        configManager.addCustomProvider(input)
        return configManager.getAll()
      }),

    removeCustomProvider: t.procedure.input(z.string()).mutation(({ input }) => {
      configManager.removeCustomProvider(input)
      return configManager.getAll()
    }),

    updateProvider: t.procedure
      .input(
        z.object({
          id: z.string(),
          data: z.object({
            enabled: z.boolean().optional(),
          }),
        })
      )
      .mutation(({ input }) => {
        configManager.updateProvider(input.id, input.data)
        return configManager.getAll()
      }),

    clearAllData: t.procedure.mutation(async () => {
      const ses = windowManager.mainWindow?.webContents.session
      if (ses) {
        await ses.clearStorageData()
        await ses.clearCache()
      }
    }),

    openExternal: t.procedure.input(z.string()).mutation(async ({ input }) => {
      // Check if it's a valid URL, if not try to fix or fall back
      let url = input
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }

      try {
        windowManager.createDetachedWindow(url)
      } catch (e) {
        console.error('Backend failed to create detached window:', e)
        // Fallback to shell if window creation fails specific to URL
        await shell.openExternal(url)
      }
    }),

    closeSettingsWindow: t.procedure.mutation(() => {
      // Implement if settings is a separate window managed by WindowManager
      // For now, assuming it might be a view or valid IPC
    }),

    // Window
    toggleWindow: t.procedure.mutation(() => {
      windowManager.toggleWindow()
    }),

    setAlwaysOnTop: t.procedure.input(z.object({ value: z.boolean() })).mutation(({ input }) => {
      windowManager.mainWindow?.setAlwaysOnTop(input.value)
      configManager.updateWindow({ alwaysOnTop: input.value })
      return input.value
    }),

    // Views/Providers
    getProviders: t.procedure.query(() => {
      return configManager.getEnabledProviders()
    }),

    switchView: t.procedure.input(z.string()).mutation(({ input }) => {
      viewManager.switchView(input)
    }),

    detachView: t.procedure.input(z.string()).mutation(({ input }) => {
      const config = configManager.getAll()
      const provider = config.providers.find((p) => p.id === input)
      if (provider && provider.url) {
        windowManager.createDetachedWindow(provider.url)
      } else {
        throw new Error(`Provider not found or invalid: ${input}`)
      }
    }),

    // Navigation
    goBack: t.procedure.mutation(() => {
      viewManager.goBack()
    }),

    goForward: t.procedure.mutation(() => {
      viewManager.goForward()
    }),

    reload: t.procedure.mutation(() => {
      viewManager.reloadCurrent()
    }),

    // Favicon
    getProviderIcon: t.procedure
      .input(z.object({ providerId: z.string(), size: z.number().optional() }))
      .query(async ({ input }) => {
        const config = configManager.getAll()
        const provider = config.providers.find((p) => p.id === input.providerId)
        if (!provider) {
          return null
        }
        try {
          const dataUrl = await faviconManager.getProviderIconDataURL(provider, input.size || 32)
          return dataUrl
        } catch {
          return null
        }
      }),
  })
}

export type AppRouter = ReturnType<typeof createRouter>
