/**
 * NeuralDeck i18n for Electron Main Process
 * Uses same keys as renderer i18n
 */

const translations = {
  'tray.showHide': 'Show/Hide',
  'tray.openHere': 'Open here',
  'tray.openInWindow': 'Open in separate window',
  'tray.settings': 'Settings',
  'tray.quit': 'Quit',
} as const

type TranslationKey = keyof typeof translations

export function t(key: TranslationKey): string {
  return translations[key] || key
}

export default { t }
