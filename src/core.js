/**
 * @fileoverview RainWC Core - Reactive system and utilities
 */

import { signal, computed, effect } from '@preact/signals-core'

const SIGNAL_SYMBOL = Symbol.for('rain.signal')

/**
 * Checks if a value is a reactive signal created by this framework
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a reactive signal
 * @private
 */
function isReactive(value) {
  return typeof value === 'function' && value[SIGNAL_SYMBOL]
}

/**
 * Creates a reactive signal with tuple return
 * @template T
 * @param {T} initialValue
 * @returns {[() => T, (value: T) => void]}
 * @example
 * const [count, setCount] = $(0)
 * setCount(5)
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
 * Creates a computed signal that updates when dependencies change
 * @template T
 * @param {() => T} computation
 * @returns {() => T}
 * @example
 * const doubled = $.computed(() => count() * 2)
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
 * @param {() => void} fn
 * @returns {() => void}
 * @example
 * $.effect(() => document.title = `Count: ${count()}`)
 */
$.effect = function(fn) {
  if (typeof fn !== 'function') {
    throw new Error('$.effect expects a function, got ' + typeof fn)
  }
  return effect(fn)
}

/**
 * Listen for custom events with automatic cleanup
 * @param {string} eventName
 * @param {(event: CustomEvent) => void} handler
 * @param {EventTarget} [target=document]
 * @returns {() => void}
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
 * Emit custom events
 * @param {string} eventName
 * @param {any} [detail]
 * @param {EventTarget} [target]
 * @example
 * $.emit('value-changed', { value: newValue })
 */
$.emit = function(eventName, detail, target) {
  if (typeof eventName !== 'string') {
    throw new Error('$.emit expects eventName to be a string')
  }

  const emitter = target || document

  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    composed: true
  })

  emitter.dispatchEvent(event)
}

/**
 * Conditional rendering based on signal value
 * @param {() => any} conditionSignal - Signal function containing the condition
 * @param {() => Element} trueFn - Function to render when truthy
 * @param {() => Element} [falseFn] - Optional function to render when falsy
 * @returns {DocumentFragment} Invisible document fragment that manages conditional content
 * @example
 * $.if(isLoading, () => <div>Loading...</div>)
 */
$.if = function(conditionSignal, trueFn, falseFn) {
  if (typeof conditionSignal !== 'function' || !conditionSignal[SIGNAL_SYMBOL]) {
    throw new Error('$.if() expects a signal as first argument')
  }

  // Use DocumentFragment - truly invisible and gets dissolved when appended
  const fragment = document.createDocumentFragment()
  let currentElement = null

  const cleanup = effect(() => {
    const condition = conditionSignal()

    // Remove current element if it exists
    if (currentElement && currentElement.parentNode) {
      currentElement.remove()
      currentElement = null
    }

    const renderFn = condition ? trueFn : falseFn
    if (renderFn && typeof renderFn === 'function') {
      const element = renderFn()
      if (element && element instanceof Node) {
        fragment.appendChild(element)
        currentElement = element
      }
    }
  })

  fragment._listCleanup = cleanup
  return fragment
}

/**
 * Renders reactive lists with optional keyed reconciliation
 * @param {() => any[]} itemsSignal
 * @param {(item: any, index: number) => Element} renderFn
 * @param {(item: any, index: number) => string | number} [keyFn]
 * @returns {Element}
 * @example
 * $.list(items, item => <li>{item.name}</li>, item => item.id)
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
 * Creates HTML from string - SECURITY WARNING: bypasses XSS protection
 * Only use with trusted content as this directly sets innerHTML
 * @param {string} html - HTML string to parse
 * @returns {DocumentFragment} Document fragment containing parsed HTML nodes
 * @example
 * $.DHTML('<p>Hello <strong>World</strong></p>')
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

/**
 * Removes all child elements from a container, respecting list cleanup markers
 * @param {Element} container - Container element to clean up
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
 * Renders an element or element factory function to a container with automatic cleanup
 * @param {Element | (() => Element)} elementOrFn - Element or function that returns an element
 * @param {Element} container - Target DOM container to render into
 * @returns {{dispose: () => void}} Object with dispose method for cleanup
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
 * Creates reactive CSS from template literal
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {() => Element}
 * @example
 * const styles = css`.container { background: ${bgColor}; }`
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

export { $, SIGNAL_SYMBOL, isReactive, render, css }
