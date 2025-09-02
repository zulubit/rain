/**
 * @fileoverview RainJS Core - Reactive template system with HTM and Preact signals
 * @version 0.0.9
 */

import htm from 'htm'
import { signal, computed, effect } from '@preact/signals-core'

const SIGNAL_SYMBOL = Symbol('rain.signal')

/**
 * Check if a value is a reactive signal function
 * @param {any} value - Value to check
 * @returns {boolean} True if value is reactive
 * @private
 */
function isReactive(value) {
  return typeof value === 'function' && value[SIGNAL_SYMBOL]
}

/**
 * Helper function to set property or attribute on element
 * @param {Element} element - Target element
 * @param {string} key - Property/attribute name
 * @param {any} val - Value to set
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
 * Process element attribute with reactive binding support
 * @param {Element} element - Target element
 * @param {string} key - Attribute/property name
 * @param {any} value - Attribute value
 * @private
 */
function processAttribute(element, key, value) {
  if (key.startsWith('@') && typeof value === 'function') {
    const eventName = key.slice(1)
    element.addEventListener(eventName, value)
  } else if (key.startsWith('.')) {
    const propName = key.slice(1)
    if (isReactive(value)) {
      effect(() => {
        element[propName] = value()
      })
    } else if (typeof value === 'function' && value[SIGNAL_SYMBOL]) {
      effect(() => {
        element[propName] = value()
      })
    } else {
      element[propName] = value
    }
  } else if (isReactive(value)) {
    effect(() => {
      setElementValue(element, key, value())
    })
  } else if (typeof value === 'function' && value[SIGNAL_SYMBOL]) {
    effect(() => {
      setElementValue(element, key, value())
    })
  } else {
    setElementValue(element, key, value)
  }
}

/**
 * HTM createElement function - creates DOM elements with reactive bindings
 * Always creates fresh DOM elements to ensure component instance isolation
 * @param {string} type - HTML tag name
 * @param {Object|null} props - Element properties and attributes
 * @param {...(Node|string|number|import('@preact/signals-core').Signal|Array)} children - Child elements or content
 * @returns {Element} Created DOM element
 * @throws {Error} When element type is invalid
 * @private
 */
function h(type, props, ...children) {
  if (type === 'frag') {
    const fragment = document.createElement('div')
    fragment.style.display = 'contents'

    for (const child of children.flat(Infinity)) {
      processChild(fragment, child)
    }

    return fragment
  }

  if (typeof type !== 'string' || !type) {
    throw new Error(`Invalid element type: ${type}`)
  }

  // Always create a fresh element - never reuse cached DOM elements
  // This ensures component instance isolation
  const element = document.createElement(type)
  let selectValueSignal = null

  // Process all children (completely flattened)
  for (const child of children.flat(Infinity)) {
    processChild(element, child)
  }

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (element.tagName === 'SELECT' && key === 'value' && isReactive(value)) {
        selectValueSignal = value
      } else {
        processAttribute(element, key, value)
      }
    }
  }

  if (selectValueSignal) {
    effect(() => {
      element.value = selectValueSignal()
    })
  }

  return element
}

/**
 * Process and append child element with reactive text support
 * @param {Element} element - Parent element
 * @param {Node|string|number|Function} child - Child to process
 * @private
 */
