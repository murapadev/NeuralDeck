import { useEffect, useState } from 'react'
import { useAppStore, useAppearanceConfig } from '../store/appStore'

// Cache de iconos cargados
const iconCache: Map<string, string> = new Map()

// Componente de icono con favicon
function ProviderIconWithFavicon({ 
  providerId, 
  providerIcon,
  providerName, 
  color 
}: { 
  providerId: string
  providerIcon: string
  providerName: string
  color: string 
}) {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(iconCache.get(providerId) || null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    // Si ya tenemos el icono en caché, no hacer nada
    if (iconCache.has(providerId)) {
      setFaviconUrl(iconCache.get(providerId)!)
      return
    }

    // Intentar cargar el favicon
    const loadFavicon = async () => {
      try {
        const iconUrl = await window.neuralDeck?.getProviderIcon(providerId)
        if (iconUrl) {
          iconCache.set(providerId, iconUrl)
          setFaviconUrl(iconUrl)
        } else {
          setLoadError(true)
        }
      } catch (error) {
        console.warn(`Failed to load favicon for ${providerId}:`, error)
        setLoadError(true)
      }
    }

    loadFavicon()
  }, [providerId])

  // Si tenemos favicon cargado, mostrarlo
  if (faviconUrl && !loadError) {
    return (
      <img 
        src={faviconUrl} 
        alt={providerName} 
        className="w-6 h-6 rounded"
        onError={() => setLoadError(true)}
      />
    )
  }

  // Fallback: usar icono SVG o inicial
  const IconComponent = ProviderIcons[providerIcon] || ProviderIcons[providerId]
  if (IconComponent) {
    return IconComponent(color)
  }

  // Último fallback: inicial del nombre
  return (
    <div 
      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {providerName[0]}
    </div>
  )
}

// Iconos SVG para cada proveedor (iconos profesionales)
const ProviderIcons: Record<string, (color: string) => JSX.Element> = {
  chatgpt: (color) => (
    <svg viewBox="0 0 24 24" fill={color} className="w-6 h-6">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  ),
  gemini: (color) => (
    <svg viewBox="0 0 24 24" fill={color} className="w-6 h-6">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 3.6c2.2 0 4.2.9 5.7 2.4L12 12 6.3 6c1.5-1.5 3.5-2.4 5.7-2.4zm-8.4 8.4c0-2.2.9-4.2 2.4-5.7L12 12l-6 5.7c-1.5-1.5-2.4-3.5-2.4-5.7zm8.4 8.4c-2.2 0-4.2-.9-5.7-2.4L12 12l5.7 6c-1.5 1.5-3.5 2.4-5.7 2.4zm8.4-8.4c0 2.2-.9 4.2-2.4 5.7L12 12l6-5.7c1.5 1.5 2.4 3.5 2.4 5.7z"/>
    </svg>
  ),
  claude: (color) => (
    <svg viewBox="0 0 24 24" fill={color} className="w-6 h-6">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2V7h2v10z"/>
    </svg>
  ),
  deepseek: (color) => (
    <svg viewBox="0 0 24 24" fill={color} className="w-6 h-6">
      <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L17.5 8 12 11.5 6.5 8 12 4.5zM6 9.5l5 3v6l-5-3v-6zm7 9v-6l5-3v6l-5 3z"/>
    </svg>
  ),
  perplexity: (color) => (
    <svg viewBox="0 0 24 24" fill={color} className="w-6 h-6">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      <circle cx="12" cy="12" r="3" fill={color}/>
    </svg>
  ),
  ollama: (color) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="4" fill={color}/>
    </svg>
  ),
  custom: (color) => (
    <svg viewBox="0 0 24 24" fill={color} className="w-6 h-6">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  ),
}

// Iconos de UI
const UIIcons = {
  reload: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  back: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  forward: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  collapse: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  expand: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
  popout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
}

