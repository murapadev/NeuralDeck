/**
 * Ollama Service - API integration for local LLM
 * Supports configurable URL for Docker/remote Ollama instances
 */

// Default URL, can be overridden
let ollamaBaseUrl = 'http://localhost:11434'

export interface OllamaModel {
  name: string
  size: number
  digest: string
  modified_at: string
}

export interface OllamaModelList {
  models: OllamaModel[]
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Set the Ollama base URL (for Docker/remote instances)
 */
export function setBaseUrl(url: string): void {
  ollamaBaseUrl = url.replace(/\/$/, '') // Remove trailing slash
}

/**
 * Get the current Ollama base URL
 */
export function getBaseUrl(): string {
  return ollamaBaseUrl
}

/**
 * Check if Ollama is running and accessible
 */
export async function healthCheck(url?: string): Promise<boolean> {
  const baseUrl = url || ollamaBaseUrl
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get list of available models
 */
export async function getModels(url?: string): Promise<OllamaModel[]> {
  const baseUrl = url || ollamaBaseUrl
  try {
    const response = await fetch(`${baseUrl}/api/tags`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data: OllamaModelList = await response.json()
    return data.models || []
  } catch {
    return []
  }
}

/**
 * Format model size for display
 */
export function formatModelSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 * 1024)).toFixed(0)}MB`
}

/**
 * Get model display name (without tag if not needed)
 */
export function getModelDisplayName(name: string): string {
  // Remove common tags for cleaner display
  return name.replace(':latest', '')
}

export const ollamaService = {
  healthCheck,
  getModels,
  formatModelSize,
  getModelDisplayName,
  setBaseUrl,
  getBaseUrl,
  get baseUrl() {
    return ollamaBaseUrl
  },
}

export default ollamaService
