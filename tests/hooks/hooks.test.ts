/**
 * Tests for custom React hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}))

// Mock the store
vi.mock('../../src/store/appStore', () => ({
  useAppStore: vi.fn(() => ({
    setCurrentProvider: vi.fn(),
    setNavigationState: vi.fn(),
    openSettings: vi.fn(),
  })),
}))

describe('Hooks', () => {
  describe('useDebounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce the value', async () => {
      const { useDebounce } = await import('../../src/hooks/index')
      
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      expect(result.current).toBe('initial')

      // Update the value
      rerender({ value: 'updated', delay: 500 })
      
      // Value should still be initial immediately
      expect(result.current).toBe('initial')

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Now it should be updated
      expect(result.current).toBe('updated')
    })

    it('should reset timer on value change', async () => {
      const { useDebounce } = await import('../../src/hooks/index')
      
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'a', delay: 500 } }
      )

      expect(result.current).toBe('a')

      // Update twice quickly
      rerender({ value: 'b', delay: 500 })
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      rerender({ value: 'c', delay: 500 })
      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Should still be original
      expect(result.current).toBe('a')

      // Complete the timer
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should be final value
      expect(result.current).toBe('c')
    })
  })

  describe('useSettingsWindow', () => {
    it('should detect settings window hash', async () => {
      const originalHash = window.location.hash
      window.location.hash = '#settings'

      const { useSettingsWindow } = await import('../../src/hooks/index')
      const { result } = renderHook(() => useSettingsWindow())
      
      expect(result.current).toBe(true)

      // Restore
      window.location.hash = originalHash
    })

    it('should return false for non-settings hash', async () => {
      window.location.hash = ''

      const { useSettingsWindow } = await import('../../src/hooks/index')
      const { result } = renderHook(() => useSettingsWindow())
      
      expect(result.current).toBe(false)
    })
  })
})
