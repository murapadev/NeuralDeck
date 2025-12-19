import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ipcLink } from 'electron-trpc/renderer'
import { trpc } from './utils/trpc'
import Sidebar from './components/Sidebar'
import ChatInterface from './components/ChatInterface'
import Settings from './components/Settings'
import LoadingScreen from './components/LoadingScreen'
import { useAppStore } from './store/appStore'

function MainContent() {
  const { 
    currentProviderId, 
    setCurrentProvider, 
    setConfig, 
    isLoading: isStoreLoading, // rename to avoid conflict
    setLoading
  } = useAppStore()

  // React Query for initial data
  const { data: config, isLoading: isConfigLoading } = trpc.getConfig.useQuery()
  
  // Sync with store when config is loaded
  useEffect(() => {
    if (config) {
        setConfig(config)
        setLoading(false)
        if (!currentProviderId && config.lastProvider) {
            setCurrentProvider(config.lastProvider)
        }
    }
  }, [config, setConfig, setLoading, currentProviderId, setCurrentProvider])
  
  // Settings check (naive implementation for now)
  const [isSettingsWindow, setIsSettingsWindow] = useState(() => window.location.hash === '#settings')
  
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
    <div className="flex h-screen w-screen bg-neutral-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center text-neutral-600 bg-neutral-950">
          {currentProviderId === 'ollama' ? (
            <div className="w-full h-full z-10">
              <ChatInterface />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

function App() {
  const [queryClient] = useState(() => new QueryClient({
      defaultOptions: {
          queries: {
              refetchOnWindowFocus: false,
              retry: false
          }
      }
  }))
  
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [ipcLink()],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MainContent />
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default App

