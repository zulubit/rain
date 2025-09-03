/**
 * @fileoverview RainWC JSX Implementation - JSX pragma and Fragment
 */

import { isReactive, $ } from './core.js'

/**
 * Sets an HTML attribute on an element with proper boolean handling
 * @param {Element} element - Target DOM element
 * @param {string} key - Attribute name
 * @param {any} val - Attribute value
 * @private
 */
function setElementAttribute(element, key, val) {
  if (val == null || val === false) {
    element.removeAttribute(key)
  } else if (val === true) {
    element.setAttribute(key, '')
  } else {
    element.setAttribute(key, String(val))
  }
}

/**
 * Processes a single JSX prop/attribute and applies it to the element
 * @param {Element} element - Target DOM element
 * @param {string} key - Property/attribute name
 * @param {any} value - Property/attribute value
 * @private
 */
function processAttribute(element, key, value) {
  // Handle JSX event handlers (onClick, onInput, etc.)
  if (key.startsWith('on') && key[2] === key[2]?.toUpperCase()) {
    const eventName = key.slice(2).toLowerCase()
    element.addEventListener(eventName, value)
  }
  // Handle $ prefix for property binding
  else if (key.startsWith('$')) {
    const propName = key.slice(1)
    if (isReactive(value)) {
      $.effect(() => {
        element[propName] = value()
      })
    } else {
      element[propName] = value
    }
  }
  // Handle className special case
  else if (key === 'className') {
    if (isReactive(value)) {
      $.effect(() => {
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
  // Handle reactive attributes
  else if (isReactive(value)) {
    $.effect(() => {
      setElementAttribute(element, key, value())
    })
  }
  // Handle static attributes
  else {
    setElementAttribute(element, key, value)
  }
}

/**
 * Processes and appends a child element, handling various child types including reactive signals
 * @param {Element} element - Parent element to append to
 * @param {any} child - Child element (can be Node, string, number, array, or reactive signal)
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
    $.effect(() => {
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
 * Fragment component for grouping elements without creating wrapper DOM nodes
 * @param {Object} props - Props object (unused but kept for JSX compatibility)
 * @param {...any} children - Child elements to group
 * @returns {DocumentFragment} Native DocumentFragment containing all children
 */
export function Fragment(props, ...children) {
  const fragment = document.createDocumentFragment()
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

  children.flat(Infinity).forEach(child => processChild(element, child))

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue
      processAttribute(element, key, value)
    }
  }

  return element
}

// For JSX automatic runtime (React 17+)
export const jsxs = jsx
export const jsxDEV = jsx

// Backward compatibility
export { jsx as h }
