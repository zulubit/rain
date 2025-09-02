/**
 * @fileoverview RainWC JSX Implementation - JSX pragma and Fragment
 */

import { SIGNAL_SYMBOL, isReactive } from './core.js'
import { effect } from '@preact/signals-core'

/**
 * @param {Element} element
 * @param {string} key
 * @param {any} val
 * @private
 */
function setElementValue(element, key, val) {
  if (key in element && typeof element[key] !== 'function') {
    element[key] = val
  } else {
    if (val == null || val === false) {
      element.removeAttribute(key)
    } else if (val === true) {
      element.setAttribute(key, '')
    } else {
      element.setAttribute(key, String(val))
    }
  }
}

/**
 * @param {Element} element
 * @param {string} key
 * @param {any} value
 * @private
 */
function processAttribute(element, key, value) {
  // Handle JSX event handlers (onClick, onInput, etc.)
  if (key.startsWith('on') && key[2] === key[2]?.toUpperCase()) {
    const eventName = key.slice(2).toLowerCase()
    element.addEventListener(eventName, value)
  }
  // Handle direct property bindings (value, checked, etc.)
  else if (shouldBindAsProperty(element, key)) {
    if (isReactive(value)) {
      effect(() => {
        element[key] = value()
      })
    } else {
      element[key] = value
    }
  }
  // Handle className special case
  else if (key === 'className') {
    if (isReactive(value)) {
      effect(() => {
        element.className = value()
      })
    } else {
      element.className = value
    }
  }
  // Handle ref callback
  else if (key === 'ref' && typeof value === 'function') {
    value(element)
  }
  // Handle style object
  else if (key === 'style' && typeof value === 'object' && !isReactive(value)) {
    Object.assign(element.style, value)
  }
  // Handle reactive style
  else if (key === 'style' && isReactive(value)) {
    effect(() => {
      const styleValue = value()
      if (typeof styleValue === 'object') {
        Object.assign(element.style, styleValue)
      } else {
        element.style = styleValue
      }
    })
  }
  // Handle reactive attributes
  else if (isReactive(value)) {
    effect(() => {
      setElementValue(element, key, value())
    })
  }
  // Handle static attributes
  else {
    setElementValue(element, key, value)
  }
}

/**
 * Properties that should be set directly rather than as attributes
 * @param {Element} element
 * @param {string} key
 * @returns {boolean}
 * @private
 */
function shouldBindAsProperty(element, key) {
  // Common properties that should be bound directly
  const propertyNames = ['value', 'checked', 'selected', 'disabled', 'readOnly', 'multiple']
  
  // For inputs, textareas, and selects, bind value as property
  if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') && 
      propertyNames.includes(key)) {
    return true
  }
  
  return false
}

/**
 * @param {Element} element
 * @param {any} child
 * @private
 */
function processChild(element, child) {
  if (child == null || child === false) return
  
  if (Array.isArray(child)) {
    child.forEach(c => processChild(element, c))
  } else if (typeof child === 'string' || typeof child === 'number') {
    element.appendChild(document.createTextNode(String(child)))
  } else if (isReactive(child)) {
    let currentChild = null
    effect(() => {
      const value = child()
      if (value instanceof Node) {
        if (currentChild && currentChild.parentNode === element) {
          element.removeChild(currentChild)
        }
        element.appendChild(value)
        currentChild = value
      } else {
        if (!currentChild || currentChild.nodeType !== Node.TEXT_NODE) {
          if (currentChild && currentChild.parentNode === element) {
            element.removeChild(currentChild)
          }
          currentChild = document.createTextNode('')
          element.appendChild(currentChild)
        }
        currentChild.textContent = String(value ?? '')
      }
    })
  } else if (child instanceof Node) {
    element.appendChild(child)
  }
}

/**
 * Fragment component for grouping elements
 * @param {Object} props
 * @param {...any} children
 * @returns {Element}
 */
export function Fragment(props, ...children) {
  const fragment = document.createElement('div')
  fragment.style.display = 'contents'
  
  children.flat(Infinity).forEach(child => processChild(fragment, child))
  
  return fragment
}

/**
 * JSX pragma function - replaces React.createElement
 * @param {string|Function} type - Element type or component function
 * @param {Object|null} props - Properties/attributes
 * @param {...any} children - Child elements
 * @returns {Element|any}
 */
export function jsx(type, props, ...children) {
  // Handle function components
  if (typeof type === 'function') {
    // Fragment is a special case
    if (type === Fragment) {
      return Fragment(props, ...children)
    }
    // Regular function components
    return type({ ...props, children: children.length > 1 ? children : children[0] })
  }
  
  // Handle string types (HTML elements)
  if (typeof type !== 'string' || !type) {
    throw new Error(`Invalid element type: ${type}`)
  }
  
  const element = document.createElement(type)
  let selectValueSignal = null
  
  // Process children first
  children.flat(Infinity).forEach(child => processChild(element, child))
  
  // Process props/attributes
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      // Skip children prop (already handled)
      if (key === 'children') continue
      
      // Special handling for select value
      if (element.tagName === 'SELECT' && key === 'value' && isReactive(value)) {
        selectValueSignal = value
      } else {
        processAttribute(element, key, value)
      }
    }
  }
  
  // Handle select value reactivity after options are added
  if (selectValueSignal) {
    effect(() => {
      element.value = selectValueSignal()
    })
  }
  
  return element
}

// For JSX automatic runtime (React 17+)
export const jsxs = jsx
export const jsxDEV = jsx

// Backward compatibility
export { jsx as h }