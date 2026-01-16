import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { TIMING } from '../shared/types'
import ChatInterface from './components/ChatInterface'
import LoadingScreen from './components/LoadingScreen'
import Onboarding from './components/Onboarding'
import Settings from './components/Settings'
import Sidebar from './components/Sidebar'
import { ToastProvider } from './components/ToastProvider'
import { TooltipProvider } from './components/ui/tooltip'
import { useAutoUpdate, useIpcListeners, useTheme } from './hooks'
import { useAppStore } from './store/appStore'
import { ipcLink } from './utils/electronLink'
import { trpc } from './utils/trpc'

function MainContent() {
  const {
    currentProviderId,
    setCurrentProvider,
    setConfig,
    isLoading: isStoreLoading,
    setLoading,
  } = useAppStore()

  // React Query for initial data
  const { data: config, isLoading: isConfigLoading, isError } = trpc.getConfig.useQuery()

  // Sync with store when config is loaded
  useEffect(() => {
    if (config) {
      setConfig(config)
      setLoading(false)
      if (!currentProviderId && config.lastProvider) {
        setCurrentProvider(config.lastProvider)
      }
    } else if (isError) {
      // Handle error case - stop loading to prevent infinite loading state
      console.error('[App] Failed to load config from tRPC')
      setLoading(false)
    }
  }, [config, isError, setConfig, setLoading, currentProviderId, setCurrentProvider])

  // Use extracted hooks for IPC, auto-update, and theme
  useIpcListeners()
  useAutoUpdate()
  useTheme()

  // Settings check (hash-based routing)
  const [isSettingsWindow, setIsSettingsWindow] = useState(
    () => window.location.hash === '#settings'
  )

  useEffect(() => {
    const checkHash = () => setIsSettingsWindow(window.location.hash === '#settings')
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  if (isConfigLoading || isStoreLoading) {
    return <LoadingScreen />
  }

  if (isSettingsWindow) {
    return <Settings isWindow={true} />
  }

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      <Onboarding />
      <Sidebar />
      <main className="flex-1 relative">
        {/* Only show content for Ollama - WebContentsView handles other providers natively */}
        {currentProviderId === 'ollama' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="w-full h-full">
              <ChatInterface />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  // Check if electronTRPC is available - compute during render, not in effect
  const [isElectronReady, setIsElectronReady] = useState(() => {
    return typeof window !== 'undefined' && !!window.electronTRPC
  })

  // If not ready initially, poll for electronTRPC availability
  useEffect(() => {
    if (isElectronReady) return // Already ready, nothing to do

    console.log('[App] Polling for electronTRPC availability...')

    // Poll for electronTRPC availability
    const checkInterval = setInterval(() => {
      console.log('[App] Checking electronTRPC:', !!window.electronTRPC)
      if (window.electronTRPC) {
        console.log('[App] electronTRPC is now available')
        setIsElectronReady(true)
        clearInterval(checkInterval)
      }
    }, TIMING.ELECTRON_POLL_INTERVAL)

    // Timeout after configured duration - still set ready to allow fallback behavior
    const timeout = setTimeout(() => {
      clearInterval(checkInterval)
      console.error('[App] electronTRPC not available after timeout - forcing ready state')
      // Force ready state even on timeout to avoid permanent loading
      // The tRPC queries will fail gracefully with error handling
      setIsElectronReady(true)
    }, TIMING.ELECTRON_TIMEOUT)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [isElectronReady])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 2,
            retryDelay: 500,
          },
        },
      })
  )

  // Create tRPC client once when Electron is ready
  // Use useMemo to ensure stable client creation
  const trpcClient = useMemo(() => {
    if (!isElectronReady) {
      return null
    }
    return trpc.createClient({
      links: [ipcLink()],
    })
  }, [isElectronReady])

  // Show loading screen while waiting for Electron and tRPC client to be ready
  if (!isElectronReady || !trpcClient) {
    return <LoadingScreen />
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToastProvider />
          <MainContent />
        </TooltipProvider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default App