function processChild(element, child) {
  if (child == null) return

  if (typeof child === 'string' || typeof child === 'number') {
    element.appendChild(document.createTextNode(String(child)))
  } else if (typeof child === 'function' && child[SIGNAL_SYMBOL]) {
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
 * Internal HTM template function
 * @private
 */
const htmBound = htm.bind(h)

/**
 * Generate a unique cache-busting key for component instances
 */
let instanceCounter = 0
const getInstanceKey = () => ++instanceCounter

/**
 * HTM template function for creating reactive DOM elements
 * Automatically adds cache-busting for component isolation and strips whitespace
 * @param {TemplateStringsArray} strings - Template string array
 * @param {...any} values - Template interpolation values
 * @returns {Element} Created DOM element
 * @example html`<div>Hello ${name}</div>`
 */
function html(strings, ...values) {
  // Add a unique cache-buster to prevent HTM from reusing DOM elements between component instances
  const modifiedStrings = [...strings]
  modifiedStrings[modifiedStrings.length - 1] += `<!-- ${getInstanceKey()} -->`

  return htmBound(modifiedStrings, ...values)
}

/**
 * Clean up container children, preserving list containers
 * @param {Element} container - Container to clean up
 * @private
 */
function cleanupContainer(container) {
  Array.from(container.children).forEach(child => {
    if (!child._listCleanup) {
      child.remove()
    }
  })
}

/**
 * Renders elements to a container with cleanup management
 * @param {Element | (() => Element)} elementOrFn - Element or function returning element
 * @param {Element} container - Target container element
 * @returns {{dispose: () => void}} Cleanup object
 * @throws {Error} When elementOrFn doesn't return a valid DOM node
 */
function render(elementOrFn, container) {
  if (!container || !container.appendChild) {
    throw new Error(`render() expects a DOM element as container, got ${typeof container}`)
  }

  cleanupContainer(container)

  const element = typeof elementOrFn === 'function' ? elementOrFn() : elementOrFn

  if (element instanceof Node) {
    container.appendChild(element)

    return {
      dispose: () => {
        cleanupContainer(container)
      }
    }
  }

  return { dispose: () => { } }
}

/**
 * Creates a reactive signal with SolidJS-style tuple return
 * @template T
 * @param {T} initialValue - Initial value (primitives, objects, arrays)
 * @returns {[() => T, (value: T) => void]} Tuple of [getter, setter]
 * @example
 * const [count, setCount] = $(0);
 * console.log(count()); // get value
 * setCount(5); // set value
 */
function $(initialValue) {
  const sig = signal(initialValue)

  const getter = () => sig.value
  const setter = (newValue) => {
    sig.value = newValue
  }

  getter[SIGNAL_SYMBOL] = sig
  setter[SIGNAL_SYMBOL] = sig

  return [getter, setter]
}

/**
 * Creates a computed signal that automatically updates when dependencies change
 * @template T
 * @param {() => T} computation - Function that computes the value
 * @returns {() => T} Read-only computed accessor function
 * @throws {Error} When computation is not a function
 * @example
 * const [count] = $(0);
 * const doubled = $.computed(() => count() * 2);
 * const fullName = $.computed(() => `${firstName()} ${lastName()}`);
 */
$.computed = function(computation) {
  if (typeof computation !== 'function') {
    throw new Error('$.computed expects a function, got ' + typeof computation)
  }
  const comp = computed(computation)
  const accessor = () => comp.value
  accessor[SIGNAL_SYMBOL] = comp
  return accessor
}

/**
 * Creates an effect that runs when dependencies change
 * @param {() => void} fn - Side effect function
 * @returns {() => void} Effect cleanup function
 * @throws {Error} When fn is not a function
 * @example
 * const [count] = $(0);
 * const cleanup = $.effect(() => document.title = `Count: ${count()}`);
 * // Call cleanup() when no longer needed
 */
$.effect = function(fn) {
  if (typeof fn !== 'function') {
    throw new Error('$.effect expects a function, got ' + typeof fn)
  }
  return effect(fn)
}

/**
 * Listen for custom events with automatic cleanup
 * @param {string} eventName - Name of the event to listen for
 * @param {(event: CustomEvent) => void} handler - Event handler function
 * @param {EventTarget} [target=document] - Target to listen on
 * @returns {() => void} Cleanup function
 * @throws {Error} When eventName is not a string
 * @throws {Error} When handler is not a function
 * @example
 * const cleanup = $.listen('user-changed', (e) => setUser(e.detail));
 * // Call cleanup() when no longer needed
 */
$.listen = function(eventName, handler, target = document) {
  if (typeof eventName !== 'string') {
    throw new Error('$.listen expects eventName to be a string')
  }
  if (typeof handler !== 'function') {
    throw new Error('$.listen expects handler to be a function')
  }

  target.addEventListener(eventName, handler)

  return () => {
    target.removeEventListener(eventName, handler)
  }
}

/**
 * Emit custom events from current component context
 * @param {string} eventName - Name of the event to emit
 * @param {any} [detail] - Event detail data
 * @param {EventTarget} [target] - Target to emit from (defaults to current component or document)
 * @throws {Error} When eventName is not a string
 * @example
 * $.emit('value-changed', { value: newValue })
 */
$.emit = function(eventName, detail, target) {
  if (typeof eventName !== 'string') {
    throw new Error('$.emit expects eventName to be a string')
  }

  // Use provided target or default to document for global events
  const emitter = target || document

  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    composed: true
  })

  emitter.dispatchEvent(event)
}

/**
 * Creates a reactive CSS style element from template literal
 * @param {TemplateStringsArray} strings - Template string parts
 * @param {...any} values - Template interpolation values
 * @returns {() => Element} Computed signal returning reactive style element
 * @throws {Error} When not used as a template literal
 * @example
 * const styles = css`
 *   .container {
 *     background: ${theme() === 'dark' ? '#333' : '#fff'};
 *   }
 * `
 */
function css(strings, ...values) {
  if (!Array.isArray(strings)) {
    throw new Error('css must be used as a template literal')
  }

  return $.computed(() => {
    let cssText = ''
    for (let i = 0; i < strings.length; i++) {
      cssText += strings[i]
      if (i < values.length) {
        const value = values[i]
        cssText += typeof value === 'function' && value[SIGNAL_SYMBOL] ? value() : value
      }
    }

    const style = document.createElement('style')
    style.textContent = cssText
    return style
  })
}

/**
 * Simple conditional rendering
 * @param {() => any} conditionSignal - Signal function containing the condition
 * @param {() => Element} trueFn - Function to render when truthy
 * @param {() => Element} [falseFn] - Optional function to render when falsy
 * @returns {Element} Container element with conditionally rendered content
 * @example
 * $.if(isLoading, () => html`<div>Loading...</div>`, () => html`<div>Ready!</div>`)
 */
