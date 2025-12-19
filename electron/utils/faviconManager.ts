/**
 * Gestión de favicons para proveedores de IA
 * Descarga, cachea y procesa favicons automáticamente
 */

import { app, nativeImage, NativeImage } from 'electron'
import fs from 'fs'
import http from 'http'
import https from 'https'
import path from 'path'
import { ProviderConfig } from '../config/types.js'

// Directorio de caché para favicons
const CACHE_DIR = path.join(app.getPath('userData'), 'favicon-cache')

// URLs de favicons conocidos (fallbacks si la detección automática falla)
const KNOWN_FAVICONS: Record<string, string> = {
  chatgpt: 'https://chatgpt.com/favicon.ico',
  claude: 'https://claude.ai/favicon.ico',
  gemini: 'https://gemini.google.com/favicon.ico',
  perplexity: 'https://www.perplexity.ai/favicon.ico',
  deepseek: 'https://chat.deepseek.com/favicon.ico',
  ollama: '', // Ollama es local, usamos icono fallback
}

// Cache en memoria para imágenes ya procesadas
const imageCache: Map<string, NativeImage> = new Map()

// Promesas en progreso para evitar descargas duplicadas
const pendingDownloads: Map<string, Promise<Buffer | null>> = new Map()

/**
 * Asegura que el directorio de caché existe
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

/**
 * Obtiene la ruta del archivo de caché para un proveedor
 */
function getCachePath(providerId: string): string {
  return path.join(CACHE_DIR, `${providerId}.png`)
}

/**
 * Verifica si hay un favicon cacheado para un proveedor
 */
function hasCachedFavicon(providerId: string): boolean {
  const cachePath = getCachePath(providerId)
  if (!fs.existsSync(cachePath)) return false

  // Verificar que el archivo no sea muy antiguo (7 días)
  const stats = fs.statSync(cachePath)
  const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)
  return ageInDays < 7
}

/**
 * Descarga una imagen desde una URL
 */
function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const request = protocol.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      },
      (response) => {
        // Seguir redirecciones
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          downloadImage(response.headers.location).then(resolve).catch(reject)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => resolve(Buffer.concat(chunks)))
        response.on('error', reject)
      }
    )

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

/**
 * Intenta obtener el favicon desde diferentes fuentes
 */
async function fetchFavicon(provider: ProviderConfig): Promise<Buffer | null> {
  const urls: string[] = []

  // Usar URL conocida si existe
  if (provider.id in KNOWN_FAVICONS) {
    const knownUrl = KNOWN_FAVICONS[provider.id]
    // Si la URL es vacía, significa que es un proveedor local o sin favicon remoto conocido
    // Devolvemos null para usar directamente el fallback y evitar errores de red
    if (knownUrl === '') {
      console.log(
        `NeuralDeck Favicon: Skipping network fetch for ${provider.id} (local/fallback only)`
      )
      return null
    }
    urls.push(knownUrl)
  }

  // Construir URLs basadas en el dominio del proveedor
  try {
    const providerUrl = new URL(provider.url)
    const baseUrl = `${providerUrl.protocol}//${providerUrl.host}`

    // Diferentes ubicaciones comunes de favicons
    urls.push(
      `${baseUrl}/favicon.ico`,
      `${baseUrl}/favicon.png`,
      `${baseUrl}/apple-touch-icon.png`,
      `${baseUrl}/apple-touch-icon-precomposed.png`,
      `https://www.google.com/s2/favicons?domain=${providerUrl.host}&sz=128`
    )
  } catch (e) {
    console.warn(`NeuralDeck Favicon: Invalid URL for ${provider.id}`)
  }

  // Intentar cada URL
  for (const url of urls) {
    if (!url) continue

    try {
      console.log(`NeuralDeck Favicon: Trying ${url} for ${provider.id}`)
      const buffer = await downloadImage(url)

      // Verificar que es una imagen válida
      const image = nativeImage.createFromBuffer(buffer)
      if (!image.isEmpty()) {
        console.log(`NeuralDeck Favicon: Successfully fetched for ${provider.id}`)
        return buffer
      }
    } catch (e) {
      console.log(`NeuralDeck Favicon: Failed ${url}: ${e}`)
    }
  }

  return null
}

/**
 * Procesa un favicon para que coincida con el estilo de la app
 * - Redimensiona a tamaño consistente
 * - Añade máscara circular
 */
