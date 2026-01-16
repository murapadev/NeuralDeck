import { useCallback } from 'react'
import { ProviderConfig } from '../../shared/types'
import { useAppStore, useWindowConfig } from '../store/appStore'
import { trpc } from '../utils/trpc'

export const useSidebar = () => {
  const { config, setConfig, currentProviderId, setCurrentProvider, openSettings, isSettingsOpen } =
    useAppStore()

  const windowConfig = useWindowConfig()

  const switchViewMutation = trpc.switchView.useMutation()
  const openExternalMutation = trpc.openExternal.useMutation()
  const updateWindowMutation = trpc.updateWindow.useMutation({
    onSuccess: (data) => setConfig(data),
  })
  const updateProvidersMutation = trpc.updateProvidersList.useMutation({
    onSuccess: (data) => setConfig(data),
  })

  const enabledProviders = config?.providers?.filter((p) => p.enabled) || []
  const isPinned = windowConfig?.alwaysOnTop || false

  const handleProviderClick = (provider: ProviderConfig, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentProvider(provider.id)
    switchViewMutation.mutate(provider.id)
  }

  const handleDetach = (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openExternalMutation.mutate(url)
  }

  const handleTogglePin = () => {
    updateWindowMutation.mutate({ alwaysOnTop: !isPinned })
  }

  const handleReorder = useCallback(
    (newOrder: ProviderConfig[]) => {
      if (!config) return

      // We get a list of ENABLED providers reordered.
      // We need to merge this with DISABLED providers to save the full list.
      const disabledProviders = config.providers.filter((p) => !p.enabled)
      const fullList = [...newOrder, ...disabledProviders] // Put disabled at the end? Or keep their relative order?
      // If we only reorder enabled ones, simply appending disabled ones at the end is fine for now.
      // Or we could try to preserve indices, but that's complex.

      // Optimistically update local state
      setConfig({ ...config, providers: fullList })

      // Sync with backend
      updateProvidersMutation.mutate(fullList)
    },
    [config, setConfig, updateProvidersMutation]
  )

  return {
    currentProviderId,
    enabledProviders,
    isLoading: !config,
    isPinned,
    handleProviderClick,
    handleDetach,
    handleTogglePin,
    openSettings: () => !isSettingsOpen && openSettings(),
    handleReorder,
  }
}