function Sidebar() {
  const { 
    providers, 
    currentProviderId, 
    isSidebarCollapsed, 
    toggleSidebar, 
    navigationState,
    openSettings 
  } = useAppStore()
  const appearanceConfig = useAppearanceConfig()
  const showNames = appearanceConfig?.showProviderNames ?? false

  const handleProviderClick = (providerId: string, e: React.MouseEvent) => {
    // Ctrl+click (o Cmd+click en macOS) abre en ventana separada
    if (e.ctrlKey || e.metaKey) {
      window.neuralDeck?.detachView(providerId)
    } else {
      window.neuralDeck?.switchView(providerId)
    }
  }

  const handleDetach = (providerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    window.neuralDeck?.detachView(providerId)
  }

  const handleClose = () => {
    window.neuralDeck?.hideWindow()
  }

  // Debug: mostrar estado de providers
  console.log('Sidebar providers:', providers, 'currentProviderId:', currentProviderId)

  return (
    <aside 
      className={`
        flex flex-col h-full bg-neutral-900 border-r border-neutral-800
        transition-all duration-300 ease-out
        ${isSidebarCollapsed ? 'w-0 overflow-hidden' : showNames ? 'w-[140px]' : 'w-[60px]'}
      `}
    >
      {/* Header con controles de ventana */}
      <div className="flex items-center justify-center pt-3 pb-2 app-drag gap-2">
        {/* macOS style window controls */}
        <button
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors app-no-drag"
          title="Cerrar"
        />
        <button
          onClick={() => window.neuralDeck?.minimizeWindow()}
          className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors app-no-drag"
          title="Minimizar"
        />
        <button
          onClick={toggleSidebar}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors app-no-drag"
          title="Colapsar"
        />
      </div>

      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neural-500 to-neural-700 flex items-center justify-center shadow-lg shadow-neural-500/20">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        {showNames && (
          <span className="ml-2 text-white font-semibold text-sm">NeuralDeck</span>
        )}
      </div>

      {/* Provider buttons */}
      <nav className="flex-1 flex flex-col gap-1 py-4 px-2 overflow-y-auto">
        {providers.map((provider, index) => (
          <div key={provider.id} className="tooltip-trigger relative group">
            {/* Provider button */}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => handleProviderClick(provider.id, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProviderClick(provider.id, e as unknown as React.MouseEvent)
                }
              }}
              className={`
                w-full flex items-center gap-3 rounded-lg transition-all duration-200 cursor-pointer
                ${showNames ? 'px-3 py-2.5' : 'p-2.5 justify-center'}
                ${currentProviderId === provider.id 
                  ? 'bg-neutral-800 shadow-lg' 
                  : 'hover:bg-neutral-800/50'
                }
              `}
              style={{
                color: currentProviderId === provider.id ? provider.color : undefined,
                boxShadow: currentProviderId === provider.id ? `0 0 20px ${provider.color}20` : undefined
              }}
            >
              <div 
                className={`
                  flex items-center justify-center rounded-lg transition-transform
                  ${currentProviderId === provider.id ? 'scale-110' : 'group-hover:scale-105'}
                `}
              >
                <ProviderIconWithFavicon 
                  providerId={provider.id}
                  providerIcon={provider.icon}
                  providerName={provider.name}
                  color={provider.color}
                />
              </div>
              {showNames && (
                <span className={`text-sm truncate ${currentProviderId === provider.id ? 'font-medium' : 'text-neutral-400'}`}>
                  {provider.name}
                </span>
              )}
            </div>
            
            {/* Pop-out button - separate from provider button */}
            <button
              onClick={(e) => handleDetach(provider.id, e)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all z-10"
              title="Abrir en ventana separada (Ctrl+click)"
            >
              {UIIcons.popout}
            </button>
            
            {/* Tooltip (solo si no mostramos nombres) */}
            {!showNames && (
              <span className="tooltip">
                {provider.name}
                <span className="text-xs opacity-60 ml-1">Ctrl+{index + 1}</span>
              </span>
            )}
            
            {/* Indicador activo */}
            {currentProviderId === provider.id && (
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                style={{ backgroundColor: provider.color }}
              />
            )}
          </div>
        ))}
      </nav>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-1 py-2 px-2 border-t border-neutral-800">
        <button
          onClick={() => window.neuralDeck?.goBack()}
          disabled={!navigationState.canGoBack}
          className={`p-2 rounded-lg transition-colors ${
            navigationState.canGoBack 
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' 
              : 'text-neutral-700 cursor-not-allowed'
          }`}
          title="Atrás"
        >
          {UIIcons.back}
        </button>
        <button
          onClick={() => window.neuralDeck?.goForward()}
          disabled={!navigationState.canGoForward}
          className={`p-2 rounded-lg transition-colors ${
            navigationState.canGoForward 
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' 
              : 'text-neutral-700 cursor-not-allowed'
          }`}
          title="Adelante"
        >
          {UIIcons.forward}
        </button>
        <button
          onClick={() => window.neuralDeck?.reload()}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Recargar"
        >
          {UIIcons.reload}
        </button>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-center gap-1 py-3 px-2 border-t border-neutral-800">
        {/* Settings button */}
        <button
          onClick={() => openSettings()}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Configuración"
        >
          {UIIcons.settings}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={isSidebarCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isSidebarCollapsed ? UIIcons.expand : UIIcons.collapse}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
