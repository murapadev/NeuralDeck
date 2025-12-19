/**
 * NeuralDeck i18n - Internationalization system
 * Simple translation system with English as base language
 */

export type Locale = 'en' | 'es'

const translations = {
  en: {
    // App
    'app.name': 'NeuralDeck',
    'app.tagline': 'Your AI Command Center',

    // Sidebar
    'sidebar.noProviders': 'No active providers',
    'sidebar.configure': 'Configure',
    'sidebar.detachNotImplemented': 'Detach not implemented yet',
    'sidebar.shortcut': 'Shortcut',
    'sidebar.reload': 'Reload',
    'sidebar.back': 'Back',
    'sidebar.forward': 'Forward',
    'sidebar.settings': 'Settings',
    'sidebar.pinned': 'Pinned',
    'sidebar.unpinned': 'Unpinned',

    // Settings Tabs
    'settings.general': 'General',
    'settings.appearance': 'Appearance',
    'settings.shortcuts': 'Shortcuts',
    'settings.providers': 'Providers',
    'settings.privacy': 'Privacy',

    // Settings - General
    'settings.general.window': 'Window',
    'settings.general.position': 'Position',
    'settings.general.alwaysOnTop': 'Always on top',
    'settings.general.hideOnBlur': 'Hide when losing focus',
    'settings.general.opacity': 'Opacity',

    // Settings - Appearance
    'settings.appearance.theme': 'Theme',
    'settings.appearance.dark': 'Dark',
    'settings.appearance.light': 'Light',
    'settings.appearance.system': 'System',
    'settings.appearance.showProviderNames': 'Show provider names',
    'settings.appearance.fontSize': 'Font size',
    'settings.appearance.small': 'Small',
    'settings.appearance.medium': 'Medium',
    'settings.appearance.large': 'Large',
    'settings.appearance.accentColor': 'Accent color',

    // Settings - Shortcuts
    'settings.shortcuts.toggleWindow': 'Toggle window',
    'settings.shortcuts.reload': 'Reload',
    'settings.shortcuts.back': 'Go back',
    'settings.shortcuts.forward': 'Go forward',
    'settings.shortcuts.openSettings': 'Open settings',
    'settings.shortcuts.clickToRecord': 'Click to record shortcut',

    // Settings - Providers
    'settings.providers.enabled': 'Enabled',
    'settings.providers.disabled': 'Disabled',
    'settings.providers.addCustom': 'Add custom provider',
    'settings.providers.name': 'Name',
    'settings.providers.url': 'URL',
    'settings.providers.color': 'Color',
    'settings.providers.dragToReorder': 'Drag to reorder',
    'settings.providers.remove': 'Remove',
    'settings.providers.custom': 'Custom',

    // Settings - Privacy
    'settings.privacy.clearOnClose': 'Clear data on close',
    'settings.privacy.blockTrackers': 'Block trackers',
    'settings.privacy.incognitoMode': 'Incognito mode for',
    'settings.privacy.clearAllData': 'Clear all data',
    'settings.privacy.clearDataConfirm': 'Are you sure? This will clear all browsing data.',

    // Settings - Position Options
    'position.nearTray': 'Near tray',
    'position.topLeft': 'Top left',
    'position.topRight': 'Top right',
    'position.bottomLeft': 'Bottom left',
    'position.bottomRight': 'Bottom right',
    'position.center': 'Center',
    'position.remember': 'Remember position',

    // Tray Menu
    'tray.showHide': 'Show/Hide',
    'tray.openHere': 'Open here',
    'tray.openInWindow': 'Open in separate window',
    'tray.settings': 'Settings',
    'tray.quit': 'Quit',

    // Chat Interface
    'chat.startConversation': 'Start a conversation',
    'chat.using': 'Using',
    'chat.typeMessage': 'Type a message...',
    'chat.notConnected': 'Ollama not connected',
    'chat.connecting': 'Connecting...',
    'chat.connected': 'Connected',
    'chat.disconnected': 'Disconnected',
    'chat.retry': 'Retry',
    'chat.checkConnection': 'Check Connection',
    'chat.clearChat': 'Clear chat',
    'chat.ollamaNotRunning': 'Ollama is not running',
    'chat.startOllama': 'Start Ollama to begin chatting',
    'chat.connectionError':
      'Error: Could not connect to Ollama. Make sure it is running on port 11434.',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
  },
} as const

type TranslationKey = keyof typeof translations.en

// Current locale
let currentLocale: Locale = 'en'

/**
 * Get translation for a key
 */
export function t(key: TranslationKey): string {
  // For now, we only support English
  return translations.en[key] || key
}

/**
 * Set current locale
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
  return currentLocale
}

export default { t, setLocale, getLocale }
