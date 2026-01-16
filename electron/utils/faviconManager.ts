/**
 * Favicon management for AI providers
 * Downloads, caches and processes favicons automatically
 */

import { app, nativeImage, NativeImage } from 'electron'
import fs from 'fs'
import http from 'http'
import https from 'https'
import path from 'path'
import { ProviderConfig, FAVICON, PROVIDER_IDS } from '../../shared/types.js'
import { logger } from '../services/LoggerService.js'

// Cache directory for favicons
const CACHE_DIR = path.join(app.getPath('userData'), 'favicon-cache')

// Known favicon URLs (fallbacks if automatic detection fails)
const KNOWN_FAVICONS: Record<string, string> = {
  [PROVIDER_IDS.CHATGPT]: 'https://chatgpt.com/favicon.ico',
  [PROVIDER_IDS.CLAUDE]: 'https://claude.ai/favicon.ico',
  [PROVIDER_IDS.GEMINI]: 'https://gemini.google.com/favicon.ico',
  [PROVIDER_IDS.PERPLEXITY]: 'https://www.perplexity.ai/favicon.ico',
  [PROVIDER_IDS.DEEPSEEK]: 'https://chat.deepseek.com/favicon.ico',
  [PROVIDER_IDS.OLLAMA]: '', // Ollama is local, use fallback icon
}

// In-memory cache for processed images
const imageCache: Map<string, NativeImage> = new Map()

// Pending downloads to avoid duplicate requests
const pendingDownloads: Map<string, Promise<Buffer | null>> = new Map()

/**
 * Ensures the cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

/**
 * Gets the cache file path for a provider
 */
function getCachePath(providerId: string): string {
  return path.join(CACHE_DIR, `${providerId}.png`)
}

/**
 * Checks if there is a cached favicon for a provider
 */
function hasCachedFavicon(providerId: string): boolean {
  const cachePath = getCachePath(providerId)
  if (!fs.existsSync(cachePath)) return false

  // Check that the file is not too old (configured TTL)
  const stats = fs.statSync(cachePath)
  const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)
  return ageInDays < FAVICON.CACHE_TTL_DAYS
}

/**
 * Downloads an image from a URL
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
        timeout: FAVICON.DOWNLOAD_TIMEOUT,
      },
      (response) => {
        // Follow redirects
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
 * Attempts to fetch favicon from multiple sources
 */
async function fetchFavicon(provider: ProviderConfig): Promise<Buffer | null> {
  const urls: string[] = []

  // Use known URL if available
  if (provider.id in KNOWN_FAVICONS) {
    const knownUrl = KNOWN_FAVICONS[provider.id]
    // If URL is empty, it's a local provider without remote favicon
    // Return null to use fallback directly and avoid network errors
    if (knownUrl === '') {
      logger.info(
        `NeuralDeck Favicon: Skipping network fetch for ${provider.id} (local/fallback only)`
      )
      return null
    }
    urls.push(knownUrl)
  }

  // Build URLs based on provider domain
  try {
    const providerUrl = new URL(provider.url)
    const baseUrl = `${providerUrl.protocol}//${providerUrl.host}`

    // Common favicon locations
    urls.push(
      `${baseUrl}/favicon.ico`,
      `${baseUrl}/favicon.png`,
      `${baseUrl}/apple-touch-icon.png`,
      `${baseUrl}/apple-touch-icon-precomposed.png`,
      `https://www.google.com/s2/favicons?domain=${providerUrl.host}&sz=${FAVICON.GOOGLE_SIZE}`
    )
  } catch {
    logger.warn(`NeuralDeck Favicon: Invalid URL for ${provider.id}`)
  }

  // Try each URL
  for (const url of urls) {
    if (!url) continue

    try {
      logger.info(`NeuralDeck Favicon: Trying ${url} for ${provider.id}`)
      const buffer = await downloadImage(url)

      // Verify it's a valid image
      const image = nativeImage.createFromBuffer(buffer)
      if (!image.isEmpty()) {
        logger.info(`NeuralDeck Favicon: Successfully fetched for ${provider.id}`)
        return buffer
      }
    } catch (e) {
      logger.warn(`NeuralDeck Favicon: Failed ${url}: ${e}`)
    }
  }

  return null
}

