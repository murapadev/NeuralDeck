/**
 * Configuration and types for NeuralDeck
 * User preference persistence system
 */

// Predefined window positions
export type WindowPosition =
  | 'near-tray' // Near the tray icon
  | 'top-left' // Top-left corner
  | 'top-right' // Top-right corner
  | 'bottom-left' // Bottom-left corner
  | 'bottom-right' // Bottom-right corner
  | 'center' // Center of the screen
  | 'remember' // Remember last position

// Application theme
export type AppTheme = 'dark' | 'light' | 'system'

// AI provider configuration
export interface ProviderConfig {
  id: string
  name: string
  url: string
  icon: string
  color: string
  enabled: boolean
  order: number
  isCustom?: boolean
}

// Keyboard shortcut configuration
export interface ShortcutConfig {
  toggleWindow: string
  // Shortcuts per provider (by index)
  providers: string[]
  // Other shortcuts
  reload: string
  goBack: string
  goForward: string
  openSettings: string
}

// Window configuration
export interface WindowConfig {
  width: number
  height: number
  position: WindowPosition
  lastX?: number
  lastY?: number
  alwaysOnTop: boolean
  hideOnBlur: boolean
  opacity: number
}

// Privacy configuration
export interface PrivacyConfig {
  clearOnClose: boolean
  blockTrackers: boolean
  // Providers in incognito mode
  incognitoProviders: string[]
}

// Appearance configuration
export interface AppearanceConfig {
  theme: AppTheme
  showProviderNames: boolean
  fontSize: 'small' | 'medium' | 'large'
  accentColor: string
}

// Complete application configuration
export interface AppConfig {
  version: string
  firstRun: boolean
  lastProvider: string | null

  window: WindowConfig
  shortcuts: ShortcutConfig
  providers: ProviderConfig[]
  privacy: PrivacyConfig
  appearance: AppearanceConfig
}

// Default providers
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

// Default configuration
export const DEFAULT_CONFIG: AppConfig = {
  version: '0.3.0',
  firstRun: true,
  lastProvider: 'chatgpt',

  window: {
    width: 420,
    height: 700,
    position: 'near-tray',
    alwaysOnTop: true,
    hideOnBlur: true,
    opacity: 1.0,
  },

  shortcuts: {
    toggleWindow: 'CommandOrControl+Space',
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
    showProviderNames: false,
    fontSize: 'medium',
    accentColor: '#6366f1',
  },
}
