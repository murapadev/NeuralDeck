import { z } from 'zod'
import { publicProcedure, router } from './trpc.js'
import configManager from '../config/configManager.js'
import faviconManager from '../utils/faviconManager.js'
import { COLORS, FAVICON } from '../../shared/types.js'

export const createProvidersRouter = () => {
  return router({
    addCustomProvider: publicProcedure
      .input(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          url: z.string().url(),
          icon: z.string().default('custom'),
          color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default(COLORS.DEFAULT_ACCENT),
          enabled: z.boolean().default(true),
          isCustom: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        configManager.addCustomProvider(input)
        return configManager.getAll()
      }),

    removeCustomProvider: publicProcedure.input(z.string()).mutation(({ input }) => {
      configManager.removeCustomProvider(input)
      return configManager.getAll()
    }),

    updateProvider: publicProcedure
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

    updateProvidersList: publicProcedure
      .input(z.array(z.any())) // We can refine this validation if needed
      .mutation(({ input }) => {
        configManager.updateProviders(input)
        return configManager.getAll()
      }),

    getProviders: publicProcedure.query(() => {
      return configManager.getEnabledProviders()
    }),

    getProviderIcon: publicProcedure
      .input(z.object({ providerId: z.string(), size: z.number().optional() }))
      .query(async ({ input }) => {
        const config = configManager.getAll()
        const provider = config.providers.find((p) => p.id === input.providerId)
        if (!provider) {
          return null
        }
        try {
          const dataUrl = await faviconManager.getProviderIconDataURL(provider, input.size || FAVICON.DEFAULT_SIZE)
          return dataUrl
        } catch {
          return null
        }
      }),
  })
}
