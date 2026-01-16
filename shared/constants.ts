/**
 * Shared Constants for NeuralDeck
 */

import { AppConfig, ProviderConfig } from './schemas'

// ============================================================================
// Default Providers (must be defined before DEFAULT_CONFIG)
// ============================================================================

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    icon: 'chatgpt',
    color: '#10a37f',
    enabled: true,
    order: 0,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    icon: 'gemini',
    color: '#8e44ef',
    enabled: true,
    order: 1,
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    icon: 'claude',
    color: '#d97706',
    enabled: true,
    order: 2,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: 'deepseek',
    color: '#3b82f6',
    enabled: true,
    order: 3,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai',
    icon: 'perplexity',
    color: '#22c55e',
    enabled: true,
    order: 4,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    url: 'http://localhost:11434',
    icon: 'ollama',
    color: '#ffffff',
    enabled: true,
    order: 5,
    isCustom: false,
  },
]

// ============================================================================
// Default Config
// ============================================================================

export const DEFAULT_CONFIG: AppConfig = {
  version: '0.3.0', // This will differ in v1.0.0
  debug: false,
  firstRun: true,
  lastProvider: null,

  window: {
    width: 420, // DEFAULT_WINDOW.WIDTH
    height: 700, // DEFAULT_WINDOW.HEIGHT
    position: 'near-tray',
    alwaysOnTop: true,
    hideOnBlur: true,
    opacity: 1.0,
  },

  shortcuts: {
    toggleWindow: 'CommandOrControl+Shift+Space',
    providers: [
      'CommandOrControl+Shift+1',
      'CommandOrControl+Shift+2',
      'CommandOrControl+Shift+3',
      'CommandOrControl+Shift+4',
      'CommandOrControl+Shift+5',
    ],
    reload: 'CommandOrControl+R',
    goBack: 'CommandOrControl+Left',
    goForward: 'CommandOrControl+Right',
    openSettings: 'CommandOrControl+,',
  },

  providers: DEFAULT_PROVIDERS,

  privacy: {
    clearOnClose: false,
    blockTrackers: false,
    incognitoProviders: [],
  },

  appearance: {
    theme: 'dark',
    language: 'en',
    showProviderNames: false,
    fontSize: 'medium',
    accentColor: '#6366f1',
  },
}

/** Sidebar dimensions - must match Sidebar.tsx CSS */
export const SIDEBAR = {
  COLLAPSED_WIDTH: 72, // matches w-[72px] in Sidebar.tsx
  EXPANDED_WIDTH: 140,
} as const

/** Default window dimensions */
export const DEFAULT_WINDOW = {
  WIDTH: 420,
  HEIGHT: 700,
} as const

/** Timing constants (in milliseconds) */
export const TIMING = {
  ELECTRON_POLL_INTERVAL: 50,
  ELECTRON_TIMEOUT: 5000,
  UPDATE_CHECK_DELAY: 3000,
  UPDATE_CHECK_INTERVAL: 4 * 60 * 60 * 1000, // 4 hours
  OLLAMA_POLL_INTERVAL: 30000, // 30 seconds
} as const

/** Provider IDs - single source of truth */
export const PROVIDER_IDS = {
  OLLAMA: 'ollama',
  CHATGPT: 'chatgpt',
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  DEEPSEEK: 'deepseek',
  PERPLEXITY: 'perplexity',
} as const

/** Storage keys for localStorage */
export const STORAGE_KEYS = {
  CONFIG: 'neuraldeck-config',
  THEME: 'neuraldeck-theme',
  LAST_PROVIDER: 'lastProvider',
  OLLAMA_CHAT: 'neuraldeck-ollama-chat',
  OLLAMA_MODEL: 'neuraldeck-ollama-model',
} as const

/** Favicon manager configuration */
export const FAVICON = {
  CACHE_TTL_DAYS: 7,
  DOWNLOAD_TIMEOUT: 10000,
  GOOGLE_SIZE: 128,
  DEFAULT_SIZE: 32,
} as const

/** Ollama configuration */
export const OLLAMA = {
  DEFAULT_URL: 'http://localhost:11434',
  HEALTH_TIMEOUT: 3000,
} as const

/** Animation durations (ms) */
export const ANIMATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
} as const

/** App information */
export const APP_INFO = {
  NAME: 'NeuralDeck',
  APP_ID: 'com.neuraldeck.app',
  GITHUB_ISSUES_URL: 'https://github.com/murapadev/NeuralDeck/issues/new',
} as const

/** Color constants */
export const COLORS = {
  DEFAULT_ACCENT: '#6366f1',
  ACCENT_OPTIONS: [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#f43f5e',
    '#f97316',
    '#22c55e',
    '#14b8a6',
    '#3b82f6',
  ],
} as const

/** UI limits */
export const UI_LIMITS = {
  MAX_PROVIDER_SHORTCUTS: 5,
} as const

// ============================================================================
// IPC Constants
// ============================================================================

export const IPC_CHANNELS = {
  // Settings
  OPEN_SETTINGS_WINDOW: 'open-settings-window',
  CLOSE_SETTINGS_WINDOW: 'close-settings-window',

  // View management
  SWITCH_VIEW: 'switch-view',
  OPEN_EXTERNAL: 'open-external',

  // Navigation
  RELOAD: 'reload',
  GO_BACK: 'go-back',
  GO_FORWARD: 'go-forward',

  // Auto-update
  DOWNLOAD_UPDATE: 'download-update',
  INSTALL_UPDATE: 'install-update',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_NOT_AVAILABLE: 'update-not-available',
  UPDATE_DOWNLOADED: 'update-downloaded',
  DOWNLOAD_PROGRESS: 'download-progress',
  UPDATE_ERROR: 'update-error',

  // System
  GET_PLATFORM: 'get-platform',
  RENDERER_LOG: 'renderer-log',

  // Events
  VIEW_CHANGED: 'view-changed',
  NAVIGATION_STATE_CHANGED: 'navigation-state-changed',
  OPEN_SETTINGS: 'open-settings',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
