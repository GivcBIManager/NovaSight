/**
 * Simple smoke test to verify test setup
 */
import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })
  
  it('should have window defined', () => {
    expect(window).toBeDefined()
  })
  
  it('should have document defined', () => {
    expect(document).toBeDefined()
  })
})
