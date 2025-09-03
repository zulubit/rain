import { describe, it, expect, vi } from 'vitest'
import { jsx, Fragment } from '../src/jsx.js'
import { $ } from '../src/core.js'

describe('JSX', () => {
  describe('jsx function', () => {
    it('should create DOM elements', () => {
      const el = jsx('div', null, 'Hello')
      expect(el.tagName).toBe('DIV')
      expect(el.textContent).toBe('Hello')
    })

    it('should handle attributes', () => {
      const el = jsx('div', { 
        id: 'test', 
        className: 'my-class',
        'data-value': 'test-data'
      })
      expect(el.id).toBe('test')
      expect(el.className).toBe('my-class')
      expect(el.getAttribute('data-value')).toBe('test-data')
    })

    it('should handle $ prefix for properties', () => {
      const [value, setValue] = $('test-value')
      const input = jsx('input', { $value: value })
      
      expect(input.value).toBe('test-value')
      
      setValue('new-value')
      expect(input.value).toBe('new-value')
    })

    it('should handle boolean attributes', () => {
      const disabled = jsx('input', { disabled: true })
      const enabled = jsx('input', { disabled: false })
      
      expect(disabled.disabled).toBe(true)
      expect(enabled.disabled).toBe(false)
    })

    it('should handle event listeners', () => {
      const handler = vi.fn()
      const button = jsx('button', { onClick: handler }, 'Click')
      
      button.click()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should handle nested elements', () => {
      const el = jsx('div', null,
        jsx('h1', null, 'Title'),
        jsx('p', null, 'Content')
      )
      
      expect(el.children).toHaveLength(2)
      expect(el.children[0].tagName).toBe('H1')
      expect(el.children[1].tagName).toBe('P')
      expect(el.children[0].textContent).toBe('Title')
      expect(el.children[1].textContent).toBe('Content')
    })

    it('should handle mixed text and element children', () => {
      const el = jsx('div', null,
        'Start ',
        jsx('strong', null, 'Bold'),
        ' End'
      )
      
      expect(el.textContent).toBe('Start Bold End')
      expect(el.children).toHaveLength(1)
      expect(el.children[0].tagName).toBe('STRONG')
    })

    it('should handle reactive content', () => {
      const [count, setCount] = $(0)
      const el = jsx('div', null, 'Count: ', count)
      
      expect(el.textContent).toBe('Count: 0')
      
      setCount(5)
      expect(el.textContent).toBe('Count: 5')
    })

    it('should handle style strings', () => {
      const el = jsx('div', { style: 'color: red; padding: 10px' })
      expect(el.style.color).toBe('red')
      expect(el.style.padding).toBe('10px')
    })

    it('should handle reactive styles', () => {
      const [color, setColor] = $('blue')
      const styleSignal = $.computed(() => `color: ${color()}`)
      const el = jsx('div', { style: styleSignal })
      
      expect(el.getAttribute('style')).toBe('color: blue')
      
      setColor('green')
      expect(el.getAttribute('style')).toBe('color: green')
    })
  })

  describe('Fragment', () => {
    it('should create DocumentFragment', () => {
      const frag = jsx(Fragment, null,
        jsx('div', null, 'First'),
        jsx('div', null, 'Second')
      )
      
      expect(frag).toBeInstanceOf(DocumentFragment)
      expect(frag.childNodes).toHaveLength(2)
      expect(frag.childNodes[0].textContent).toBe('First')
      expect(frag.childNodes[1].textContent).toBe('Second')
    })

    it('should handle empty Fragment', () => {
      const frag = jsx(Fragment, null)
      expect(frag).toBeInstanceOf(DocumentFragment)
      expect(frag.childNodes).toHaveLength(0)
    })

    it('should handle Fragment with mixed content', () => {
      const frag = jsx(Fragment, null,
        'Text node',
        jsx('span', null, 'Element'),
        'More text'
      )
      
      expect(frag.childNodes).toHaveLength(3)
      expect(frag.textContent).toBe('Text nodeElementMore text')
    })
  })

  describe('edge cases', () => {
    it('should handle null/undefined children', () => {
      const el = jsx('div', null, null, undefined, 'Valid')
      expect(el.textContent).toBe('Valid')
    })

    it('should handle nested arrays of children', () => {
      const items = ['a', 'b', 'c']
      const el = jsx('div', null, items.map(item => jsx('span', null, item)))
      
      expect(el.children).toHaveLength(3)
      expect(el.children[0].textContent).toBe('a')
      expect(el.children[1].textContent).toBe('b')
      expect(el.children[2].textContent).toBe('c')
    })

    it('should handle function children that return elements', () => {
      const getContent = () => jsx('p', null, 'Dynamic content')
      const el = jsx('div', null, getContent())
      
      expect(el.children).toHaveLength(1)
      expect(el.children[0].textContent).toBe('Dynamic content')
    })
  })
})