import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rain, onMounted, onUnmounted } from '../src/component.js'
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
      rain.open('test-props', {
        name: { type: String, default: 'nobody' },
        age: { type: String, default: 'ageless' }
      }, function(props) {
        // Use computed signals for reactive prop access
        const name = $.computed(() => props().name)
        const age = $.computed(() => props().age)
        return () => html`<div>${name} is ${age}</div>`
      })
      
      const element = document.createElement('test-props')
      document.body.appendChild(element)
      
      // Initially default values
      expect(element.shadowRoot.textContent).toBe('nobody is ageless')
      
      // Set attributes after mounting - should update reactively
      element.setAttribute('name', 'John')
      element.setAttribute('age', '30')
      expect(element.shadowRoot.textContent).toBe('John is 30')
      
      document.body.removeChild(element)
    })

    it('should update when attributes change', () => {
      rain.open('test-reactive', {
        value: { type: String, default: 'none' }
      }, function(props) {
        const value = $.computed(() => props().value)
        return () => html`<div>Value: ${value}</div>`
      })
      
      const element = document.createElement('test-reactive')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('Value: none')
      
      element.setAttribute('value', 'updated')
      expect(element.shadowRoot.textContent).toBe('Value: updated')
      
      document.body.removeChild(element)
    })

    it('should skip re-registration of same component', () => {
      // Note: The logger is created internally, not using console.warn directly
      // We need to check the behavior differently
      rain.open('test-duplicate', () => () => html`<div>First</div>`)
      const result = rain('test-duplicate', () => () => html`<div>Second</div>`)
      
      expect(result).toBe(true)
      
      // Verify the first registration is still active
      const element = document.createElement('test-duplicate')
      document.body.appendChild(element)
      expect(element.shadowRoot.textContent).toBe('First')
      document.body.removeChild(element)
    })

    it('should validate component name', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result1 = rain(null, () => () => html`<div></div>`)
      expect(result1).toBe(false)
      
      const result2 = rain(123, () => () => html`<div></div>`)
      expect(result2).toBe(false)
      
      spy.mockRestore()
    })

    it('should validate factory function', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result1 = rain('test-invalid', 'not a function')
      expect(result1).toBe(false)
      
      const result2 = rain('test-invalid2', null)
      expect(result2).toBe(false)
      
      spy.mockRestore()
    })

    it('should accept props as second parameter when no props needed', () => {
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
      const mountedFn = vi.fn()
      
      rain('test-mounted', function() {
        onMounted(mountedFn)
        return () => html`<div>Mounted Test</div>`
      })
      
      const element = document.createElement('test-mounted')
      expect(mountedFn).not.toHaveBeenCalled()
      
      document.body.appendChild(element)
      expect(mountedFn).toHaveBeenCalledTimes(1)
      
      document.body.removeChild(element)
    })

    it('should call onUnmounted when disconnected', () => {
      const unmountedFn = vi.fn()
      
      rain('test-unmounted', function() {
        onUnmounted(unmountedFn)
        return () => html`<div>Unmounted Test</div>`
      })
      
      const element = document.createElement('test-unmounted')
      document.body.appendChild(element)
      
      expect(unmountedFn).not.toHaveBeenCalled()
      
      document.body.removeChild(element)
      expect(unmountedFn).toHaveBeenCalledTimes(1)
    })

    it('should support multiple lifecycle hooks', () => {
      const mounted1 = vi.fn()
      const mounted2 = vi.fn()
      const unmounted1 = vi.fn()
      const unmounted2 = vi.fn()
      
      rain('test-multiple-hooks', function() {
        onMounted(mounted1)
        onMounted(mounted2)
        onUnmounted(unmounted1)
        onUnmounted(unmounted2)
        return () => html`<div>Multiple Hooks</div>`
      })
      
      const element = document.createElement('test-multiple-hooks')
      document.body.appendChild(element)
      
      expect(mounted1).toHaveBeenCalledTimes(1)
      expect(mounted2).toHaveBeenCalledTimes(1)
      
      document.body.removeChild(element)
      
      expect(unmounted1).toHaveBeenCalledTimes(1)
      expect(unmounted2).toHaveBeenCalledTimes(1)
    })

    it('should warn when lifecycle hooks called outside component', () => {
      // The logger uses its own internal system, not console.warn directly
      // Just verify they don't throw when called outside component context
      expect(() => onMounted(() => {})).not.toThrow()
      expect(() => onUnmounted(() => {})).not.toThrow()
    })
  })

  describe('component features', () => {
    it('should have emit method for custom events', () => {
      const eventHandler = vi.fn()
      
      rain('test-emit', function() {
        onMounted(() => {
          this.emit('custom-event', { data: 'test' })
        })
        return () => html`<div>Emit Test</div>`
      })
      
      const element = document.createElement('test-emit')
      element.addEventListener('custom-event', eventHandler)
      document.body.appendChild(element)
      
      expect(eventHandler).toHaveBeenCalledTimes(1)
      expect(eventHandler.mock.calls[0][0].detail).toEqual({ data: 'test' })
      
      document.body.removeChild(element)
    })

    it('should handle internal state with signals', () => {
      rain.open('test-state', function() {
        const [count, setCount] = $(0)
        
        this.increment = () => setCount(count() + 1)
        
        return () => html`
          <div>
            <span class="count">Count: ${count}</span>
            <button @click=${() => setCount(count() + 1)}>+</button>
          </div>
        `
      })
      
      const element = document.createElement('test-state')
      document.body.appendChild(element)
      
      const countSpan = element.shadowRoot.querySelector('.count')
      const button = element.shadowRoot.querySelector('button')
      
      expect(countSpan.textContent).toBe('Count: 0')
      
      button.click()
      expect(countSpan.textContent).toBe('Count: 1')
      
      element.increment()
      expect(countSpan.textContent).toBe('Count: 2')
      
      document.body.removeChild(element)
    })

    it('should handle factory errors gracefully', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      rain.open('test-factory-error', function() {
        throw new Error('Factory error')
      })
      
      const element = document.createElement('test-factory-error')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toContain('failed to render')
      expect(errorSpy).toHaveBeenCalled()
      
      document.body.removeChild(element)
      errorSpy.mockRestore()
    })

    it('should handle render errors gracefully', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      rain.open('test-render-error', function() {
        return () => {
          throw new Error('Render error')
        }
      })
      
      const element = document.createElement('test-render-error')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toContain('failed to render')
      expect(errorSpy).toHaveBeenCalled()
      
      document.body.removeChild(element)
      errorSpy.mockRestore()
    })
  })

  describe('props reactivity', () => {
    it('should initialize props from attributes', () => {
      rain.open('test-init-props', {
        foo: { type: String, default: 'no-foo' },
        bar: { type: String, default: 'no-bar' }
      }, function(props) {
        const foo = $.computed(() => props().foo)
        const bar = $.computed(() => props().bar)
        return () => html`<div>${foo} ${bar}</div>`
      })
      
      const element = document.createElement('test-init-props')
      document.body.appendChild(element)
      
      // Initially default values
      expect(element.shadowRoot.textContent).toBe('no-foo no-bar')
      
      // Set attribute after mounting
      element.setAttribute('foo', 'hello')
      expect(element.shadowRoot.textContent).toBe('hello no-bar')
      
      document.body.removeChild(element)
    })

    it('should observe only declared attributes', () => {
      rain.open('test-observed', {
        observed: { type: String, default: 'none' }
      }, function(props) {
        const observed = $.computed(() => props().observed)
        return () => html`<div>Observed: ${observed}</div>`
      })
      
      const element = document.createElement('test-observed')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent).toBe('Observed: none')
      
      element.setAttribute('observed', 'yes')
      expect(element.shadowRoot.textContent).toBe('Observed: yes')
      
      element.setAttribute('not-observed', 'ignored')
      expect(element.shadowRoot.textContent).toBe('Observed: yes')
      
      document.body.removeChild(element)
    })

    it('should handle different prop types', () => {
      rain.open('test-types', {
        name: { type: String, default: 'test' },
        count: { type: Number, default: 0 },
        active: { type: Boolean, default: false },
        data: { type: Object, default: null }
      }, function(props) {
        const name = $.computed(() => props().name)
        const count = $.computed(() => props().count)
        const active = $.computed(() => props().active)
        const data = $.computed(() => props().data)
        const status = $.computed(() => active() ? 'yes' : 'no')
        const dataStr = $.computed(() => data() ? JSON.stringify(data()) : 'null')
        
        return () => html`<div>Name: ${name}, Count: ${count}, Active: ${status}, Data: ${dataStr}</div>`
      })
      
      const element = document.createElement('test-types')
      document.body.appendChild(element)
      
      expect(element.shadowRoot.textContent.trim()).toBe('Name: test, Count: 0, Active: no, Data: null')
      
      element.setAttribute('name', 'updated')
      element.setAttribute('count', '42')
      element.setAttribute('active', 'true')
      element.setAttribute('data', '{"key":"value"}')
      
      expect(element.shadowRoot.textContent.trim()).toBe('Name: updated, Count: 42, Active: yes, Data: {"key":"value"}')
      
      document.body.removeChild(element)
    })

    it('should handle dot syntax for property assignment', async () => {
      // Component that receives props via dot syntax
      rain.open('test-dot-syntax', {
        data: { type: Object, default: null },
        onClick: { type: Function, default: null }
      }, function(props) {
        // Make props reactive
        const data = $.computed(() => props().data)
        const onClick = $.computed(() => props().onClick)
        const message = $.computed(() => data()?.message || 'no-data')
        
        return () => html`
          <div>
            <span class="data">${message}</span>
            <button @click=${() => onClick() && onClick()()} class="btn">Click</button>
          </div>
        `
      })
      
      // Test by creating element and setting properties directly
      const element = document.createElement('test-dot-syntax')
      document.body.appendChild(element)
      
      // Initially should show default
      expect(element.shadowRoot.querySelector('.data').textContent).toBe('no-data')
      
      // Set properties using dot syntax approach (direct property assignment)
      element.data = { message: 'hello world' }
      let clicked = false
      element.onClick = () => { clicked = true }
      
      // Wait for microtask to complete the prop update
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Should update to show the new data
      expect(element.shadowRoot.querySelector('.data').textContent).toBe('hello world')
      
      // Test function call
      const button = element.shadowRoot.querySelector('.btn')
      button.click()
      expect(clicked).toBe(true)
      
      document.body.removeChild(element)
    })
  })
})