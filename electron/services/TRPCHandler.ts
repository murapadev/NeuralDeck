/**
 * Custom IPC handler for tRPC
 * This matches the manual preload implementation and handles tRPC requests
 */
import type { AnyProcedure, AnyRouter } from '@trpc/server'
import { BrowserWindow, ipcMain } from 'electron'
import { logger } from './LoggerService.js'

// Track registered windows to prevent duplicate handlers
const registeredWindows = new Set<number>()
let handlerRegistered = false

interface TRPCOperation {
  id: number
  method: 'query' | 'mutation' | 'subscription'
  params: {
    path: string
    input?: unknown
  }
}

interface TRPCResponse {
  id: number
  result?: {
    type: 'data'
    data: unknown
  }
  error?: {
    message: string
    code: number
    data?: unknown
  }
}

type RouterProcedures = Record<string, AnyProcedure>

export function createTRPCIPCHandler<TRouter extends AnyRouter>(options: {
  router: TRouter
  windows: BrowserWindow[]
}): void {
  const { router, windows } = options
  const procedures = router._def.procedures as RouterProcedures

  // Add new windows to the registered set
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      registeredWindows.add(win.id)
      // Clean up when window is closed
      win.once('closed', () => {
        registeredWindows.delete(win.id)
      })
    }
  }

  // Only register the IPC handler once
  if (handlerRegistered) {
    logger.info('[TRPCHandler] Handler already registered, added windows to registry')
    return
  }
  handlerRegistered = true
  logger.info('[TRPCHandler] Registering IPC handler for tRPC')
  logger.info('[TRPCHandler] Registered window IDs:', Array.from(registeredWindows))

  ipcMain.on('trpc', async (event, operation: TRPCOperation) => {
    logger.info('[TRPCHandler] RAW IPC received on trpc channel')
    const { id, method: _method, params } = operation
    const { path, input } = params
    logger.info('[TRPCHandler] Received request:', path, JSON.stringify(input))

    // Only process from registered windows
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    if (!senderWindow || !registeredWindows.has(senderWindow.id)) {
      logger.warn('[TRPCHandler] Request from unregistered window, ignoring')
      return
    }

    try {
      const procedure = procedures[path]
      if (!procedure) {
        throw new Error(`Procedure not found: ${path}`)
      }

      // Call the procedure with empty context and the input
      const caller = router.createCaller({})
      const pathParts = path.split('.')

      // Navigate to the correct procedure in the router
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = caller
      for (const part of pathParts) {
        current = current[part]
      }

      const result = await current(input)

      const response: TRPCResponse = {
        id,
        result: {
          type: 'data',
          data: result,
        },
      }

      event.sender.send('trpc', response)
    } catch (cause) {
      console.error('[TRPCHandler] Error in procedure:', path, cause)
      const errorMessage = cause instanceof Error ? cause.message : 'Unknown error'

      const response: TRPCResponse = {
        id,
        error: {
          message: errorMessage,
          code: 500,
          data: {
            path,
          },
        },
      }

      event.sender.send('trpc', response)
    }
  })
}
