import { describe, it, expect } from 'vitest'
import { validateURL, validateProviderConfig } from '../../electron/utils/validation'

describe('URL Validation', () => {
  it('should accept valid HTTPS URLs', () => {
    expect(validateURL('https://example.com')).toBe(true)
    expect(validateURL('https://chatgpt.com')).toBe(true)
  })

  it('should accept valid HTTP URLs', () => {
    expect(validateURL('http://localhost:3000')).toBe(true)
  })

  it('should reject invalid protocols', () => {
    expect(validateURL('ftp://example.com')).toBe(false)
    expect(validateURL('javascript:alert(1)')).toBe(false)
  })

  it('should reject malformed URLs', () => {
    expect(validateURL('not-a-url')).toBe(false)
    expect(validateURL('')).toBe(false)
  })
})

describe('Provider Config Validation', () => {
  it('should validate complete provider config', () => {
    const validProvider = {
      id: 'test',
      name: 'Test Provider',
      url: 'https://test.com',
      icon: 'test',
      color: '#FF0000',
      enabled: true,
      order: 0,
    }
    expect(validateProviderConfig(validProvider)).toBe(true)
  })

  it('should reject incomplete config', () => {
    const incomplete = {
      id: 'test',
      name: 'Test',
      // missing url
    }
    expect(validateProviderConfig(incomplete)).toBe(false)
  })

  it('should reject invalid color format', () => {
    const invalidColor = {
      id: 'test',
      name: 'Test',
      url: 'https://test.com',
      icon: 'test',
      color: 'red', // not hex
      enabled: true,
      order: 0,
    }
    expect(validateProviderConfig(invalidColor)).toBe(false)
  })

  it('should reject invalid URLs', () => {
    const invalidUrl = {
      id: 'test',
      name: 'Test',
      url: 'javascript:alert(1)',
      icon: 'test',
      color: '#FF0000',
      enabled: true,
      order: 0,
    }
    expect(validateProviderConfig(invalidUrl)).toBe(false)
  })
})
