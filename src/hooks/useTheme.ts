import { useEffect } from 'react'
import { useAppearanceConfig } from '../store/appStore'

/**
 * Hook that applies the theme to the document based on config
 * Handles dark/light/system theme modes
 */
export function useTheme() {
  const appearance = useAppearanceConfig()
  const theme = appearance?.theme || 'dark'
  const accentColor = appearance?.accentColor || '#6366f1'
  const fontSize = appearance?.fontSize || 'medium'

  const applyAccentColor = (hex: string) => {
    const rgb = hexToRgb(hex)
    if (!rgb) return
    const hsl = rgbToHsl(rgb)
    const hslValue = `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`

    const foreground = getReadableForeground(rgb)

    const root = document.documentElement
    root.style.setProperty('--primary', hslValue)
    root.style.setProperty('--accent', hslValue)
    root.style.setProperty('--ring', hslValue)
    root.style.setProperty('--primary-foreground', foreground)
    root.style.setProperty('--accent-foreground', foreground)
  }

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark')
        root.classList.remove('light')
      } else {
        root.classList.remove('dark')
        root.classList.add('light')
      }
    }

    if (theme === 'system') {
      // Use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)

      // Listen for system theme changes
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  useEffect(() => {
    applyAccentColor(accentColor)
  }, [accentColor])

  useEffect(() => {
    const root = document.documentElement
    const sizeMap: Record<string, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }
    root.style.fontSize = sizeMap[fontSize] || sizeMap.medium
  }, [fontSize])

  return theme
}

type RGB = { r: number; g: number; b: number }
type HSL = { h: number; s: number; l: number }

const hexToRgb = (hex: string): RGB | null => {
  const normalized = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) return null
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return { r, g, b }
}

const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2
    } else {
      h = (rNorm - gNorm) / delta + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h, s: s * 100, l: l * 100 }
}

const getReadableForeground = ({ r, g, b }: RGB): string => {
  const linear = (value: number) => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const luminance =
    0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  return luminance > 0.55 ? '0 0% 9%' : '0 0% 98%'
}
