/**
 * Type declarations for NeuralDeck Electron APIs
 *
 * This file defines the APIs exposed to the renderer process
 * via contextBridge in preload.ts
 */

// Re-export shared types for convenience
export {
  type WindowPosition,
  type WindowConfig,
  type AppTheme,
  type AppLanguage,
  type FontSize,
  type AppearanceConfig,
  type ProviderConfig,
  type ShortcutConfig,
  type PrivacyConfig,
  type AppConfig,
  type NavigationState,
  type UpdateInfo,
  SIDEBAR,
  DEFAULT_WINDOW,
  TIMING,
} from '../../shared/types'

import type { NavigationState, UpdateInfo } from '../../shared/types'

// ============================================================================
// NeuralDeck API (exposed via preload.ts)
// ============================================================================

/**
 * API exposed by preload.ts via contextBridge.
 * Only includes methods that are actually implemented.
 */
export interface NeuralDeckAPI {
  // Navigation & Views
  switchView: (providerId: string) => void
  openExternal: (url: string) => void
  reload: () => void
  goBack: () => void
  goForward: () => void

  // Window & Layout
  openSettingsWindow: () => void
  closeSettingsWindow: () => void

  // Auto-Update
  downloadUpdate: () => void
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => () => void
  onUpdateError: (callback: (error: Error) => void) => () => void

  // System
  getPlatform: () => Promise<NodeJS.Platform>

  // Events
  onViewChanged: (callback: (providerId: string) => void) => () => void
  onNavigationStateChanged: (callback: (state: NavigationState) => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
}

// ============================================================================
// electronTRPC API (for tRPC communication)
// ============================================================================

/**
 * tRPC IPC bridge exposed by preload.ts
 */
export interface ElectronTRPC {
  sendMessage: (operation: { id: number; method: string; params: { path: string; input?: unknown } }) => void
  onMessage: (callback: (response: { id: number; result?: unknown; error?: unknown }) => void) => () => void
}

// ============================================================================
// Global Window Extension
// ============================================================================

declare global {
  interface Window {
    neuralDeck: NeuralDeckAPI
    electronTRPC: ElectronTRPC
  }
}

export {}
