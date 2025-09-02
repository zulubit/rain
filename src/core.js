/**
 * @fileoverview RainJS Core - Reactive templates with HTM and Preact signals
 * @version 0.0.9
 */

import htm from 'htm'
import { signal, computed, effect } from '@preact/signals-core'

const SIGNAL_SYMBOL = Symbol('rain.signal')

/**
 * @param {any} value
 * @returns {boolean}
 * @private
 */
function isReactive(value) {
  return typeof value === 'function' && value[SIGNAL_SYMBOL]
}

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
 * @param {string} type
 * @param {Object|null} props
 * @param {...any} children
 * @returns {Element}
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

  const element = document.createElement(type)
  let selectValueSignal = null

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
 * @param {Element} element
 * @param {any} child
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

const htmBound = htm.bind(h)

let instanceCounter = 0
const getInstanceKey = () => ++instanceCounter

/**
 * HTM template function for creating reactive DOM elements
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {Element}
 * @example html`<div>Hello ${name}</div>`
 */
function html(strings, ...values) {
  const modifiedStrings = [...strings]
  modifiedStrings[modifiedStrings.length - 1] += `<!-- ${getInstanceKey()} -->`

  return htmBound(modifiedStrings, ...values)
}

/**
 * @param {Element} container
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
 * Renders elements to a container with cleanup
 * @param {Element | (() => Element)} elementOrFn
 * @param {Element} container
 * @returns {{dispose: () => void}}
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

/**
 * Conditional rendering
 * @param {() => any} conditionSignal
 * @param {() => Element} trueFn
 * @param {() => Element} [falseFn]
 * @returns {Element}
 * @example
 * $.if(isLoading, () => html`<div>Loading...</div>`)
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
 * @param {() => any[]} itemsSignal
 * @param {(item: any, index: number) => Element} renderFn
 * @param {(item: any, index: number) => string | number} [keyFn]
 * @returns {Element}
 * @example
 * $.list(items, item => html`<li>${item.name}</li>`, item => item.id)
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
 * Creates HTML from string (bypasses XSS protection)
 * @param {string} html
 * @returns {DocumentFragment}
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

export { $, html, css }

export { render }
