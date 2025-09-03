import { describe, it, expect, beforeEach } from 'vitest'
import { jsx, Fragment } from '../src/jsx.js'
import { $ } from '../src/core.js'

describe('$ prefix for property binding', () => {
  it('should set property with $ prefix', () => {
    const input = jsx('input', { $value: 'test value' })
    expect(input.value).toBe('test value')
  })

  it('should set attribute without $ prefix', () => {
    const input = jsx('input', { value: 'test value' })
    expect(input.getAttribute('value')).toBe('test value')
    expect(input.value).toBe('test value') // HTML sets this from attribute initially
  })

  it('should handle reactive property binding with $ prefix', () => {
    const [text, setText] = $('initial')
    const input = jsx('input', { $value: text })
    
    expect(input.value).toBe('initial')
    
    setText('updated')
    // Effect should update the property
    expect(input.value).toBe('updated')
  })

  it('should handle checkbox checked property', () => {
    const [checked, setChecked] = $(true)
    const checkbox = jsx('input', { type: 'checkbox', $checked: checked })
    
    expect(checkbox.checked).toBe(true)
    
    setChecked(false)
    expect(checkbox.checked).toBe(false)
  })

  it('should handle select value property', () => {
    const [selected, setSelected] = $('b')
    const select = jsx('select', { $value: selected },
      jsx('option', { value: 'a' }, 'A'),
      jsx('option', { value: 'b' }, 'B'),
      jsx('option', { value: 'c' }, 'C')
    )
    
    expect(select.value).toBe('b')
    
    setSelected('c')
    expect(select.value).toBe('c')
  })

  it('should handle textarea value property', () => {
    const [text, setText] = $('Hello World')
    const textarea = jsx('textarea', { $value: text })
    
    expect(textarea.value).toBe('Hello World')
    
    setText('Updated text')
    expect(textarea.value).toBe('Updated text')
  })

  it('should handle multiple $ properties', () => {
    const input = jsx('input', {
      $value: 'test',
      $disabled: true,
      $readOnly: true
    })
    
    expect(input.value).toBe('test')
    expect(input.disabled).toBe(true)
    expect(input.readOnly).toBe(true)
  })

  it('should handle mixed $ properties and regular attributes', () => {
    const [text] = $('dynamic')
    const input = jsx('input', {
      $value: text,
      className: 'form-input',
      placeholder: 'Enter text',
      type: 'text'
    })
    
    expect(input.value).toBe('dynamic')
    expect(input.className).toBe('form-input')
    expect(input.getAttribute('placeholder')).toBe('Enter text')
    expect(input.getAttribute('type')).toBe('text')
  })

  it('should stringify function when passed as attribute without $', () => {
    const myFunction = () => console.log('hello')
    const div = jsx('div', {
      'data-func': myFunction,
      'data-handler': myFunction  // Use data- attribute to avoid browser magic
    })
    
    expect(div.getAttribute('data-func')).toBe(myFunction.toString())
    expect(div.getAttribute('data-handler')).toBe(myFunction.toString())
    // These are truly just attributes with stringified functions
  })

  it('should set function as property with $ prefix', () => {
    const myFunction = () => console.log('hello')
    const div = jsx('div', {
      $onclick: myFunction
    })
    
    expect(div.onclick).toBe(myFunction)
    expect(div.getAttribute('onclick')).toBe(null) // No attribute set
  })

  it('should handle style as regular attribute', () => {
    const [styleSignal] = $('color: red;')
    
    // Static style
    const div1 = jsx('div', { style: 'color: blue; font-size: 16px;' })
    expect(div1.getAttribute('style')).toBe('color: blue; font-size: 16px;')
    
    // Reactive style
    const div2 = jsx('div', { style: styleSignal })
    expect(div2.getAttribute('style')).toBe('color: red;')
  })
})