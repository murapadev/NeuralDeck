/**
 * Custom tRPC link for Electron IPC
 * This is a manual implementation that matches the preload's electronTRPC API
 */
import type { TRPCClientRuntime } from '@trpc/client'
import { TRPCClientError, TRPCLink } from '@trpc/client'
import type { AnyRouter } from '@trpc/server'
import { observable } from '@trpc/server/observable'

let requestId = 0

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

export function ipcLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
  return (_runtime: TRPCClientRuntime) => {
    return ({ op }) => {
      return observable((observer) => {
        const { path, input, type } = op

        if (!window.electronTRPC) {
          observer.error(
            new TRPCClientError('electronTRPC not available - preload may not have run')
          )
          return
        }

        const id = ++requestId

        const operation = {
          id,
          method: type,
          params: {
            path,
            input,
          },
        }

        const handleResponse = (response: { id: number; result?: unknown; error?: unknown }) => {
          if (response.id !== id) return

          // Cast to our expected TRPCResponse shape
          const typedResponse = response as TRPCResponse

          if (typedResponse.error) {
            observer.error(new TRPCClientError(typedResponse.error.message))
          } else if (typedResponse.result) {
            observer.next({
              result: typedResponse.result,
            })
            observer.complete()
          }
        }

        const unsubscribe = window.electronTRPC.onMessage(handleResponse)
        window.electronTRPC.sendMessage(operation)

        return () => {
          unsubscribe()
        }
      })
    }
  }
}
