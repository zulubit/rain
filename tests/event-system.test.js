import { describe, it, expect, vi, beforeEach } from 'vitest'
import { $ } from '../src/core.js'

describe('Event System', () => {
  beforeEach(() => {
    // Clean up any existing listeners
    document.removeEventListener('test-event', () => {})
  })

  describe('$.emit', () => {
    it('should emit global events on document', () => {
      const handler = vi.fn()
      document.addEventListener('test-event', handler)
      
      $.emit('test-event', { message: 'hello' })
      
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail).toEqual({ message: 'hello' })
      
      document.removeEventListener('test-event', handler)
    })

    it('should emit events on specific elements', () => {
      const handler = vi.fn()
      const element = document.createElement('div')
      element.addEventListener('custom-event', handler)
      
      $.emit('custom-event', { data: 'test' }, element)
      
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail).toEqual({ data: 'test' })
    })

    it('should emit events without detail', () => {
      const handler = vi.fn()
      document.addEventListener('simple-event', handler)
      
      $.emit('simple-event')
      
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail).toBeNull()
      
      document.removeEventListener('simple-event', handler)
    })

    it('should throw for invalid event name', () => {
      expect(() => $.emit(123)).toThrow('$.emit expects eventName to be a string')
      expect(() => $.emit(null)).toThrow('$.emit expects eventName to be a string')
    })
  })

  describe('$.listen', () => {
    it('should listen to global events on document', () => {
      const handler = vi.fn()
      const cleanup = $.listen('global-event', handler)
      
      document.dispatchEvent(new CustomEvent('global-event', { detail: { test: true } }))
      
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail).toEqual({ test: true })
      
      cleanup()
    })

    it('should listen to events on specific elements', () => {
      const handler = vi.fn()
      const element = document.createElement('button')
      const cleanup = $.listen('click', handler, element)
      
      element.dispatchEvent(new CustomEvent('click', { detail: { clicked: true } }))
      
      expect(handler).toHaveBeenCalledTimes(1)
      
      cleanup()
    })

    it('should return cleanup function', () => {
      const handler = vi.fn()
      const cleanup = $.listen('test-cleanup', handler)
      
      expect(typeof cleanup).toBe('function')
      
      // Emit event - should work
      document.dispatchEvent(new CustomEvent('test-cleanup'))
      expect(handler).toHaveBeenCalledTimes(1)
      
      // Clean up and emit again - should not trigger
      cleanup()
      document.dispatchEvent(new CustomEvent('test-cleanup'))
      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should throw for invalid event name', () => {
      expect(() => $.listen(123, () => {})).toThrow('$.listen expects eventName to be a string')
      expect(() => $.listen(null, () => {})).toThrow('$.listen expects eventName to be a string')
    })

    it('should throw for invalid handler', () => {
      expect(() => $.listen('test', 'not a function')).toThrow('$.listen expects handler to be a function')
      expect(() => $.listen('test', null)).toThrow('$.listen expects handler to be a function')
    })

    it('should handle multiple listeners on same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      const cleanup1 = $.listen('multi-event', handler1)
      const cleanup2 = $.listen('multi-event', handler2)
      
      document.dispatchEvent(new CustomEvent('multi-event'))
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      
      cleanup1()
      cleanup2()
    })
  })

  describe('integration', () => {
    it('should work together - emit and listen', () => {
      const handler = vi.fn()
      const cleanup = $.listen('integration-test', handler)
      
      $.emit('integration-test', { message: 'integration works' })
      
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail).toEqual({ message: 'integration works' })
      
      cleanup()
    })

    it('should handle custom element events', () => {
      const handler = vi.fn()
      const element = document.createElement('div')
      
      const cleanup = $.listen('element-event', handler, element)
      $.emit('element-event', { source: 'element' }, element)
      
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail).toEqual({ source: 'element' })
      
      cleanup()
    })
  })
})