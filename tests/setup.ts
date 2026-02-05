/**
 * Test setup file for Vitest
 * Configures mocks for Electron and browser APIs
 */

import { vi } from 'vitest'

// Mock window.neuralDeck (Electron IPC bridge)
// Must match NeuralDeckAPI interface from src/types/electron.d.ts
const mockNeuralDeck = {
  // Navigation & Views
  switchView: vi.fn(),
  openExternal: vi.fn(),
  reload: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),

  // Window & Layout
  openSettingsWindow: vi.fn(),
  closeSettingsWindow: vi.fn(),

  // Auto-Update
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  onUpdateAvailable: vi.fn(() => () => {}),
  onUpdateDownloaded: vi.fn(() => () => {}),
  onDownloadProgress: vi.fn(() => () => {}),
  onUpdateError: vi.fn(() => () => {}),

  // System
  getPlatform: vi.fn(() => Promise.resolve('linux' as NodeJS.Platform)),

  // Events
  onViewChanged: vi.fn(() => () => {}),
  onNavigationStateChanged: vi.fn(() => () => {}),
  onOpenSettings: vi.fn(() => () => {}),
  onConfigUpdated: vi.fn(() => () => {}),
}

// Attach mocks to the existing jsdom window instead of replacing it
if (typeof window !== 'undefined') {
  window.neuralDeck = mockNeuralDeck
  window.location.hash = ''
  // Keep default href to avoid navigation side effects in jsdom
}

// Export mocks for use in tests
export { mockNeuralDeck }
