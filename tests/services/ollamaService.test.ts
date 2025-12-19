import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('OllamaService', () => {
  let ollamaService: typeof import('../../src/services/ollamaService').ollamaService

  beforeEach(async () => {
    vi.resetModules()
    mockFetch.mockReset()
    const module = await import('../../src/services/ollamaService')
    ollamaService = module.ollamaService
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('healthCheck', () => {
    it('should return true when Ollama is running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await ollamaService.healthCheck()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tags'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should return false when Ollama is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await ollamaService.healthCheck()
      expect(result).toBe(false)
    })

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      const result = await ollamaService.healthCheck()
      expect(result).toBe(false)
    })
  })

  describe('getModels', () => {
    it('should return models when available', async () => {
      const mockModels = {
        models: [
          { name: 'llama3', size: 4200000000, digest: 'abc123', modified_at: '2024-01-01' },
          { name: 'mistral', size: 3500000000, digest: 'def456', modified_at: '2024-01-02' },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModels),
      })

      const result = await ollamaService.getModels()
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('llama3')
    })

    it('should return empty array when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await ollamaService.getModels()
      expect(result).toEqual([])
    })

    it('should return empty array when no models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: null }),
      })

      const result = await ollamaService.getModels()
      expect(result).toEqual([])
    })
  })

  describe('formatModelSize', () => {
    it('should format GB correctly', () => {
      const result = ollamaService.formatModelSize(4.2 * 1024 * 1024 * 1024)
      expect(result).toBe('4.2GB')
    })

    it('should format MB correctly', () => {
      const result = ollamaService.formatModelSize(500 * 1024 * 1024)
      expect(result).toBe('500MB')
    })
  })

  describe('getModelDisplayName', () => {
    it('should remove :latest tag', () => {
      expect(ollamaService.getModelDisplayName('llama3:latest')).toBe('llama3')
    })

    it('should keep other tags', () => {
      expect(ollamaService.getModelDisplayName('llama3:7b')).toBe('llama3:7b')
    })
  })

  describe('setBaseUrl', () => {
    it('should update base URL', () => {
      ollamaService.setBaseUrl('http://192.168.1.100:11434')
      expect(ollamaService.baseUrl).toBe('http://192.168.1.100:11434')
    })

    it('should remove trailing slash', () => {
      ollamaService.setBaseUrl('http://localhost:11434/')
      expect(ollamaService.baseUrl).toBe('http://localhost:11434')
    })
  })
})
