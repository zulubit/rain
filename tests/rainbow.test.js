import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rain } from '../src/component.js'
import { $$ } from '../src/rainbow.js'
import { jsx } from '../src/jsx.js'

describe('rainbow.js', () => {
  beforeEach(() => {
    // Reset customElements registry for each test
    const registry = customElements
    for (const [name] of Object.entries(registry._registry || {})) {
      delete registry._registry[name]
    }
    
    // Clear any existing DOM elements
    document.body.innerHTML = ''
  })

  describe('rain-bow component', () => {
    it('should register rain-bow component', () => {
      expect(customElements.get('rain-bow')).toBeDefined()
    })

    it('should handle hyphenated prop names', () => {
      const element = document.createElement('rain-bow')
      element.setAttribute('page-data', '{"user": {"name": "John"}}')
      element.setAttribute('global-data', '{"csrf": "abc123"}')
      document.body.appendChild(element)
      
      expect(element).toBeInstanceOf(HTMLElement)
      expect(element.shadowRoot).toBeDefined()
      
      document.body.removeChild(element)
    })

    it('should parse JSON from page-data and global-data attributes', async () => {
      const pageData = { user: { name: 'Alice', age: 25 } }
      const globalData = { csrf_token: 'xyz789', errors: {} }

      const element = document.createElement('rain-bow')
      element.setAttribute('page-data', JSON.stringify(pageData))
      element.setAttribute('global-data', JSON.stringify(globalData))
      document.body.appendChild(element)

      // Wait for signals to update
      await new Promise(resolve => setTimeout(resolve, 0))

      expect($$.page()).toEqual(pageData)
      expect($$.global()).toEqual({
        csrf_token: 'xyz789',
        flash: [], // Default added
        errors: {}
      })

      document.body.removeChild(element)
    })

    it('should update context when attributes change', async () => {
      const element = document.createElement('rain-bow')
      element.setAttribute('page-data', '{"count": 0}')
      element.setAttribute('global-data', '{"status": "loading"}')
      document.body.appendChild(element)

      // Wait for initial update
      await new Promise(resolve => setTimeout(resolve, 0))
      expect($$.page()).toEqual({ count: 0 })
      expect($$.global()).toEqual({ 
        csrf_token: '',
        flash: [],
        status: 'loading' 
      })

      // Change attributes
      element.setAttribute('page-data', '{"count": 5}')
      element.setAttribute('global-data', '{"status": "ready"}')

      // Wait for reactivity to propagate
      await new Promise(resolve => setTimeout(resolve, 0))
      expect($$.page()).toEqual({ count: 5 })
      expect($$.global()).toEqual({ 
        csrf_token: '',
        flash: [],
        status: 'ready' 
      })

      document.body.removeChild(element)
    })

    it('should handle invalid JSON gracefully', async () => {
      const element = document.createElement('rain-bow')
      element.setAttribute('page-data', 'invalid json')
      element.setAttribute('global-data', '{"valid": true}')
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect($$.page()).toEqual({}) // Should default to empty object
      expect($$.global()).toEqual({ 
        csrf_token: '',
        flash: [],
        valid: true 
      })

      document.body.removeChild(element)
    })

    it('should provide default csrf_token and flash even with empty global data', async () => {
      const element = document.createElement('rain-bow')
      element.setAttribute('page-data', '{"test": "value"}')
      element.setAttribute('global-data', '{}') // Empty global data
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect($$.page()).toEqual({ test: 'value' })
      expect($$.global()).toEqual({
        csrf_token: '',
        flash: []
      })

      document.body.removeChild(element)
    })

    it('should preserve server global data while ensuring defaults', async () => {
      const element = document.createElement('rain-bow')
      element.setAttribute('global-data', '{"csrf_token": "abc123", "user": {"id": 1}, "custom": "value"}')
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect($$.global()).toEqual({
        csrf_token: 'abc123', // Server value preserved
        flash: [], // Default added
        user: { id: 1 }, // Server value preserved
        custom: 'value' // Server value preserved
      })

      document.body.removeChild(element)
    })

    it('should handle completely invalid global JSON', async () => {
      const element = document.createElement('rain-bow')
      element.setAttribute('global-data', 'completely invalid json')
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect($$.global()).toEqual({
        csrf_token: '',
        flash: []
      })

      document.body.removeChild(element)
    })

    it('should provide slot for child content', () => {
      const element = document.createElement('rain-bow')
      element.innerHTML = '<div>Child content</div>'
      document.body.appendChild(element)

      // rain-bow should render a slot that shows child content
      expect(element.shadowRoot.querySelector('slot')).toBeDefined()

      document.body.removeChild(element)
    })
  })

  describe('context propagation', () => {
    it('should allow child components to access page and global data', async () => {
      // Create rain-bow with data FIRST
      const rainBowElement = document.createElement('rain-bow')
      rainBowElement.setAttribute('page-data', '{"message": "Hello World"}')
      rainBowElement.setAttribute('global-data', '{"theme": "dark"}')
      document.body.appendChild(rainBowElement)

      // Wait for rain-bow to set up context
      await new Promise(resolve => setTimeout(resolve, 10))

      // Now create a test component that uses the context
      rain.open('test-consumer', function() {
        const pageData = $$.page
        const globalData = $$.global
        
        return () => jsx('div', null, 
          jsx('span', { 'data-page': JSON.stringify(pageData()) }),
          jsx('span', { 'data-global': JSON.stringify(globalData()) })
        )
      })

      // Add child component after context is established
      const childElement = document.createElement('test-consumer')
      rainBowElement.appendChild(childElement)

      // Wait for all updates to propagate
      await new Promise(resolve => setTimeout(resolve, 10))

      // Child component should have access to the context data
      const pageSpan = childElement.shadowRoot.querySelector('[data-page]')
      const globalSpan = childElement.shadowRoot.querySelector('[data-global]')
      
      expect(pageSpan).toBeDefined()
      expect(globalSpan).toBeDefined()
      expect(JSON.parse(pageSpan.getAttribute('data-page'))).toEqual({ message: 'Hello World' })
      expect(JSON.parse(globalSpan.getAttribute('data-global'))).toEqual({ 
        csrf_token: '',
        flash: [],
        theme: 'dark' 
      })

      document.body.removeChild(rainBowElement)
    })
  })

  describe('request helpers', () => {
    beforeEach(() => {
      // Mock fetch for testing
      global.fetch = vi.fn()
      
      // Reset window location
      delete window.location
      window.location = { pathname: '/test', search: '?foo=bar' }
    })

    it('should have update and submitForm methods', () => {
      expect(typeof $$.update).toBe('function') 
      expect(typeof $$.submitForm).toBe('function')
    })

    it('should access page and global data', () => {
      expect(typeof $$.page).toBe('function')
      expect(typeof $$.global).toBe('function')
    })

    it('should include CSRF token from global data in requests', async () => {
      // Set up rain-bow with CSRF token
      const element = document.createElement('rain-bow')
      element.setAttribute('global-data', '{"csrf_token": "test-token"}')
      document.body.appendChild(element)

      await new Promise(resolve => setTimeout(resolve, 0))

      // Mock successful response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ pageData: {}, globalData: {} })
      })

      await $$.update({ data: { test: 'data' } })

      expect(fetch).toHaveBeenCalledWith('/test?foo=bar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': 'test-token'
        },
        body: JSON.stringify({ test: 'data' })
      })

      document.body.removeChild(element)
    })
  })
})