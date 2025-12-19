import { useAppStore, useAppearanceConfig, useWindowConfig } from '../store/appStore'
import { trpc } from '../utils/trpc'
import { ProviderIcons, UIIcons } from './icons'

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
  // Try to get icon by icon name or provider id
  const IconComponent = ProviderIcons[providerIcon] || ProviderIcons[providerId]
  if (IconComponent) {
    return IconComponent(color)
  }

  // Last fallback: name initial
  return (
    <div 
      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {providerName[0]}
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

  const handleProviderClick = (providerId: string, e: React.MouseEvent) => {
    // Ctrl+click (or Cmd+click on macOS) opens in separate window
    if (e.ctrlKey || e.metaKey) {
       // TODO: Implement detach
       console.log('Detach not implemented yet')
    } else {
      switchViewMutation.mutate(providerId)
    }
  }

  const handleDetach = (providerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    // TODO: Implement detach
    console.log('Detach requested for', providerId)
  }

  const handleTogglePin = () => {
    togglePinMutation.mutate(!isPinned)
  }

  return (
    <aside 
      className={`
        flex flex-col h-full bg-neutral-900 border-r border-neutral-800
        transition-all duration-300 ease-out app-drag
        ${showNames ? 'w-[140px]' : 'w-[60px]'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-neutral-800 app-drag">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neural-500 to-neural-700 flex items-center justify-center shadow-lg shadow-neural-500/20">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        {showNames && (
          <span className="ml-2 text-white font-semibold text-sm">NeuralDeck</span>
        )}
      </div>

      {/* Provider buttons */}
      <nav className="flex-1 flex flex-col gap-1 py-4 px-2 overflow-y-auto app-no-drag">
        {providers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <span className="text-xs text-neutral-500 mb-2">No active providers</span>
            <button 
              onClick={() => openSettings('providers')}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              Configure
            </button>
          </div>
        )}
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
            
            {/* Pop-out button */}
            <button
              onClick={(e) => handleDetach(provider.id, e)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all z-10"
              title="Open in separate window (Ctrl+click)"
            >
              {UIIcons.popout}
            </button>
            
            {/* Tooltip (only if not showing names) */}
            {!showNames && (
              <span className="tooltip">
                {provider.name}
                <span className="text-xs opacity-60 ml-1">Ctrl+{index + 1}</span>
              </span>
            )}
            
            {/* Active indicator */}
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
      <div className="flex items-center justify-center gap-1 py-2 px-2 border-t border-neutral-800 app-no-drag">
        <button
          onClick={() => backMutation.mutate()}
          disabled={!navigationState.canGoBack}
          className={`p-2 rounded-lg transition-colors ${
            navigationState.canGoBack 
              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' 
              : 'text-neutral-700 cursor-not-allowed'
          }`}
          title="Back"
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
          title="Forward"
        >
          {UIIcons.forward}
        </button>
        <button
          onClick={() => reloadMutation.mutate()}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Reload"
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
          title="Settings"
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
          title={isPinned ? 'Unpin window' : 'Always on top'}
        >
          {UIIcons.pin}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
