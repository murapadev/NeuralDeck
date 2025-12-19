import { useAppStore, useAppearanceConfig, useWindowConfig } from '../store/appStore'
import { trpc } from '../utils/trpc'
import { ProviderIcons, UIIcons } from './icons'
import { useTranslation } from '../i18n'

// Provider icon component with fallback
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
  // Fetch favicon
  const { data: favicon } = trpc.getProviderIcon.useQuery(
    { providerId, size: 64 },
    { 
      staleTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false 
    }
  )

  // 1. Favicon (highest priority if network/cache succeeded)
  if (favicon) {
    return (
      <img 
        src={favicon} 
        alt={providerName}
        className="w-full h-full object-contain rounded-md animate-fade-in"
      />
    )
  }

  // 2. Built-in Icon
  const IconComponent = ProviderIcons[providerIcon] || ProviderIcons[providerId]
  if (IconComponent) {
    return IconComponent(color)
  }

  // 3. Initials Fallback
  return (
    <div 
      className="w-full h-full rounded flex items-center justify-center text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {providerName[0].toUpperCase()}
    </div>
  )
}

function Sidebar() {
  const { 
    providers, 
    currentProviderId, 
    navigationState,
    openSettings,
  } = useAppStore()
  
  const { t } = useTranslation()
  const windowConfig = useWindowConfig()
  const isPinned = windowConfig?.alwaysOnTop ?? false
  const appearanceConfig = useAppearanceConfig()
  const showNames = appearanceConfig?.showProviderNames ?? false

  // Mutations
  const switchViewMutation = trpc.switchView.useMutation()
  const togglePinMutation = trpc.setAlwaysOnTop.useMutation()
  const reloadMutation = trpc.reload.useMutation()
  const backMutation = trpc.goBack.useMutation()
  const forwardMutation = trpc.goForward.useMutation()
  const openExternalMutation = trpc.openExternal.useMutation()

  const handleProviderClick = (provider: { id: string, url: string }, e: React.MouseEvent) => {
    // Ctrl+click opens in default browser (detach)
    if (e.ctrlKey || e.metaKey) {
       openExternalMutation.mutate(provider.url)
    } else {
      switchViewMutation.mutate(provider.id)
    }
  }

  const handleDetach = (url: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    openExternalMutation.mutate(url)
  }

  const handleTogglePin = () => {
    togglePinMutation.mutate({ value: !isPinned })
  }

  return (
    <aside 
      className={`
        flex flex-col h-full bg-neutral-900/95 backdrop-blur-md border-r border-neutral-800
        transition-all duration-300 ease-in-out app-drag select-none
        ${showNames ? 'w-[200px]' : 'w-[72px]'}
        overflow-x-hidden
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-center py-6 border-b border-neutral-800/50 app-drag relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neural-500 to-neural-700 flex items-center justify-center shadow-lg shadow-neural-500/20 ring-1 ring-white/10 group cursor-default transition-transform hover:scale-105">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${showNames ? 'w-auto opacity-100 ml-3' : 'w-0 opacity-0'}`}>
           <span className="text-white font-semibold text-lg tracking-tight whitespace-nowrap">{t('app.name')}</span>
        </div>
      </div>

      {/* Provider buttons */}
      <nav className="flex-1 flex flex-col gap-2 py-4 px-2 overflow-y-auto overflow-x-hidden app-no-drag scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {providers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-2 opacity-50">
            <span className="text-sm text-neutral-400 mb-2 font-medium">{t('sidebar.noProviders')}</span>
            <button 
              onClick={() => openSettings('providers')}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              {t('common.add')}
            </button>
          </div>
        )}
        {providers.map((provider, index) => (
          <div key={provider.id} className="relative group w-full">
            {/* Provider button */}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => handleProviderClick(provider, e)}
              className={`
                relative flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer group/item
                ${showNames ? 'px-3 py-2.5 mx-1' : 'p-2.5 mx-1 justify-center'}
                ${currentProviderId === provider.id 
                  ? 'bg-neutral-800 text-white shadow-md ring-1 ring-white/10' 
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }
              `}
              style={{
                boxShadow: currentProviderId === provider.id 
                  ? `0 4px 12px -2px ${provider.color}20, inset 0 0 0 1px ${provider.color}20` 
                  : undefined
              }}
            >
              <div 
                className={`
                   relative z-10 w-6 h-6 flex-shrink-0 flex items-center justify-center rounded transition-transform duration-300
                   ${currentProviderId === provider.id ? 'scale-110' : 'group-hover/item:scale-110'}
                `}
              >
                <ProviderIconWithFavicon 
                  providerId={provider.id}
                  providerIcon={provider.icon}
                  providerName={provider.name}
                  color={provider.color}
                />
              </div>
              
              <span 
                className={`
                  text-sm font-medium truncate transition-all duration-300
                  ${showNames ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 hidden'}
                `}
              >
                {provider.name}
              </span>

              {/* Active Indicator (Left styling) */}
              {currentProviderId === provider.id && (
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full shadow-[0_0_10px_currentColor]"
                  style={{ backgroundColor: provider.color, color: provider.color }}
                />
              )}
            </div>
            
            {/* Pop-out Button - Only show if URL is valid */}
            {provider.url && (
              <button
                onClick={(e) => handleDetach(provider.url, e)}
                className={`
                  absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                  bg-neutral-900 shadow-xl border border-neutral-700
                  text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-neutral-600
                  transition-all duration-200 z-20
                  opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100
                  ${showNames ? 'right-2' : 'right-0 shadow-none border-none bg-transparent'}
                `}
                title={t('tray.openInWindow')}
                style={!showNames ? { right: '4px', background: 'rgba(0,0,0,0.5)' } : {}}
              >
                {UIIcons.popout}
              </button>
            )}
            
            {/* Tooltip (only if collapsed) */}
            {!showNames && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                {provider.name}
                <div className="mt-0.5 text-neutral-500 font-mono text-[10px] tracking-wide">
                  Ctrl+{index + 1}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-1 py-3 px-2 border-t border-neutral-800 app-no-drag">
        <button
          onClick={() => backMutation.mutate()}
          disabled={!navigationState.canGoBack}
          className={`p-2 rounded-lg transition-colors ${
            navigationState.canGoBack 
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' 
              : 'text-neutral-700 cursor-not-allowed'
          }`}
          title={t('sidebar.back')}
        >
          {UIIcons.back}
        </button>
        <button
          onClick={() => forwardMutation.mutate()}
          disabled={!navigationState.canGoForward}
          className={`p-2 rounded-lg transition-colors ${
            navigationState.canGoForward 
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' 
              : 'text-neutral-700 cursor-not-allowed'
          }`}
          title={t('sidebar.forward')}
        >
          {UIIcons.forward}
        </button>
        <button
          onClick={() => reloadMutation.mutate()}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={t('sidebar.reload')}
        >
          {UIIcons.reload}
        </button>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-center gap-1 py-3 px-2 border-t border-neutral-800 app-no-drag">
        {/* Settings button */}
        <button
          onClick={() => openSettings()}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={t('sidebar.settings')}
        >
          {UIIcons.settings}
        </button>
         {/* Pin button */}
         <button
          onClick={handleTogglePin}
          className={`p-2 rounded-lg transition-colors ${
            isPinned
              ? 'text-neural-500 bg-neural-500/10 hover:bg-neural-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title={isPinned ? t('sidebar.unpinned') : t('sidebar.pinned')}
        >
          {UIIcons.pin}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
