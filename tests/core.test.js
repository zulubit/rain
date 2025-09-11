import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as core from '../src/core.js'

const { $, html, css } = core
// Access internal functions for testing
const render = core.render || core.default?.render

describe('core.js', () => {
  describe('$ (signal creation)', () => {
    it('should create and update signal values', () => {
      const [count, setCount] = $(0)
      expect(count()).toBe(0)
      
      setCount(5)
      expect(count()).toBe(5)
    })

    it('should work with different data types', () => {
      // String signals
      const [str, setStr] = $('hello')
      expect(str()).toBe('hello')
      setStr('world')
      expect(str()).toBe('world')

      // Object signals
      const [obj, setObj] = $({ foo: 'bar' })
      expect(obj()).toEqual({ foo: 'bar' })
      setObj({ baz: 'qux' })
      expect(obj()).toEqual({ baz: 'qux' })

      // Array signals
      const [arr, setArr] = $([1, 2, 3])
      expect(arr()).toEqual([1, 2, 3])
      setArr([4, 5])
      expect(arr()).toEqual([4, 5])
    })

    it('should have preact signal brand on getter and setter', () => {
      const [getter, setter] = $(0)
      const PREACT_BRAND = Symbol.for('preact-signals')
      expect(getter.brand).toBe(PREACT_BRAND)
      expect(setter.brand).toBe(PREACT_BRAND)
    })
  })

  describe('$.computed', () => {
    it('should create and update computed signal', () => {
      const [count, setCount] = $(2)
      const doubled = $.computed(() => count() * 2)
      expect(doubled()).toBe(4)
      
      // Test dependency updates
      setCount(5)
      expect(doubled()).toBe(10)
    })

    it('should handle multiple dependencies', () => {
      const [a, setA] = $(2)
      const [b, setB] = $(3)
      const sum = $.computed(() => a() + b())
      
      expect(sum()).toBe(5)
      setA(10)
      expect(sum()).toBe(13)
      setB(5)
      expect(sum()).toBe(15)
    })
  })

  describe('$.effect', () => {
    it('should run immediately and re-run on dependencies', () => {
      const [count, setCount] = $(0)
      const fn = vi.fn(() => count())
      
      $.effect(fn)
      expect(fn).toHaveBeenCalledTimes(1)
      
      setCount(1)
      expect(fn).toHaveBeenCalledTimes(2)
      
      setCount(2)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should return cleanup function', () => {
      const cleanup = $.effect(() => {})
      expect(typeof cleanup).toBe('function')
    })
  })

  describe('signal validation', () => {
    it('should throw for non-function arguments', () => {
      // $.computed validation
      expect(() => $.computed('not a function')).toThrow('$.computed expects a function')
      expect(() => $.computed(123)).toThrow('$.computed expects a function')
      
      // $.effect validation  
      expect(() => $.effect('not a function')).toThrow('$.effect expects a function')
      expect(() => $.effect(null)).toThrow('$.effect expects a function')
    })
  })

  describe('html template', () => {
    it('should create basic elements', () => {
      const div = html`<div>Hello</div>`
      expect(div.tagName).toBe('DIV')
      expect(div.textContent).toBe('Hello')
    })

    it('should handle nested elements', () => {
      const el = html`<div><span>Nested</span></div>`
      expect(el.tagName).toBe('DIV')
      expect(el.children[0].tagName).toBe('SPAN')
      expect(el.children[0].textContent).toBe('Nested')
    })

    it('should handle whitespace around templates', () => {
      expect(() => {
        const el = html` <div>asdf</div> `
        expect(el.tagName).toBe('DIV')
        expect(el.textContent).toBe('asdf')
      }).not.toThrow()
    })

    it('should handle leading whitespace in templates', () => {
      expect(() => {
        const el = html` <div>asdf</div>`
        expect(el.tagName).toBe('DIV')  
        expect(el.textContent).toBe('asdf')
      }).not.toThrow()
    })

    it('should handle trailing whitespace in templates', () => {
      expect(() => {
        const el = html`<div>asdf</div> `
        expect(el.tagName).toBe('DIV')
        expect(el.textContent).toBe('asdf')
      }).not.toThrow()
    })

    it('should interpolate static values', () => {
      const name = 'World'
      const el = html`<div>Hello ${name}</div>`
      expect(el.textContent).toBe('Hello World')
    })

    it('should bind reactive signals', () => {
      const [count, setCount] = $(0)
      const el = html`<div>Count: ${count}</div>`
      expect(el.textContent).toBe('Count: 0')
      
      setCount(5)
      expect(el.textContent).toBe('Count: 5')
    })

    it('should handle event listeners', () => {
      const onClick = vi.fn()
      const button = html`<button @click=${onClick}>Click me</button>`
      
      button.click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should handle attributes', () => {
      const el = html`<div id="test" class="foo bar" data-value="123"></div>`
      expect(el.id).toBe('test')
      expect(el.className).toBe('foo bar')
      expect(el.getAttribute('data-value')).toBe('123')
    })

    it('should handle reactive attributes', () => {
      const [className, setClassName] = $('initial')
      const el = html`<div class=${className}></div>`
      expect(el.className).toBe('initial')
      
      setClassName('updated')
      expect(el.className).toBe('updated')
    })

    it('should handle boolean attributes', () => {
      const el1 = html`<button disabled=${true}>Disabled</button>`
      expect(el1.disabled).toBe(true)
      
      const el2 = html`<button disabled=${false}>Enabled</button>`
      expect(el2.disabled).toBe(false)
    })

    it('should throw error for multiple root elements', () => {
      expect(() => {
        html`<div>First</div><div>Second</div>`
      }).toThrow('Multiple root elements are not allowed')
    })
    
    it('should allow single root element', () => {
      const el = html`<div>
        <span>First</span>
        <span>Second</span>
      </div>`
      expect(el.tagName).toBe('DIV')
      expect(el.children).toHaveLength(2)
      expect(el.children[0].textContent).toBe('First')
      expect(el.children[1].textContent).toBe('Second')
    })
  })

  describe('render', () => {
    let container

    beforeEach(() => {
      container = document.createElement('div')
    })

    it('should render element to container', () => {
      const el = html`<span>Test</span>`
      render(el, container)
      expect(container.children).toHaveLength(1)
      expect(container.children[0].textContent).toBe('Test')
    })

    it('should render function result to container', () => {
      const component = () => html`<span>Function Result</span>`
      render(component, container)
      expect(container.children[0].textContent).toBe('Function Result')
    })

    it('should clean up previous content', () => {
      render(html`<div>First</div>`, container)
      expect(container.children).toHaveLength(1)
      
      render(html`<div>Second</div>`, container)
      expect(container.children).toHaveLength(1)
      expect(container.children[0].textContent).toBe('Second')
    })

    it('should return dispose function', () => {
      const result = render(html`<div>Test</div>`, container)
      expect(result.dispose).toBeDefined()
      expect(typeof result.dispose).toBe('function')
      
      result.dispose()
      expect(container.children).toHaveLength(0)
    })

    it('should throw for invalid container', () => {
      expect(() => render(html`<div></div>`, null)).toThrow('render() expects a DOM element as container')
      expect(() => render(html`<div></div>`, 'not an element')).toThrow('render() expects a DOM element as container')
    })
  })

  describe('$.if', () => {
    it('should render true case when condition is truthy', () => {
      const [isLoading, setLoading] = $(true)
      const el = $.if(isLoading, 
        () => html`<div>Loading...</div>`,
        () => html`<div>Ready</div>`
      )
      
      expect(el.textContent).toBe('Loading...')
    })

    it('should render false case when condition is falsy', () => {
      const [isLoading, setLoading] = $(false)
      const el = $.if(isLoading, 
        () => html`<div>Loading...</div>`,
        () => html`<div>Ready</div>`
      )
      
      expect(el.textContent).toBe('Ready')
    })

    it('should update when signal changes', () => {
      const [isLoading, setLoading] = $(true)
      const el = $.if(isLoading, 
        () => html`<div>Loading...</div>`,
        () => html`<div>Ready</div>`
      )
      
      expect(el.textContent).toBe('Loading...')
      setLoading(false)
      expect(el.textContent).toBe('Ready')
    })

    it('should render nothing when false case is omitted and condition is falsy', () => {
      const [condition, setCondition] = $(false)
      const el = $.if(condition, () => html`<div>True</div>`)
      
      expect(el.textContent).toBe('')
      setCondition(true)
      expect(el.textContent).toBe('True')
    })

    it('should throw for non-signal first argument', () => {
      expect(() => $.if('not a signal', () => html`<div>test</div>`)).toThrow('$.if() expects a signal as first argument')
    })
  })

  describe('css', () => {
    it('should create reactive CSS style element', () => {
      const [theme, setTheme] = $('light')
      const bgColor = $.computed(() => theme() === 'dark' ? '#333' : '#fff')
      
      const styles = css`
        .container {
          background: ${bgColor};
        }
      `
      
      const styleEl = styles()
      expect(styleEl.tagName).toBe('STYLE')
      expect(styleEl.textContent).toContain('background: #fff')
      
      setTheme('dark')
      
      const styleEl2 = styles()
      expect(styleEl2.textContent).toContain('background: #333')
    })

    it('should handle static CSS', () => {
      const styles = css`
        .button { 
          padding: 1rem; 
          border: none;
        }
      `
      
      const styleEl = styles()
      expect(styleEl.textContent).toContain('padding: 1rem')
      expect(styleEl.textContent).toContain('border: none')
    })

    it('should throw for non-template literal usage', () => {
      expect(() => {
        css('.invalid { color: red; }')
      }).toThrow('css must be used as a template literal')
    })
  })

  describe('$.list', () => {
    it('should render simple list without keys', () => {
      const [items, setItems] = $(['a', 'b', 'c'])
      const el = $.list(items, item => html`<div>${item}</div>`)
      
      expect(el.children).toHaveLength(3)
      expect(el.children[0].textContent).toBe('a')
      expect(el.children[1].textContent).toBe('b')
      expect(el.children[2].textContent).toBe('c')
    })

    it('should update list when signal changes', () => {
      const [items, setItems] = $([1, 2])
      const el = $.list(items, item => html`<span>${item}</span>`)
      
      expect(el.children).toHaveLength(2)
      setItems([1, 2, 3, 4])
      expect(el.children).toHaveLength(4)
      expect(el.children[3].textContent).toBe('4')
    })

    it('should handle empty list', () => {
      const [items, setItems] = $([])
      const el = $.list(items, item => html`<div>${item}</div>`)
      
      expect(el.children).toHaveLength(0)
      
      setItems(['new'])
      expect(el.children).toHaveLength(1)
      expect(el.children[0].textContent).toBe('new')
    })

    it('should use keyed reconciliation when key function provided', () => {
      const [items, setItems] = $([
        { id: 1, name: 'One' },
        { id: 2, name: 'Two' }
      ])
      
      const el = $.list(
        items,
        item => {
          const div = html`<div>${item.name}</div>`
          div.dataset.testId = item.id
          return div
        },
        item => item.id
      )
      
      expect(el.children).toHaveLength(2)
      const firstChild = el.children[0]
      expect(firstChild.dataset.testId).toBe('1')
      
      // Reorder items
      setItems([
        { id: 2, name: 'Two Updated' },
        { id: 1, name: 'One Updated' }
      ])
      
      // Check that the same DOM node was reused (keyed)
      expect(el.children[1]).toBe(firstChild)
      expect(el.children[1].textContent).toBe('One')
    })

    it('should throw for invalid render function return', () => {
      const [items, setItems] = $([1])
      expect(() => {
        $.list(items, item => 'not a node')
      }).toThrow('renderFn must return a DOM Node')
    })

    it('should pass index to render function', () => {
      const [items] = $(['a', 'b', 'c'])
      const el = $.list(items, (item, index) => html`<div>${index}: ${item}</div>`)
      
      expect(el.children[0].textContent).toBe('0: a')
      expect(el.children[1].textContent).toBe('1: b')
      expect(el.children[2].textContent).toBe('2: c')
    })
  })

  describe('$.raw', () => {
    it('should create document fragment from HTML string', () => {
      const fragment = $.raw('<p>Hello</p><span>World</span>')
      expect(fragment instanceof DocumentFragment).toBe(true)
      
      const div = document.createElement('div')
      div.appendChild(fragment)
      expect(div.innerHTML).toBe('<p>Hello</p><span>World</span>')
    })

    it('should handle empty HTML string', () => {
      const fragment = $.raw('')
      expect(fragment instanceof DocumentFragment).toBe(true)
      expect(fragment.childNodes.length).toBe(0)
    })

    it('should throw for non-string input', () => {
      expect(() => $.raw(123)).toThrow('$.raw expects a string')
      expect(() => $.raw(null)).toThrow('$.raw expects a string')
      expect(() => $.raw(undefined)).toThrow('$.raw expects a string')
    })

    it('should work with html template', () => {
      const element = html`<div>${$.raw('<strong>Bold text</strong>')}</div>`
      expect(element.innerHTML).toBe('<strong>Bold text</strong>')
    })
  })
})