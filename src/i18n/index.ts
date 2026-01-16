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
  
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[locale]
    let text: string = dict[key] || key
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`{${param}}`, 'g'), String(value))
      })
    }
    
    return text
  }

  return { t, locale }
}

/**
 * Static translation helper (for non-React contexts or initial state)
 * Note: Won't update if language changes!
 */
export function t(key: TranslationKey, locale: Locale = 'en', params?: Record<string, string | number>): string {
  const dict = translations[locale]
  let text: string = dict[key] || key

  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), String(value))
    })
  }
  
  return text
}

export default { useTranslation, t }
