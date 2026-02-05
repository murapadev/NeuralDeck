/**
 * Custom React hooks for NeuralDeck
 * Extracted from components for better reusability and testing
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '../store/appStore'
import type { UpdateInfo } from '../types/electron'

// Re-export useTheme
export { useTheme } from './useTheme'

/**
 * Hook for managing IPC event listeners from the Electron main process
 */
export function useIpcListeners() {
  const { setCurrentProvider, setNavigationState, openSettings, setConfig } = useAppStore()

  useEffect(() => {
    const cleanups: (() => void)[] = []

    if (window.neuralDeck) {
      // Listen for view changes from main process
      cleanups.push(
        window.neuralDeck.onViewChanged((providerId) => {
          setCurrentProvider(providerId)
        })
      )

      // Listen for navigation state changes
      cleanups.push(
        window.neuralDeck.onNavigationStateChanged((state) => {
          setNavigationState({
            canGoBack: state.canGoBack,
            canGoForward: state.canGoForward,
          })
        })
      )

      // Listen for settings open request
      cleanups.push(
        window.neuralDeck.onOpenSettings(() => {
          openSettings()
        })
      )

      // Listen for config updates from main process
      cleanups.push(
        window.neuralDeck.onConfigUpdated((config) => {
          setConfig(config)
        })
      )
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [setCurrentProvider, setNavigationState, openSettings, setConfig])
}

/**
 * Hook for detecting if current window is the settings window
 */
export function useSettingsWindow() {
  const isSettingsWindow = window.location.hash === '#settings'
  return isSettingsWindow
}

/**
 * Hook for hash-based routing
 */
export function useHashRoute() {
  const getHash = useCallback(() => window.location.hash, [])

  useEffect(() => {
    const handleHashChange = () => {
      // Force re-render on hash change
      window.dispatchEvent(new CustomEvent('hashupdate'))
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return getHash()
}

/**
 * Hook for managing auto-update UI logic
 * Displays toast notifications for update availability and download progress
 */
export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    if (!window.neuralDeck) return

    const cleanups: (() => void)[] = []

    // Update Available -> Ask to Download
    cleanups.push(
      window.neuralDeck.onUpdateAvailable((info) => {
        setUpdateAvailable(info)
        toast.info(`Update Available: v${info.version}`, {
          id: 'update-available',
          duration: Infinity,
          description: 'A new version of NeuralDeck is available.',
          action: {
            label: 'Download',
            onClick: () => window.neuralDeck.downloadUpdate(),
          },
          cancel: {
            label: 'Later',
            onClick: () => {},
          },
        })
      })
    )

    // Update Ready -> Ask to Install
    cleanups.push(
      window.neuralDeck.onUpdateDownloaded((info) => {
        setUpdateDownloaded(info)
        toast.dismiss('update-available')
        toast.success(`v${info.version} Ready to Install`, {
          id: 'update-ready',
          duration: Infinity,
          description: 'Restart the app to apply changes.',
          action: {
            label: 'Restart',
            onClick: () => window.neuralDeck.installUpdate(),
          },
        })
      })
    )

    // Update Error
    cleanups.push(
      window.neuralDeck.onUpdateError((err) => {
        console.error('Update failed:', err)
        toast.error('Update failed', {
          description: err.message || 'Please try again later.',
        })
      })
    )

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])

  return { updateAvailable, updateDownloaded }
}

/**
 * Hook for declarative keyboard shortcut handling
 * @param key - Key code (e.g., 'Escape', 'Enter')
 * @param callback - Function to call when shortcut is triggered
 * @param modifiers - Optional modifier keys
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const ctrlMatch = modifiers.ctrl ? event.ctrlKey : !event.ctrlKey
      const shiftMatch = modifiers.shift ? event.shiftKey : !event.shiftKey
      const altMatch = modifiers.alt ? event.altKey : !event.altKey
      const metaMatch = modifiers.meta ? event.metaKey : !event.metaKey

      if (event.key === key && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault()
        callback()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, callback, modifiers])
}

/**
 * Hook for debouncing a value
 * @param value - Value to debounce
 * @param delay - Debounce delay in ms
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
