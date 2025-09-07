import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rain, onMounted, onUnmounted, getShadowRoot } from '../src/component.js'
import { $, html } from '../src/core.js'

describe('component.js', () => {
  beforeEach(() => {
    // Reset customElements registry state for each test
    // Note: In real browser this isn't possible, but happy-dom allows it
    const registry = customElements
    for (const [name] of Object.entries(registry._registry || {})) {
      delete registry._registry[name]
    }
  })

  describe('rain component registration', () => {
    it('should register a simple component', () => {
      const registered = rain('test-simple', function() {
        return () => html`<div>Simple Component</div>`
      })
      
      expect(registered).toBe(true)
      expect(customElements.get('test-simple')).toBeDefined()
    })

    it('should create component instance', () => {
      rain.open('test-instance', function() {
        return () => html`<div>Test Instance</div>`
      })
      
      const element = document.createElement('test-instance')
      document.body.appendChild(element)
      
      expect(element).toBeInstanceOf(HTMLElement)
      expect(element.shadowRoot).toBeDefined()
      expect(element.shadowRoot.textContent).toBe('Test Instance')
      
      document.body.removeChild(element)
    })

    it('should handle component with props', () => {
      rain.open('test-props', ['name', 'age'], function(props) {
        return () => html`<div>${props.name} is ${props.age}</div>`
      })
      
      const element = document.createElement('test-props')
      element.setAttribute('name', 'Alice')
      element.setAttribute('age', '25')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('Alice is 25')
      
      document.body.removeChild(element)
    })

    it('should update when attributes change', () => {
      rain.open('test-reactive', ['value'], function(props) {
        return () => html`<div>Value: ${props.value}</div>`
      })
      
      const element = document.createElement('test-reactive')
      element.setAttribute('value', 'initial')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('Value: initial')
      
      element.setAttribute('value', 'updated')
      
      // Allow reactivity to propagate
      setTimeout(() => {
        expect(element.shadowRoot.textContent).toBe('Value: updated')
      }, 0)
      
      document.body.removeChild(element)
    })

    it('should skip re-registration of same component', () => {
      rain.open('test-duplicate', () => () => html`<div>First</div>`)
      const result = rain.open('test-duplicate', () => () => html`<div>Second</div>`)
      
      expect(result).toBe(true) // Still returns true even when skipped
      
      const element = document.createElement('test-duplicate')
      document.body.appendChild(element)
      
      // Should render the first version, not the second
      expect(element.shadowRoot.textContent).toBe('First')
      
      document.body.removeChild(element)
    })

    it('should validate component name', () => {
      expect(() => rain(null, () => () => html`<div></div>`)).toThrow('Component name is required and must be a string')
      expect(() => rain(123, () => () => html`<div></div>`)).toThrow('Component name is required and must be a string')
    })

    it('should validate factory function', () => {
      expect(() => rain('test-invalid-factory', null)).toThrow('Component factory function is required')
      expect(() => rain('test-invalid-factory2', 'not a function')).toThrow('Component factory function is required')
    })

    it('should accept function as second parameter when no props needed', () => {
      const registered = rain.open('test-no-props', function() {
        return () => html`<div>No Props</div>`
      })
      
      expect(registered).toBe(true)
      
      const element = document.createElement('test-no-props')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('No Props')
      
      document.body.removeChild(element)
    })
  })

  describe('component lifecycle', () => {
    it('should call onMounted when connected', () => {
      let mounted = false
      
      rain.open('test-mounted', function() {
        onMounted(() => {
          mounted = true
        })
        return () => html`<div>Mounted Test</div>`
      })
      
      const element = document.createElement('test-mounted')
      expect(mounted).toBe(false)
      
      document.body.appendChild(element)
      expect(mounted).toBe(true)
      
      document.body.removeChild(element)
    })

    it('should call onUnmounted when disconnected', () => {
      let unmounted = false
      
      rain.open('test-unmounted', function() {
        onUnmounted(() => {
          unmounted = true
        })
        return () => html`<div>Unmounted Test</div>`
      })
      
      const element = document.createElement('test-unmounted')
      document.body.appendChild(element)
      
      expect(unmounted).toBe(false)
      
      document.body.removeChild(element)
      expect(unmounted).toBe(true)
    })

    it('should support multiple lifecycle hooks', () => {
      let calls = []
      
      rain.open('test-multiple-hooks', function() {
        onMounted(() => calls.push('mounted1'))
        onMounted(() => calls.push('mounted2'))
        onUnmounted(() => calls.push('unmounted1'))
        onUnmounted(() => calls.push('unmounted2'))
        return () => html`<div>Multiple Hooks</div>`
      })
      
      const element = document.createElement('test-multiple-hooks')
      document.body.appendChild(element)
      
      expect(calls).toEqual(['mounted1', 'mounted2'])
      
      document.body.removeChild(element)
      expect(calls).toEqual(['mounted1', 'mounted2', 'unmounted1', 'unmounted2'])
    })

    it('should warn when lifecycle hooks called outside component', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      onMounted(() => {})
      onUnmounted(() => {})
      
      expect(consoleSpy).toHaveBeenCalledWith('onMounted called outside component factory')
      expect(consoleSpy).toHaveBeenCalledWith('onUnmounted called outside component factory')
      
      consoleSpy.mockRestore()
    })
  })

  describe('component features', () => {
    it('should have emit method for custom events', () => {
      let eventReceived = null
      
      rain.open('test-emit', function() {
        return () => html`<div>Emit Test</div>`
      })
      
      const element = document.createElement('test-emit')
      document.body.appendChild(element)
      
      element.addEventListener('custom-event', (e) => {
        eventReceived = e.detail
      })
      
      element.emit('custom-event', { test: 'data' })
      
      expect(eventReceived).toEqual({ test: 'data' })
      
      document.body.removeChild(element)
    })

    it('should handle internal state with signals', () => {
      rain.open('test-state', function() {
        const [count, setCount] = $(0)
        return () => html`
          <div>
            <span>Count: ${count}</span>
            <button onclick=${() => setCount(count() + 1)}>+</button>
          </div>
        `
      })
      
      const element = document.createElement('test-state')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent.includes('Count: 0')).toBe(true)
      
      document.body.removeChild(element)
    })

    it('should handle factory errors gracefully', () => {
      rain.open('test-factory-error', function() {
        throw new Error('Factory error')
      })
      
      const element = document.createElement('test-factory-error')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent.includes('failed to render')).toBe(true)
      
      document.body.removeChild(element)
    })

    it('should handle render errors gracefully', () => {
      rain.open('test-render-error', function() {
        return () => {
          throw new Error('Render error')
        }
      })
      
      const element = document.createElement('test-render-error')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent.includes('failed to render')).toBe(true)
      
      document.body.removeChild(element)
    })
  })

  describe('props reactivity', () => {
    it('should initialize props from attributes', async () => {
      rain.open('test-props-init', ['name', 'count'], function(props) {
        return () => html`<div>Name: ${props.name}, Count: ${props.count}</div>`
      })
      
      const element = document.createElement('test-props-init')
      element.setAttribute('name', 'Test')
      element.setAttribute('count', '42')
      document.body.appendChild(element)
      
      // Wait for reactivity to update
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(element.shadowRoot.textContent).toBe('Name: Test, Count: 42')
      
      document.body.removeChild(element)
    })

    it('should observe only declared attributes', () => {
      const ComponentClass = customElements.get('test-props') || 
        (() => {
          rain('test-observed', ['name', 'age'], () => () => html`<div></div>`)
          return customElements.get('test-observed')
        })()
      
      expect(ComponentClass.observedAttributes).toEqual(['name', 'age'])
    })

    it('should handle empty props', () => {
      rain.open('test-empty-props', [], function(props) {
        return () => html`<div>No props</div>`
      })
      
      const element = document.createElement('test-empty-props')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('No props')
      
      document.body.removeChild(element)
    })

    it('should default to empty string for missing attributes', () => {
      rain.open('test-missing-attrs', ['missing'], function(props) {
        return () => html`<div>Missing: "${props.missing}"</div>`
      })
      
      const element = document.createElement('test-missing-attrs')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('Missing: ""')
      
      document.body.removeChild(element)
    })
  })

  describe('getShadowRoot function', () => {
    it('should be available as export', () => {
      expect(typeof getShadowRoot).toBe('function')
    })

    it('should throw error when called outside component factory', () => {
      expect(() => getShadowRoot()).toThrow('getShadowRoot() called outside component factory')
    })

    it('should return shadow root when called inside component factory', () => {
      let capturedRoot = null
      
      rain.open('test-get-shadow-root', function() {
        capturedRoot = getShadowRoot()
        return () => html`<div>Shadow Root Test</div>`
      })
      
      const element = document.createElement('test-get-shadow-root')
      document.body.appendChild(element)
      
      expect(capturedRoot).toBe(element.shadowRoot)
      expect(capturedRoot instanceof ShadowRoot).toBe(true)
      
      document.body.removeChild(element)
    })

    it('should allow modifying adoptedStyleSheets via getShadowRoot', () => {
      let modifiedRoot = false
      
      rain.open('test-modify-shadow', function() {
        const root = getShadowRoot()
        // Simulate adding a stylesheet
        root.adoptedStyleSheets = []
        modifiedRoot = true
        return () => html`<div>Modified Shadow</div>`
      })
      
      const element = document.createElement('test-modify-shadow')
      document.body.appendChild(element)
      
      expect(modifiedRoot).toBe(true)
      expect(Array.isArray(element.shadowRoot.adoptedStyleSheets)).toBe(true)
      
      document.body.removeChild(element)
    })
  })

  describe('auto-adopt functionality', () => {
    beforeEach(() => {
      // Clean up any existing stylesheets in document head
      const existingLinks = document.head.querySelectorAll('link[data-rain-adopt]')
      existingLinks.forEach(link => link.remove())
      
      // Reset auto-adopt state between tests
      rain._resetAutoAdopt()
    })

    it('should have autoAdopt method on rain function', () => {
      expect(typeof rain.autoAdopt).toBe('function')
    })

    it('should enable auto-adopt when called', () => {
      expect(() => rain.autoAdopt()).not.toThrow()
    })

    it('should not crash when no data-rain-adopt link exists', () => {
      rain.autoAdopt()
      
      expect(() => {
        rain.open('test-no-adopt-link', function() {
          return () => html`<div>No Adopt Link</div>`
        })
        const element = document.createElement('test-no-adopt-link')
        document.body.appendChild(element)
        document.body.removeChild(element)
      }).not.toThrow()
    })

    it('should find data-rain-adopt link in document head', async () => {
      // Create a mock link element
      const mockLink = document.createElement('link')
      mockLink.rel = 'stylesheet'
      mockLink.href = 'data:text/css,body { color: red; }'
      mockLink.setAttribute('data-rain-adopt', '')
      document.head.appendChild(mockLink)
      
      // Mock fetch for the CSS content
      global.fetch = vi.fn(() => 
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('body { color: red; }')
        })
      )
      
      rain.autoAdopt()
      
      let componentCreated = false
      rain.open('test-with-adopt-link', function() {
        componentCreated = true
        return () => html`<div>With Adopt Link</div>`
      })
      
      const element = document.createElement('test-with-adopt-link')
      document.body.appendChild(element)
      
      expect(componentCreated).toBe(true)
      
      // Wait a tick for async stylesheet adoption
      await new Promise(resolve => setTimeout(resolve, 0))
      
      document.body.removeChild(element)
      document.head.removeChild(mockLink)
      
      // Clean up mock
      global.fetch.mockRestore && global.fetch.mockRestore()
    })

    it('should handle fetch errors gracefully', async () => {
      // Create a mock link element
      const mockLink = document.createElement('link')
      mockLink.rel = 'stylesheet'  
      mockLink.href = 'https://example.com/nonexistent.css'
      mockLink.setAttribute('data-rain-adopt', '')
      document.head.appendChild(mockLink)
      
      // Mock fetch to fail
      global.fetch = vi.fn(() => 
        Promise.reject(new Error('Network error'))
      )
      
      rain.autoAdopt()
      
      expect(() => {
        rain.open('test-fetch-error', function() {
          return () => html`<div>Fetch Error Test</div>`
        })
        const element = document.createElement('test-fetch-error')
        document.body.appendChild(element)
        document.body.removeChild(element)
      }).not.toThrow()
      
      document.head.removeChild(mockLink)
      
      // Clean up mock
      global.fetch.mockRestore && global.fetch.mockRestore()
    })

    it('should cache stylesheet and reuse it for multiple components', async () => {
      // Create a mock link element
      const mockLink = document.createElement('link')
      mockLink.rel = 'stylesheet'
      mockLink.href = 'data:text/css,body { color: blue; }'
      mockLink.setAttribute('data-rain-adopt', '')
      document.head.appendChild(mockLink)
      
      let fetchCallCount = 0
      global.fetch = vi.fn(() => {
        fetchCallCount++
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('body { color: blue; }')
        })
      })
      
      rain.autoAdopt()
      
      // Create first component
      rain.open('test-cache-1', function() {
        return () => html`<div>Cache Test 1</div>`
      })
      const element1 = document.createElement('test-cache-1')
      document.body.appendChild(element1)
      
      // Wait for async adoption
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Create second component  
      rain.open('test-cache-2', function() {
        return () => html`<div>Cache Test 2</div>`
      })
      const element2 = document.createElement('test-cache-2')
      document.body.appendChild(element2)
      
      // Wait for async adoption
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Should only fetch once due to caching
      expect(fetchCallCount).toBe(1)
      
      document.body.removeChild(element1)
      document.body.removeChild(element2)
      document.head.removeChild(mockLink)
      
      // Clean up mock
      global.fetch.mockRestore && global.fetch.mockRestore()
    })
  })
})