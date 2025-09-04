import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rain, onMounted, onUnmounted } from '../src/component.js'
import { $ } from '../src/core.js'
import { jsx } from '../src/jsx.js'

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
        return () => jsx('div', null, 'Simple Component')
      })
      
      expect(registered).toBe(true)
      expect(customElements.get('test-simple')).toBeDefined()
    })

    it('should create component instance', () => {
      rain('test-instance', function() {
        return () => jsx('div', null, 'Test Instance')
      })
      
      const element = document.createElement('test-instance')
      document.body.appendChild(element)
      
      expect(element).toBeInstanceOf(HTMLElement)
      expect(element.shadowRoot).toBeDefined()
      expect(element.shadowRoot.textContent).toBe('Test Instance')
      
      document.body.removeChild(element)
    })

    it('should handle component with props', () => {
      rain('test-props', ['name', 'age'], function(props) {
        return () => jsx('div', null, props.name, ' is ', props.age)
      })
      
      const element = document.createElement('test-props')
      element.setAttribute('name', 'Alice')
      element.setAttribute('age', '25')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('Alice is 25')
      
      document.body.removeChild(element)
    })

    it('should update when attributes change', () => {
      rain('test-reactive', ['value'], function(props) {
        return () => jsx('div', null, 'Value: ', props.value)
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
      rain('test-duplicate', () => () => jsx('div', null, 'First'))
      const result = rain('test-duplicate', () => () => jsx('div', null, 'Second'))
      
      expect(result).toBe(true) // Still returns true even when skipped
      
      const element = document.createElement('test-duplicate')
      document.body.appendChild(element)
      
      // Should render the first version, not the second
      expect(element.shadowRoot.textContent).toBe('First')
      
      document.body.removeChild(element)
    })

    it('should validate component name', () => {
      const result1 = rain(null, () => () => jsx('div', null))
      expect(result1).toBe(false)
      
      const result2 = rain(123, () => () => jsx('div', null))
      expect(result2).toBe(false)
    })

    it('should validate factory function', () => {
      const result1 = rain('test-invalid-factory', null)
      expect(result1).toBe(false)
      
      const result2 = rain('test-invalid-factory2', 'not a function')
      expect(result2).toBe(false)
    })

    it('should accept function as second parameter when no props needed', () => {
      const registered = rain('test-no-props', function() {
        return () => jsx('div', null, 'No Props')
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
      
      rain('test-mounted', function() {
        onMounted(() => {
          mounted = true
        })
        return () => jsx('div', null, 'Mounted Test')
      })
      
      const element = document.createElement('test-mounted')
      expect(mounted).toBe(false)
      
      document.body.appendChild(element)
      expect(mounted).toBe(true)
      
      document.body.removeChild(element)
    })

    it('should call onUnmounted when disconnected', () => {
      let unmounted = false
      
      rain('test-unmounted', function() {
        onUnmounted(() => {
          unmounted = true
        })
        return () => jsx('div', null, 'Unmounted Test')
      })
      
      const element = document.createElement('test-unmounted')
      document.body.appendChild(element)
      
      expect(unmounted).toBe(false)
      
      document.body.removeChild(element)
      expect(unmounted).toBe(true)
    })

    it('should support multiple lifecycle hooks', () => {
      let calls = []
      
      rain('test-multiple-hooks', function() {
        onMounted(() => calls.push('mounted1'))
        onMounted(() => calls.push('mounted2'))
        onUnmounted(() => calls.push('unmounted1'))
        onUnmounted(() => calls.push('unmounted2'))
        return () => jsx('div', null, 'Multiple Hooks')
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
      
      rain('test-emit', function() {
        return () => jsx('div', null, 'Emit Test')
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
      rain('test-state', function() {
        const [count, setCount] = $(0)
        return () => jsx('div', null,
          jsx('span', null, 'Count: ', count),
          jsx('button', { onClick: () => setCount(count() + 1) }, '+')
        )
      })
      
      const element = document.createElement('test-state')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent.includes('Count: 0')).toBe(true)
      
      document.body.removeChild(element)
    })

    it('should handle factory errors gracefully', () => {
      rain('test-factory-error', function() {
        throw new Error('Factory error')
      })
      
      const element = document.createElement('test-factory-error')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent.includes('failed to render')).toBe(true)
      
      document.body.removeChild(element)
    })

    it('should handle render errors gracefully', () => {
      rain('test-render-error', function() {
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
      rain('test-props-init', ['name', 'count'], function(props) {
        return () => jsx('div', null, 'Name: ', props.name, ', Count: ', props.count)
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
          rain('test-observed', ['name', 'age'], () => () => jsx('div', null))
          return customElements.get('test-observed')
        })()
      
      expect(ComponentClass.observedAttributes).toEqual(['name', 'age'])
    })

    it('should handle empty props', () => {
      rain('test-empty-props', [], function(props) {
        return () => jsx('div', null, 'No props')
      })
      
      const element = document.createElement('test-empty-props')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('No props')
      
      document.body.removeChild(element)
    })

    it('should default to empty string for missing attributes', () => {
      rain('test-missing-attrs', ['missing'], function(props) {
        return () => jsx('div', null, 'Missing: "', props.missing, '"')
      })
      
      const element = document.createElement('test-missing-attrs')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('Missing: ""')
      
      document.body.removeChild(element)
    })
  })
})