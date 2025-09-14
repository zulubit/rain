import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rain, onMounted, onUnmounted, getRoot, getChildren } from '../src/component.js'
import { $, html } from '../src/core.js'

describe('component.js', () => {
  beforeEach(() => {
    // Reset customElements registry state for each test
    const registry = customElements
    for (const [name] of Object.entries(registry._registry || {})) {
      delete registry._registry[name]
    }
  })

  describe('registration', () => {
    it('registers and renders components', () => {
      rain('test-basic', () => () => html`<div>Hello</div>`)
      const el = document.createElement('test-basic')
      document.body.appendChild(el)
      expect(el.textContent).toBe('Hello')
      el.remove()
    })

    it('handles props and reactivity', () => {
      rain('test-props', ['name'], function(props) {
        return () => html`<div>${props.name}</div>`
      })
      
      const el = document.createElement('test-props')
      el.setAttribute('name', 'Alice')
      document.body.appendChild(el)
      expect(el.textContent).toBe('Alice')
      
      el.setAttribute('name', 'Bob')
      setTimeout(() => expect(el.textContent).toBe('Bob'), 0)
      el.remove()
    })

    it('skips re-registration', () => {
      rain('test-dup', () => () => html`<div>First</div>`)
      rain('test-dup', () => () => html`<div>Second</div>`)
      
      const el = document.createElement('test-dup')
      document.body.appendChild(el)
      expect(el.textContent).toBe('First')
      el.remove()
    })

    it('validates inputs', () => {
      expect(() => rain(null, () => {})).toThrow('Component name')
      expect(() => rain('test', null)).toThrow('factory function')
      expect(() => rain('test', 'bad')).toThrow('factory function')
    })
  })

  describe('lifecycle', () => {
    it('calls mount/unmount hooks', () => {
      let state = ''
      
      rain('test-hooks', function() {
        onMounted(() => state += 'mounted')
        onUnmounted(() => state += 'unmounted')
        return () => html`<div>test</div>`
      })
      
      const el = document.createElement('test-hooks')
      document.body.appendChild(el)
      expect(state).toBe('mounted')
      
      el.remove()
      expect(state).toBe('mountedunmounted')
    })

    it('supports multiple hooks', () => {
      let calls = []
      
      rain('test-multi', function() {
        onMounted(() => calls.push(1))
        onMounted(() => calls.push(2))
        return () => html`<div>test</div>`
      })
      
      const el = document.createElement('test-multi')
      document.body.appendChild(el)
      expect(calls).toEqual([1, 2])
      el.remove()
    })

    it('warns when hooks called outside component', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      onMounted(() => {})
      onUnmounted(() => {})
      expect(spy).toHaveBeenCalledTimes(2)
      spy.mockRestore()
    })
  })

  describe('component APIs', () => {
    it('provides getRoot() access', () => {
      let root = null
      rain('test-root', function() {
        root = getRoot()
        root.setAttribute('test', 'yes')
        return () => html`<div>test</div>`
      })
      
      const el = document.createElement('test-root')
      document.body.appendChild(el)
      expect(el.getAttribute('test')).toBe('yes')
      expect(root).toBe(el)
      el.remove()
    })

    it('throws when getRoot/getChildren called outside', () => {
      expect(() => getRoot()).toThrow('outside component')
      expect(() => getChildren()).toThrow('outside component')
    })

    it('has emit method for events', () => {
      let received = null
      rain('test-emit', () => () => html`<div>test</div>`)
      
      const el = document.createElement('test-emit')
      document.body.appendChild(el)
      el.addEventListener('test', e => received = e.detail)
      el.emit('test', { data: 123 })
      expect(received).toEqual({ data: 123 })
      el.remove()
    })
  })

  describe('error handling', () => {
    it('handles factory errors', () => {
      rain('test-err1', () => { throw new Error('boom') })
      const el = document.createElement('test-err1')
      document.body.appendChild(el)
      expect(el.textContent).toContain('error')
      el.remove()
    })

    it('handles render errors', () => {
      rain('test-err2', () => () => { throw new Error('boom') })
      const el = document.createElement('test-err2')
      document.body.appendChild(el)
      expect(el.textContent).toContain('error')
      el.remove()
    })
  })

  describe('props', () => {
    it('observes only declared attributes', () => {
      rain('test-obs', ['a', 'b'], () => () => html`<div></div>`)
      const Class = customElements.get('test-obs')
      expect(Class.observedAttributes).toEqual(['a', 'b'])
    })

    it('defaults missing props to empty string', () => {
      rain('test-miss', ['val'], props => 
        () => html`<div>${props.val() || 'empty'}</div>`)
      
      const el = document.createElement('test-miss')
      document.body.appendChild(el)
      expect(el.textContent).toBe('empty')
      el.remove()
    })
  })

  describe('cleanup', () => {
    it('cleans up effects on disconnect', () => {
      let ran = false
      const [sig, set] = $(0)
      
      rain('test-clean1', function() {
        $.effect(() => { ran = true; sig() })
        return () => html`<div>test</div>`
      })

      const el = document.createElement('test-clean1')
      document.body.appendChild(el)
      
      ran = false
      set(1)
      expect(ran).toBe(true)
      
      el.remove()
      ran = false
      set(2)
      expect(ran).toBe(false)
    })

    it('cleans up listeners on disconnect', () => {
      let called = false
      
      rain('test-clean2', function() {
        $.listen('evt', () => called = true)
        return () => html`<div>test</div>`
      })

      const el = document.createElement('test-clean2')
      document.body.appendChild(el)
      
      $.emit('evt')
      expect(called).toBe(true)
      
      el.remove()
      called = false
      $.emit('evt')
      expect(called).toBe(false)
    })
  })
})