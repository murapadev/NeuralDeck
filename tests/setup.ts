/**
 * Test setup file for Vitest
 * Configures mocks for Electron and browser APIs
 */

import { vi } from 'vitest'

// Mock window.neuralDeck (Electron IPC bridge)
const mockNeuralDeck = {
  onViewChanged: vi.fn(() => () => {}),
  onNavigationStateChanged: vi.fn(() => () => {}),
  onOpenSettings: vi.fn(() => () => {}),
  switchView: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),
  reload: vi.fn(),
  openExternal: vi.fn(),
  getConfig: vi.fn(),
  setConfig: vi.fn()
}

// Set up global mocks
Object.defineProperty(globalThis, 'window', {
  value: {
    ...globalThis.window,
    neuralDeck: mockNeuralDeck,
    location: {
      hash: '',
      href: 'http://localhost/'
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  },
  writable: true
})

// Export mocks for use in tests
export { mockNeuralDeck }