$.if = function(conditionSignal, trueFn, falseFn) {
  if (typeof conditionSignal !== 'function' || !conditionSignal[SIGNAL_SYMBOL]) {
    throw new Error('$.if() expects a signal as first argument')
  }

  const container = document.createElement('div')
  container.style.display = 'contents'

  let currentElement = null

  const cleanup = effect(() => {
    const condition = conditionSignal()

    // Remove current element if exists
    if (currentElement && currentElement.parentNode === container) {
      currentElement.remove()
      currentElement = null
    }

    const renderFn = condition ? trueFn : falseFn
    if (renderFn && typeof renderFn === 'function') {
      const element = renderFn()
      if (element && element instanceof Node) {
        container.appendChild(element)
        currentElement = element
      }
    }
  })

  container._listCleanup = cleanup
  return container
}

/**
 * Renders reactive lists with optional keyed reconciliation
 * @param {() => any[]} itemsSignal - Signal function containing array data
 * @param {(item: any, index: number) => Element} renderFn - Function to render each item
 * @param {(item: any, index: number) => string | number} [keyFn] - Optional key extraction function
 * @returns {Element} Container element with rendered list items
 * @example
 * // With keyed reconciliation (recommended)
 * $.list(items, item => html`<li>${item.name}</li>`, item => item.id)
 *
 * // Simple re-render (no keys)
 * $.list(items, item => html`<li>${item.name}</li>`)
 */
$.list = function(itemsSignal, renderFn, keyFn) {
  const container = document.createElement('div')
  container.style.display = 'contents'
  container._listCleanup = true

  let cleanup = null

  if (keyFn) {
    const nodeMap = new Map()

    cleanup = effect(() => {
      const items = itemsSignal()
      if (!Array.isArray(items)) return

      if (items.length === 0) {
        for (const [, node] of nodeMap) {
          if (node.parentNode === container) {
            node.remove()
          }
        }
        nodeMap.clear()
        return
      }

      const keys = items.map((item, index) => keyFn(item, index))
      const validKeys = keys.every(key => key != null)
      const uniqueKeys = new Set(keys).size === keys.length

      if (!validKeys || !uniqueKeys) {
        if (typeof window !== 'undefined' && window.RAIN_DEBUG) {
          console.log('[Rain:List] Invalid keys, falling back to full re-render')
        }
        Array.from(container.children).forEach(child => child.remove())
        nodeMap.clear()
        items.forEach((item, index) => {
          const node = renderFn(item, index)
          if (!node || !(node instanceof Node)) {
            throw new Error(`renderFn must return a DOM Node, got ${typeof node}`)
          }
          container.appendChild(node)
        })
        return
      }

      const usedNodes = new Set()

      const desiredNodes = []
      items.forEach((item, index) => {
        const key = keys[index]
        let node = nodeMap.get(key)

        usedNodes.add(key)

        if (!node) {
          node = renderFn(item, index)
          if (!node || !(node instanceof Node)) {
            throw new Error(`renderFn must return a DOM Node, got ${typeof node}`)
          }
          nodeMap.set(key, node)
        }

        desiredNodes.push(node)
      })

      const currentNodes = Array.from(container.children)

      currentNodes.forEach(node => {
        if (node.parentNode === container) {
          container.removeChild(node)
        }
      })

      desiredNodes.forEach(node => {
        container.appendChild(node)
      })

      for (const [key, node] of nodeMap) {
        if (!usedNodes.has(key)) {
          if (node.parentNode === container) {
            node.remove()
          }
          nodeMap.delete(key)
        }
      }
    })
  } else {
    cleanup = effect(() => {
      const items = itemsSignal()
      if (!Array.isArray(items)) return

      Array.from(container.children).forEach(child => child.remove())

      items.forEach((item, index) => {
        const node = renderFn(item, index)
        if (!node || !(node instanceof Node)) {
          throw new Error(`renderFn must return a DOM Node, got ${typeof node}`)
        }
        container.appendChild(node)
      })
    })
  }

  container._listCleanup = cleanup
  return container
}

/**
 * Creates a dangerous HTML object for raw HTML insertion
 * WARNING: This bypasses XSS protection. Only use with trusted content.
 * @param {string} html - Raw HTML string to insert
 * @returns {DocumentFragment} Fragment containing parsed HTML
 * @example
 * html`
 *   ${$.DHTML('<style>.my-comp { color: red; }</style>')}
 *   <div class="my-comp">Styled content</div>
 * `
 */
$.DHTML = function(html) {
  if (typeof html !== 'string') {
    throw new Error('$.DHTML expects a string')
  }
  const container = document.createElement('div')
  container.innerHTML = html

  const fragment = document.createDocumentFragment()
  while (container.firstChild) {
    fragment.appendChild(container.firstChild)
  }

  return fragment
}

export { $, html, css }

// Internal export for component.js
export { render }
