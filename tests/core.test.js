import { describe, it, expect, beforeEach, vi } from 'vitest'
import { $, html, render, list, match, css, DHTML } from '../src/core.js'

describe('core.js', () => {
  describe('$ (signal creation)', () => {
    it('should create signal with initial value', () => {
      const [count, setCount] = $(0)
      expect(count()).toBe(0)
    })

    it('should update signal value', () => {
      const [count, setCount] = $(0)
      setCount(5)
      expect(count()).toBe(5)
    })

    it('should work with different data types', () => {
      const [str, setStr] = $('hello')
      expect(str()).toBe('hello')
      setStr('world')
      expect(str()).toBe('world')

      const [obj, setObj] = $({ foo: 'bar' })
      expect(obj()).toEqual({ foo: 'bar' })
      setObj({ baz: 'qux' })
      expect(obj()).toEqual({ baz: 'qux' })

      const [arr, setArr] = $([1, 2, 3])
      expect(arr()).toEqual([1, 2, 3])
      setArr([4, 5])
      expect(arr()).toEqual([4, 5])
    })

    it('should have signal symbol on getter and setter', () => {
      const [getter, setter] = $(0)
      const SIGNAL_SYMBOL = Object.getOwnPropertySymbols(getter)[0]
      expect(getter[SIGNAL_SYMBOL]).toBeDefined()
      expect(setter[SIGNAL_SYMBOL]).toBeDefined()
      expect(getter[SIGNAL_SYMBOL]).toBe(setter[SIGNAL_SYMBOL])
    })
  })

  describe('$.computed', () => {
    it('should create computed signal', () => {
      const [count, setCount] = $(2)
      const doubled = $.computed(() => count() * 2)
      expect(doubled()).toBe(4)
    })

    it('should update when dependencies change', () => {
      const [a, setA] = $(2)
      const [b, setB] = $(3)
      const sum = $.computed(() => a() + b())
      
      expect(sum()).toBe(5)
      setA(10)
      expect(sum()).toBe(13)
      setB(5)
      expect(sum()).toBe(15)
    })

    it('should throw for non-function argument', () => {
      expect(() => $.computed('not a function')).toThrow('$.computed expects a function')
      expect(() => $.computed(123)).toThrow('$.computed expects a function')
    })
  })

  describe('$.effect', () => {
    it('should run effect immediately', () => {
      const fn = vi.fn()
      $.effect(fn)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should re-run when dependencies change', () => {
      const [count, setCount] = $(0)
      const fn = vi.fn(() => count())
      
      $.effect(fn)
      expect(fn).toHaveBeenCalledTimes(1)
      
      setCount(1)
      expect(fn).toHaveBeenCalledTimes(2)
      
      setCount(2)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw for non-function argument', () => {
      expect(() => $.effect('not a function')).toThrow('$.effect expects a function')
    })

    it('should return cleanup function', () => {
      const cleanup = $.effect(() => {})
      expect(typeof cleanup).toBe('function')
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

    it('should handle fragments with frag tag', () => {
      const frag = html`<frag>
        <div>First</div>
        <div>Second</div>
      </frag>`
      expect(frag.style.display).toBe('contents')
      expect(frag.children).toHaveLength(2)
      expect(frag.children[0].textContent).toBe('First')
      expect(frag.children[1].textContent).toBe('Second')
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

  describe('match', () => {
    it('should render matching case', () => {
      const [status, setStatus] = $('loading')
      const el = match(status, {
        'loading': () => html`<div>Loading...</div>`,
        'success': () => html`<div>Success!</div>`,
        'error': () => html`<div>Error</div>`
      })
      
      expect(el.textContent).toBe('Loading...')
    })

    it('should update when signal changes', () => {
      const [status, setStatus] = $('loading')
      const el = match(status, {
        'loading': () => html`<div>Loading...</div>`,
        'success': () => html`<div>Success!</div>`
      })
      
      expect(el.textContent).toBe('Loading...')
      setStatus('success')
      expect(el.textContent).toBe('Success!')
    })

    it('should use default case for unmatched values', () => {
      const [value, setValue] = $('unknown')
      const el = match(value, {
        'known': () => html`<div>Known</div>`,
        'default': () => html`<div>Fallback</div>`
      })
      
      expect(el.textContent).toBe('Fallback')
    })

    it('should handle numeric keys', () => {
      const [num, setNum] = $(1)
      const el = match(num, {
        1: () => html`<div>One</div>`,
        2: () => html`<div>Two</div>`
      })
      
      expect(el.textContent).toBe('One')
      setNum(2)
      expect(el.textContent).toBe('Two')
    })

    it('should throw for non-signal first argument', () => {
      expect(() => match('not a signal', {})).toThrow('match() expects a signal as first argument')
    })

    it('should throw for invalid cases object', () => {
      const [value] = $('test')
      expect(() => match(value, null)).toThrow('match() expects an object of cases')
      expect(() => match(value, 'not an object')).toThrow('match() expects an object of cases')
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

  describe('list', () => {
    it('should render simple list without keys', () => {
      const [items, setItems] = $(['a', 'b', 'c'])
      const el = list(items, item => html`<div>${item}</div>`)
      
      expect(el.children).toHaveLength(3)
      expect(el.children[0].textContent).toBe('a')
      expect(el.children[1].textContent).toBe('b')
      expect(el.children[2].textContent).toBe('c')
    })

    it('should update list when signal changes', () => {
      const [items, setItems] = $([1, 2])
      const el = list(items, item => html`<span>${item}</span>`)
      
      expect(el.children).toHaveLength(2)
      setItems([1, 2, 3, 4])
      expect(el.children).toHaveLength(4)
      expect(el.children[3].textContent).toBe('4')
    })

    it('should handle empty list', () => {
      const [items, setItems] = $([])
      const el = list(items, item => html`<div>${item}</div>`)
      
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
      
      const el = list(
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
        list(items, item => 'not a node')
      }).toThrow('renderFn must return a DOM Node')
    })

    it('should pass index to render function', () => {
      const [items] = $(['a', 'b', 'c'])
      const el = list(items, (item, index) => html`<div>${index}: ${item}</div>`)
      
      expect(el.children[0].textContent).toBe('0: a')
      expect(el.children[1].textContent).toBe('1: b')
      expect(el.children[2].textContent).toBe('2: c')
    })
  })

  describe('DHTML', () => {
    it('should create document fragment from HTML string', () => {
      const fragment = DHTML('<p>Hello</p><span>World</span>')
      expect(fragment instanceof DocumentFragment).toBe(true)
      
      const div = document.createElement('div')
      div.appendChild(fragment)
      expect(div.innerHTML).toBe('<p>Hello</p><span>World</span>')
    })

    it('should handle empty HTML string', () => {
      const fragment = DHTML('')
      expect(fragment instanceof DocumentFragment).toBe(true)
      expect(fragment.childNodes.length).toBe(0)
    })

    it('should throw for non-string input', () => {
      expect(() => DHTML(123)).toThrow('DHTML expects a string')
      expect(() => DHTML(null)).toThrow('DHTML expects a string')
      expect(() => DHTML(undefined)).toThrow('DHTML expects a string')
    })

    it('should work with html template', () => {
      const element = html`<div>${DHTML('<strong>Bold text</strong>')}</div>`
      expect(element.innerHTML).toBe('<strong>Bold text</strong>')
    })
  })
})