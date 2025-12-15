/**
 * Iconos SVG profesionales para los proveedores de IA
 * Cada icono es un path SVG optimizado que se puede usar en el renderer
 */

export interface IconDefinition {
  viewBox: string
  paths: string[]
  fillRule?: 'evenodd' | 'nonzero'
}

export const providerIcons: Record<string, IconDefinition> = {
  // OpenAI ChatGPT - Logo oficial simplificado
  chatgpt: {
    viewBox: '0 0 24 24',
    paths: [
      'M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z'
    ]
  },

  // Google Gemini - Estrellas brillantes
  gemini: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z',
      'M19 3L20.18 6.82L24 8L20.18 9.18L19 13L17.82 9.18L14 8L17.82 6.82L19 3Z'
    ]
  },

  // Anthropic Claude - Cerebro/mente estilizado
  claude: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
      'M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z',
      'M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
    ]
  },

  // DeepSeek - Lupa con profundidad
  deepseek: {
    viewBox: '0 0 24 24',
    paths: [
      'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      'M9.5 7C8.12 7 7 8.12 7 9.5S8.12 12 9.5 12 12 10.88 12 9.5 10.88 7 9.5 7z'
    ]
  },

  // Perplexity - Red de conocimiento
  perplexity: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 2L2 7l10 5 10-5-10-5z',
      'M2 17l10 5 10-5',
      'M2 12l10 5 10-5',
      'M12 22V12',
      'M22 7v10',
      'M2 7v10'
    ]
  },

  // Ollama - Llama estilizada
  ollama: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 2C9.5 2 7.5 4 7.5 6.5V8C6.12 8 5 9.12 5 10.5v7C5 19.43 6.57 21 8.5 21h7c1.93 0 3.5-1.57 3.5-3.5v-7C19 9.12 17.88 8 16.5 8V6.5C16.5 4 14.5 2 12 2zm0 2c1.38 0 2.5 1.12 2.5 2.5V8h-5V6.5C9.5 5.12 10.62 4 12 4zm-1.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm3 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z'
    ]
  },

  // Ícono genérico para proveedores personalizados
  custom: {
    viewBox: '0 0 24 24',
    paths: [
      'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z'
    ]
  },

  // Iconos de UI
  settings: {
    viewBox: '0 0 24 24',
    paths: [
      'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
    ]
  },

  reload: {
    viewBox: '0 0 24 24',
    paths: [
      'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'
    ]
  },

  back: {
    viewBox: '0 0 24 24',
    paths: [
      'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'
    ]
  },

  forward: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z'
    ]
  },

  close: {
    viewBox: '0 0 24 24',
    paths: [
      'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
    ]
  },

  minimize: {
    viewBox: '0 0 24 24',
    paths: [
      'M6 19h12v2H6z'
    ]
  },

  expand: {
    viewBox: '0 0 24 24',
    paths: [
      'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'
    ]
  },

  collapse: {
    viewBox: '0 0 24 24',
    paths: [
      'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'
    ]
  },

  popout: {
    viewBox: '0 0 24 24',
    paths: [
      'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z'
    ]
  },

  pin: {
    viewBox: '0 0 24 24',
    paths: [
      'M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z'
    ]
  },

  privacy: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z'
    ]
  },

  theme: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z'
    ]
  },

  keyboard: {
    viewBox: '0 0 24 24',
    paths: [
      'M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z'
    ]
  },

  drag: {
    viewBox: '0 0 24 24',
    paths: [
      'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
    ]
  },

  add: {
    viewBox: '0 0 24 24',
    paths: [
      'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
    ]
  },

  delete: {
    viewBox: '0 0 24 24',
    paths: [
      'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
    ]
  },

  check: {
    viewBox: '0 0 24 24',
    paths: [
      'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
    ]
  }
}

/**
 * Genera un SVG como string para usar en nativeImage
 */
export function generateSVGString(iconName: string, color: string = '#ffffff', size: number = 24): string {
  const icon = providerIcons[iconName] || providerIcons.custom
  
  const paths = icon.paths.map(d => 
    `<path d="${d}" fill="${color}" ${icon.fillRule ? `fill-rule="${icon.fillRule}"` : ''}/>`
  ).join('')
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${icon.viewBox}">${paths}</svg>`
}

/**
 * Genera un data URL para usar como imagen
 */
export function generateIconDataURL(iconName: string, color: string = '#ffffff', size: number = 24): string {
  const svg = generateSVGString(iconName, color, size)
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export default providerIcons
