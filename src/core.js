/**
 * @fileoverview RainJS Core - Reactive template system with HTM and Preact signals
 * @version 0.0.4
 */

import htm from 'htm'
import { signal, computed, effect } from '@preact/signals-core'
import { isDebugEnabled, isSignal } from './utils.js'
import { createLogger } from './logger.js'

const logger = createLogger('Core')
const listLogger = createLogger('List')

const SIGNAL_SYMBOL = Symbol('rain.signal')

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
    if (isSignal(value)) {
      effect(() => {
        element[propName] = value.value
      })
    } else if (typeof value === 'function' && value[SIGNAL_SYMBOL]) {
      effect(() => {
        element[propName] = value()
      })
    } else {
      element[propName] = value
    }
  } else if (isSignal(value)) {
    effect(() => {
      setElementValue(element, key, value.value)
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
  if (type === '') {
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
    const textNode = document.createTextNode('')
    effect(() => {
      textNode.textContent = String(child() ?? '')
    })
    element.appendChild(textNode)
  } else if (child instanceof Node) {
    element.appendChild(child)
  } else {
    logger.warn('Unknown child type', { type: typeof child, value: child })
  }
}

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
 * Internal HTM template function
 * @private
 */
const htmBound = htm.bind(h)


/**
 * Generate a unique cache-busting key for component instances
 */
let instanceCounter = 0
const getInstanceKey = () => `__rain_instance_${++instanceCounter}`

/**
 * HTM template function for creating reactive DOM elements
 * Automatically adds cache-busting for component isolation
 * @type {(strings: TemplateStringsArray, ...values: any[]) => Element}
 * @example html`<div>Hello ${name}</div>`
 */
function html(strings, ...values) {
  // Add a unique cache-buster to prevent HTM from reusing DOM elements between component instances
  const modifiedStrings = [...strings]
  modifiedStrings[modifiedStrings.length - 1] += `<!-- ${getInstanceKey()} -->`
  
  return htmBound(modifiedStrings, ...values)
}

/**
 * Renders conditional content based on signal value with smart matching
 * @param {() => any} valueSignal - Signal function containing the value to match against
 * @param {Object<string|number, () => Element>} cases - Object mapping values to render functions
 * @param {() => Element} [fallback] - Optional fallback render function for unmatched values
 * @returns {Element} Container element with conditionally rendered content
 * @example
 * // Basic usage
 * match(status, {
 *   'loading': () => html`<div>Loading...</div>`,
 *   'success': () => html`<div>Success!</div>`,
 *   'error': () => html`<div>Error occurred</div>`
 * })
 *
 * // With fallback
 * match(status, {
 *   'active': () => html`<span class="active">●</span>`,
 *   'inactive': () => html`<span class="inactive">○</span>`
 * }, () => html`<span class="unknown">?</span>`)
 */
function match(valueSignal, cases, fallback) {
  if (typeof valueSignal !== 'function' || !valueSignal[SIGNAL_SYMBOL]) {
    throw new Error('match() expects a signal as first argument')
  }

  if (!cases || typeof cases !== 'object') {
    throw new Error('match() expects an object of cases as second argument')
  }

  const container = document.createElement('div')
  container.style.display = 'contents'

  let currentElement = null

  const cleanup = effect(() => {
    const value = valueSignal()
    const key = String(value)

    // Remove current element if exists
    if (currentElement && currentElement.parentNode === container) {
      currentElement.remove()
    }

    let renderFn = cases[key]
    if (!renderFn && fallback) {
      renderFn = fallback
    }

    if (renderFn && typeof renderFn === 'function') {
      try {
        const element = renderFn()
        if (!element || !(element instanceof Node)) {
          throw new Error(`match() render function must return a DOM Node, got ${typeof element}`)
        }
        container.appendChild(element)
        currentElement = element
      } catch (error) {
        logger.error('match() render function failed:', error)
        const errorElement = document.createTextNode('Match render error')
        container.appendChild(errorElement)
        currentElement = errorElement
      }
    } else {
      // No matching case and no fallback
      currentElement = null
    }
  })

  container._listCleanup = cleanup
  return container
}

/**
 * Renders reactive lists with smart reconciliation
 * @param {() => any[]} itemsSignal - Signal function containing array data
 * @param {(item: any, index: number) => Element} renderFn - Function to render each item
 * @param {(item: any, index: number) => string | number} [keyFn] - Optional key extraction function
 * @returns {Element} Container element with rendered list items
 * @example
 * // With keyed reconciliation (recommended)
 * list(items, item => html`<li>${item.name}</li>`, item => item.id)
 *
 * // Simple re-render (no keys)
 * list(items, item => html`<li>${item.name}</li>`)
 */
function list(itemsSignal, renderFn, keyFn) {
  const container = document.createElement('div')
  container.style.display = 'contents'
  container._listCleanup = true

  let cleanup = null

  if (keyFn) {
    const nodeMap = new Map()

    cleanup = effect(() => {
      const items = itemsSignal() // Always expect $() tuple function
      if (!Array.isArray(items)) return

      listLogger.debug('List reconciliation triggered', {
        itemCount: items.length,
        containerChildren: container.children.length,
        hasParent: !!container.parentNode
      })

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
        listLogger.warn('Invalid or duplicate keys detected, falling back to full re-render')
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
      let created = 0
      let moved = 0
      let removed = 0

      const shouldLogDetails = isDebugEnabled() && window.RAIN_LOG_LEVEL >= 3

      if (shouldLogDetails) {
        listLogger.group('Smart reconciliation starting')
        listLogger.debug('Reconciliation state', {
          itemCount: items.length,
          domChildren: container.children.length,
          keyCount: keys.length
        })
      }

      const reconcileStart = performance.now()

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
          created++
        }

        desiredNodes.push(node)
      })

      const currentNodes = Array.from(container.children)

      if (shouldLogDetails) {
        listLogger.debug('Node reconciliation', {
          desired: desiredNodes.length,
          current: currentNodes.length
        })
      }

      currentNodes.forEach(node => {
        if (node.parentNode === container) {
          container.removeChild(node)
        }
      })

      desiredNodes.forEach((node, _i) => {
        container.appendChild(node)
        const wasInCurrentNodes = currentNodes.includes(node)
        if (wasInCurrentNodes) {
          moved++
        } else {
          // This is a newly created node (already counted above)
        }
      })

      for (const [key, node] of nodeMap) {
        if (!usedNodes.has(key)) {
          if (node.parentNode === container) {
            node.remove()
          }
          nodeMap.delete(key)
          removed++
        }
      }

      if (shouldLogDetails) {
        listLogger.perf('Smart reconciliation', reconcileStart, {
          operations: { created, moved, removed },
          finalChildren: container.children.length
        })
        listLogger.groupEnd()
      }
    })
  } else {
    cleanup = effect(() => {
      const items = itemsSignal() // Always expect $() tuple function
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

  logger.error('render() expects a DOM node or function returning DOM node')
  return { dispose: () => {} }
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
 * const count = $(0);
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
 * @example
 * const [count] = $(0);
 * $.effect(() => document.title = `Count: ${count()}`);
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
 * @example
 * $.listen('user-changed', (e) => setUser(e.detail))
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

export { $, html, render, list, match }