/**
 * Processes a favicon to match app style
 * - Resizes to consistent size
 * - Adds circular mask
 */
function processIcon(buffer: Buffer, size: number = FAVICON.DEFAULT_SIZE): NativeImage {
  const image = nativeImage.createFromBuffer(buffer)

  // Resize
  const resized = image.resize({ width: size, height: size, quality: 'best' })

  return resized
}

/**
 * Generates a fallback icon with provider initials
 */
function generateFallbackIcon(provider: ProviderConfig, size: number = FAVICON.DEFAULT_SIZE): NativeImage {
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
 * Gets the icon for a provider (from cache, download, or fallback)
 */
export async function getProviderIcon(
  provider: ProviderConfig,
  size: number = FAVICON.DEFAULT_SIZE,
  forceRefresh: boolean = false
): Promise<NativeImage> {
  const cacheKey = `${provider.id}-${size}`

  // Check memory cache
  if (!forceRefresh && imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  ensureCacheDir()
  const cachePath = getCachePath(provider.id)

  // Check disk cache
  if (!forceRefresh && hasCachedFavicon(provider.id)) {
    try {
      const buffer = fs.readFileSync(cachePath)
      const icon = processIcon(buffer, size)
      imageCache.set(cacheKey, icon)
      return icon
    } catch {
      logger.warn(`NeuralDeck Favicon: Failed to read cache for ${provider.id}`)
    }
  }

  // Check if download is already in progress
  const downloadKey = provider.id
  if (pendingDownloads.has(downloadKey)) {
    const buffer = await pendingDownloads.get(downloadKey)
    if (buffer) {
      const icon = processIcon(buffer, size)
      imageCache.set(cacheKey, icon)
      return icon
    }
    // If pending download failed, use fallback
    const fallback = generateFallbackIcon(provider, size)
    imageCache.set(cacheKey, fallback)
    return fallback
  }

  // Create download promise
  const downloadPromise = fetchFavicon(provider)
  pendingDownloads.set(downloadKey, downloadPromise)

  // Download favicon
  try {
    const buffer = await downloadPromise
    pendingDownloads.delete(downloadKey)

    if (buffer) {
      // Save to cache
      fs.writeFileSync(cachePath, buffer)

      const icon = processIcon(buffer, size)
      imageCache.set(cacheKey, icon)
      return icon
    }
  } catch (e) {
    pendingDownloads.delete(downloadKey)
    logger.warn(`NeuralDeck Favicon: Failed to fetch for ${provider.id}:`, e)
  }

  // Use fallback icon
  logger.info(`NeuralDeck Favicon: Using fallback for ${provider.id}`)
  const fallback = generateFallbackIcon(provider, size)
  imageCache.set(cacheKey, fallback)
  return fallback
}

/**
 * Pre-loads all provider icons
 */
export async function preloadProviderIcons(providers: ProviderConfig[]): Promise<void> {
  logger.info(`NeuralDeck Favicon: Preloading icons for ${providers.length} providers`)

  const promises = providers.map((provider) =>
    getProviderIcon(provider, FAVICON.DEFAULT_SIZE).catch((e) => {
      logger.warn(`NeuralDeck Favicon: Failed to preload ${provider.id}:`, e)
    })
  )

  await Promise.all(promises)
  logger.info('NeuralDeck Favicon: Preloading complete')
}

/**
 * Clears the favicon cache
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
 * Gets the icon as Data URL for use in renderer
 */
export async function getProviderIconDataURL(
  provider: ProviderConfig,
  size: number = FAVICON.DEFAULT_SIZE
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