function processIcon(buffer: Buffer, size: number = 32): NativeImage {
  const image = nativeImage.createFromBuffer(buffer)

  // Redimensionar
  const resized = image.resize({ width: size, height: size, quality: 'best' })

  return resized
}

/**
 * Crea un icono circular con el favicon
 */
function createCircularIcon(
  buffer: Buffer,
  size: number = 32,
  backgroundColor?: string
): NativeImage {
  const image = nativeImage.createFromBuffer(buffer)

  // Verificar si la imagen es válida
  if (image.isEmpty()) {
    throw new Error('Invalid image buffer')
  }

  // Redimensionar manteniendo aspecto
  const resized = image.resize({ width: size, height: size, quality: 'best' })

  return resized
}

/**
 * Genera un icono fallback con las iniciales del proveedor
 */
function generateFallbackIcon(provider: ProviderConfig, size: number = 32): NativeImage {
  const initial = provider.name.charAt(0).toUpperCase()
  const color = provider.color || '#6366f1'

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${size / 4}" fill="${color}"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="${size * 0.5}" font-weight="600" fill="white">
        ${initial}
      </text>
    </svg>
  `

  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  )
}

/**
 * Obtiene el icono para un proveedor (de caché, descarga, o fallback)
 */
export async function getProviderIcon(
  provider: ProviderConfig,
  size: number = 32,
  forceRefresh: boolean = false
): Promise<NativeImage> {
  const cacheKey = `${provider.id}-${size}`

  // Verificar caché en memoria
  if (!forceRefresh && imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  ensureCacheDir()
  const cachePath = getCachePath(provider.id)

  // Verificar caché en disco
  if (!forceRefresh && hasCachedFavicon(provider.id)) {
    try {
      const buffer = fs.readFileSync(cachePath)
      const icon = processIcon(buffer, size)
      imageCache.set(cacheKey, icon)
      return icon
    } catch (e) {
      console.warn(`NeuralDeck Favicon: Failed to read cache for ${provider.id}`)
    }
  }

  // Verificar si ya hay una descarga en progreso
  const downloadKey = provider.id
  if (pendingDownloads.has(downloadKey)) {
    const buffer = await pendingDownloads.get(downloadKey)
    if (buffer) {
      const icon = processIcon(buffer, size)
      imageCache.set(cacheKey, icon)
      return icon
    }
    // Si la descarga pendiente falló, usar fallback
    const fallback = generateFallbackIcon(provider, size)
    imageCache.set(cacheKey, fallback)
    return fallback
  }

  // Crear promesa de descarga
  const downloadPromise = fetchFavicon(provider)
  pendingDownloads.set(downloadKey, downloadPromise)

  // Descargar favicon
  try {
    const buffer = await downloadPromise
    pendingDownloads.delete(downloadKey)

    if (buffer) {
      // Guardar en caché
      fs.writeFileSync(cachePath, buffer)

      const icon = processIcon(buffer, size)
      imageCache.set(cacheKey, icon)
      return icon
    }
  } catch (e) {
    pendingDownloads.delete(downloadKey)
    console.warn(`NeuralDeck Favicon: Failed to fetch for ${provider.id}:`, e)
  }

  // Usar icono fallback
  console.log(`NeuralDeck Favicon: Using fallback for ${provider.id}`)
  const fallback = generateFallbackIcon(provider, size)
  imageCache.set(cacheKey, fallback)
  return fallback
}

/**
 * Pre-carga todos los iconos de proveedores
 */
export async function preloadProviderIcons(providers: ProviderConfig[]): Promise<void> {
  console.log('NeuralDeck Favicon: Preloading icons for', providers.length, 'providers')

  const promises = providers.map((provider) =>
    getProviderIcon(provider, 32).catch((e) => {
      console.warn(`NeuralDeck Favicon: Failed to preload ${provider.id}:`, e)
    })
  )

  await Promise.all(promises)
  console.log('NeuralDeck Favicon: Preloading complete')
}

/**
 * Limpia la caché de favicons
 */
export function clearFaviconCache(): void {
  imageCache.clear()

  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR)
    for (const file of files) {
      fs.unlinkSync(path.join(CACHE_DIR, file))
    }
  }
}

/**
 * Obtiene el icono como Data URL para usar en el renderer
 */
export async function getProviderIconDataURL(
  provider: ProviderConfig,
  size: number = 32
): Promise<string> {
  const icon = await getProviderIcon(provider, size)
  return icon.toDataURL()
}

export default {
  getProviderIcon,
  getProviderIconDataURL,
  preloadProviderIcons,
  clearFaviconCache,
}
