import { useEffect, useState } from 'react'
import LoadingScreen from './components/LoadingScreen'
import Settings from './components/Settings'
import Sidebar from './components/Sidebar'
import { useAppStore } from './store/appStore'

// Detectar Settings window sincronamente desde el hash
const getIsSettingsWindow = () => window.location.hash === '#settings'

// Esperar a que el API esté disponible
const waitForAPI = (timeout = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.neuralDeck) {
      resolve(true)
      return
    }
    
    const startTime = Date.now()
    const interval = setInterval(() => {
      if (window.neuralDeck) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval)
        console.error('NeuralDeck API timeout - not available after', timeout, 'ms')
        resolve(false)
      }
    }, 50)
  })
}

function App() {
  const { 
    isLoading, 
    setConfig,
    setProviders, 
    setCurrentProvider, 
    setLoading,
    openSettings,
    closeSettings,
    setNavigationState
  } = useAppStore()

  // Detectar si estamos en la ventana de Settings - inicializar sincronamente
  const [isSettingsWindow, setIsSettingsWindow] = useState(getIsSettingsWindow)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar si el hash es #settings
    const checkHash = () => {
      const isSettings = window.location.hash === '#settings'
      console.log('NeuralDeck: Hash check -', window.location.hash, '-> isSettings:', isSettings)
      setIsSettingsWindow(isSettings)
    }
    
    // Check on load and hashchange
    checkHash()
    window.addEventListener('hashchange', checkHash)
    window.addEventListener('load', checkHash)
    
    return () => {
      window.removeEventListener('hashchange', checkHash)
      window.removeEventListener('load', checkHash)
    }
  }, [])

  useEffect(() => {
    // Lista de funciones de cleanup
    const cleanupFunctions: (() => void)[] = []

    // Inicializar la aplicación
    const init = async () => {
      try {
        console.log('NeuralDeck: Initializing...')
        console.log('NeuralDeck: Is Settings Window:', isSettingsWindow)
        
        // Esperar a que el API esté disponible
        const apiAvailable = await waitForAPI()
        console.log('NeuralDeck API available:', apiAvailable)
        
        if (!apiAvailable || !window.neuralDeck) {
          setApiError('NeuralDeck API not available. Please restart the application.')
          setLoading(false)
          return
        }

        // Obtener configuración completa
        const config = await window.neuralDeck.getConfig()
        console.log('NeuralDeck: Config loaded', config)
        setConfig(config)

        // Obtener proveedor actual (solo si no es ventana de settings)
        if (!isSettingsWindow) {
          const currentProvider = await window.neuralDeck.getCurrentProvider()
          console.log('NeuralDeck: Current provider', currentProvider)
          setCurrentProvider(currentProvider)
        }

        setLoading(false)

        // Suscribirse a eventos solo después de que el API esté listo
        const unsubscribeView = window.neuralDeck.onViewChanged((providerId) => {
          setCurrentProvider(providerId)
        })
        cleanupFunctions.push(unsubscribeView)

        const unsubscribeSettings = window.neuralDeck.onOpenSettings(() => {
          openSettings()
        })
        cleanupFunctions.push(unsubscribeSettings)

        const unsubscribeSettingsClosed = window.neuralDeck.onSettingsClosed(() => {
          closeSettings()
        })
        cleanupFunctions.push(unsubscribeSettingsClosed)

        const unsubscribeConfig = window.neuralDeck.onConfigUpdated((newConfig) => {
          setConfig(newConfig)
        })
        cleanupFunctions.push(unsubscribeConfig)

        const unsubscribeProviders = window.neuralDeck.onProvidersUpdated((providers) => {
          setProviders(providers)
        })
        cleanupFunctions.push(unsubscribeProviders)

        const unsubscribeNavigation = window.neuralDeck.onNavigationStateChanged((state) => {
          setNavigationState(state)
        })
        cleanupFunctions.push(unsubscribeNavigation)

      } catch (error) {
        console.error('Error initializing app:', error)
        setApiError(`Error initializing: ${error}`)
        setLoading(false)
      }
    }

    init()

    return () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup()
        } catch (e) {
          console.warn('Cleanup error:', e)
        }
      })
    }
  }, [setConfig, setProviders, setCurrentProvider, setLoading, openSettings, closeSettings, setNavigationState, isSettingsWindow])

  // Mostrar error si el API no está disponible
  if (apiError) {
    return (
      <div className="flex h-screen w-screen bg-neutral-950 items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-neutral-400 mb-4">{apiError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-neural-500 hover:bg-neural-600 text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  // Si estamos en la ventana de Settings, mostrar solo Settings
  if (isSettingsWindow) {
    return <Settings isWindow={true} />
  }

  return (
    <div className="flex h-screen w-screen bg-neutral-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area - BrowserView se renderiza aquí desde Electron */}
      <main className="flex-1 relative">
        {/* La BrowserView se posiciona sobre este área */}
        <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
          {/* Este contenido solo se ve si no hay vista cargada */}
        </div>
      </main>
    </div>
  )
}

export default App
