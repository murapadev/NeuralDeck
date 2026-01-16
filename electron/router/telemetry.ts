import { publicProcedure, router } from './trpc.js'
import { z } from 'zod'
import { ViewManager } from '../services/ViewManager.js'
import { logger } from '../services/LoggerService.js'

export const createTelemetryRouter = (viewManager: ViewManager) => {
  return router({
    /**
     * Get memory statistics (opt-in telemetry endpoint)
     */
    getMemoryStats: publicProcedure.query(() => {
      return viewManager.getDetailedMemoryStats()
    }),

    /**
     * Get performance metrics for diagnostics
     */
    getPerformanceMetrics: publicProcedure.query(() => {
      const mem = process.memoryUsage()
      const cpu = process.cpuUsage()
      const uptime = process.uptime()

      return {
        memory: {
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          rss: Math.round(mem.rss / 1024 / 1024),
          external: Math.round(mem.external / 1024 / 1024),
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
        uptime: Math.round(uptime),
        views: viewManager.getMemoryStats(),
      }
    }),

    /**
     * Force garbage collection of unused views
     */
    runViewGC: publicProcedure.mutation(() => {
      viewManager.enforceMemoryLimit(3)
      logger.info('Telemetry: Manual view GC triggered')
      return { success: true }
    }),

    /**
     * Log anonymous usage event (if user opts in)
     */
    logEvent: publicProcedure
      .input(z.object({
        event: z.string(),
        properties: z.record(z.string(), z.unknown()).optional()
      }))
      .mutation(({ input }) => {
        // For now, just log locally. Could be extended to send to analytics service.
        logger.info(`Telemetry event: ${input.event}`, input.properties)
        return { logged: true }
      })
  })
}
