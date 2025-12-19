/**
 * NeuralDeck i18n - Internationalization system
 */
import en from './locales/en'
import es from './locales/es'
import { useAppearanceConfig } from '../store/appStore'

export type Locale = 'en' | 'es'
export type TranslationKey = keyof typeof en

const translations = {
  en,
  es,
}

/**
 * Hook for translations that updates when language changes
 */
export function useTranslation() {
  const appearance = useAppearanceConfig()
  const locale = appearance?.language || 'en'
  
  const t = (key: TranslationKey): string => {
    const dict = translations[locale]
    return dict[key] || key
  }

  return { t, locale }
}

/**
 * Static translation helper (for non-React contexts or initial state)
 * Note: Won't update if language changes!
 */
export function t(key: TranslationKey, locale: Locale = 'en'): string {
  const dict = translations[locale]
  return dict[key] || key
}

export default { useTranslation, t }
