/**
 * Tests for faviconManager utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock electron
vi.mock('electron', () => {
  const mockNativeImage = {
    isEmpty: vi.fn().mockReturnValue(false),
    resize: vi.fn().mockReturnThis(),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
  }
  
  return {
    app: {
      getPath: vi.fn().mockReturnValue('/mock/userData'),
    },
    nativeImage: {
      createFromBuffer: vi.fn().mockReturnValue(mockNativeImage),
      createFromDataURL: vi.fn().mockReturnValue(mockNativeImage),
    },
  }
})

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('test')),
    writeFileSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({ mtimeMs: Date.now() }),
    readdirSync: vi.fn().mockReturnValue([]),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from('test')),
  writeFileSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ mtimeMs: Date.now() }),
  readdirSync: vi.fn().mockReturnValue([]),
  unlinkSync: vi.fn(),
}))

// Mock http/https
vi.mock('http', () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock('https', () => ({
  default: {
    get: vi.fn(),
  },
}))

// Mock logger
vi.mock('../../electron/services/LoggerService.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock config types
vi.mock('../../electron/config/types.js', () => ({
  FAVICON: {
    CACHE_TTL_DAYS: 7,
    DOWNLOAD_TIMEOUT: 10000,
    GOOGLE_SIZE: 128,
    DEFAULT_SIZE: 32,
  },
  PROVIDER_IDS: {
    OLLAMA: 'ollama',
    CHATGPT: 'chatgpt',
    GEMINI: 'gemini',
    CLAUDE: 'claude',
    DEEPSEEK: 'deepseek',
    PERPLEXITY: 'perplexity',
  },
}))

describe('faviconManager', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProviderIcon', () => {
    it('should return a fallback icon for ollama provider', async () => {
      const { getProviderIcon } = await import('../../electron/utils/faviconManager')
      
      const provider = {
        id: 'ollama',
        name: 'Ollama',
        url: 'http://localhost:11434',
        icon: 'ollama',
        color: '#ffffff',
        enabled: true,
        order: 0,
      }
      
      const icon = await getProviderIcon(provider)
      expect(icon).toBeDefined()
    })

    it('should handle custom size parameter', async () => {
      const { getProviderIcon } = await import('../../electron/utils/faviconManager')
      
      const provider = {
        id: 'chatgpt',
        name: 'ChatGPT',
        url: 'https://chat.openai.com',
        icon: 'chatgpt',
        color: '#10a37f',
        enabled: true,
        order: 0,
      }
      
      const icon = await getProviderIcon(provider, 64)
      expect(icon).toBeDefined()
    })
  })

  describe('getProviderIconDataURL', () => {
    it('should return a data URL string', async () => {
      const { getProviderIconDataURL } = await import('../../electron/utils/faviconManager')
      
      const provider = {
        id: 'ollama',
        name: 'Ollama',
        url: 'http://localhost:11434',
        icon: 'ollama',
        color: '#ffffff',
        enabled: true,
        order: 0,
      }
      
      const dataUrl = await getProviderIconDataURL(provider)
      expect(dataUrl).toBe('data:image/png;base64,test')
    })
  })

  describe('clearFaviconCache', () => {
    it('should not throw when clearing cache', async () => {
      const { clearFaviconCache } = await import('../../electron/utils/faviconManager')
      
      expect(() => clearFaviconCache()).not.toThrow()
    })
  })

  describe('preloadProviderIcons', () => {
    it('should preload icons for all providers', async () => {
      const { preloadProviderIcons } = await import('../../electron/utils/faviconManager')
      
      const providers = [
        { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'chatgpt', color: '#10a37f', enabled: true, order: 0 },
        { id: 'ollama', name: 'Ollama', url: 'http://localhost:11434', icon: 'ollama', color: '#ffffff', enabled: true, order: 1 },
      ]
      
      await expect(preloadProviderIcons(providers)).resolves.not.toThrow()
    })

    it('should handle empty provider list', async () => {
      const { preloadProviderIcons } = await import('../../electron/utils/faviconManager')
      
      await expect(preloadProviderIcons([])).resolves.not.toThrow()
    })
  })

  describe('fallback icon generation', () => {
    it('should generate icon with provider initial', async () => {
      const { getProviderIcon } = await import('../../electron/utils/faviconManager')
      const { nativeImage } = await import('electron')
      
      const provider = {
        id: 'custom',
        name: 'CustomProvider',
        url: 'https://custom.example.com',
        icon: 'custom',
        color: '#ff0000',
        enabled: true,
        order: 0,
      }
      
      await getProviderIcon(provider)
      
      // Should call createFromDataURL for fallback SVG
      expect(nativeImage.createFromDataURL).toHaveBeenCalled()
    })
  })
})
