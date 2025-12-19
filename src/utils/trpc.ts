import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../electron/router'

export const trpc = createTRPCReact<AppRouter>()
