/**
 * Router Registry - Provides access to the app router without circular dependencies
 * This module acts as a singleton registry for the tRPC router
 */
import type { AppRouter } from '../router/index.js'

// Store the app router for use by other modules
let appRouter: AppRouter | null = null

/**
 * Set the app router instance
 */
export function setAppRouter(router: AppRouter): void {
  appRouter = router
}

/**
 * Get the app router instance for registering additional windows with tRPC IPC handler
 */
export function getAppRouter(): AppRouter | null {
  return appRouter
}
