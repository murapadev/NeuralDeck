/**
 * Application constants
 * 
 * Re-exports from shared/types.ts to maintain backwards compatibility.
 * Use imports from 'shared/types' directly for new code.
 */

// Re-export all constants from shared types
export {
  PROVIDER_IDS,
  STORAGE_KEYS,
  ANIMATION,
  APP_INFO,
  DEFAULT_WINDOW as WINDOW,
  TIMING,
  SIDEBAR,
  FAVICON,
  OLLAMA,
} from '../../shared/types'

// Legacy keyboard shortcuts defaults (for backwards compatibility)
export const DEFAULT_SHORTCUTS = {
  TOGGLE_WINDOW: 'CommandOrControl+Space',
  RELOAD: 'CommandOrControl+R',
  GO_BACK: 'CommandOrControl+Left',
  GO_FORWARD: 'CommandOrControl+Right',
  OPEN_SETTINGS: 'CommandOrControl+,',
} as const
