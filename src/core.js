/**
 * @fileoverview RainJS Core - Reactive rendering and list reconciliation
 */

import { effect } from '@preact/signals-core'
import { $, SIGNAL_SYMBOL } from './signal-utils.js'
import { html, css } from './template-utils.js'
import { createList } from './list-utils.js'
import { throwError } from './error-utils.js'


/**
 * @private
 * @param {Element} container
 */
function cleanupContainer(container) {
  // Optimized cleanup: iterate backwards through live collection
  // to avoid index shifting issues when removing elements
  const children = container.children
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]
    if (!child._listCleanup) {
      container.removeChild(child)
    }
  }
}

/**
 * Renders elements to a container with cleanup
 * @param {Element | (() => Element)} elementOrFn
 * @param {Element} container
 * @returns {{dispose: () => void}}
 */
function render(elementOrFn, container) {
  if (!container || !container.appendChild) {
    throwError(`render() expects a DOM element as container, got ${typeof container}`)
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
    throwError('$.if() expects a signal as first argument')
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
  return createList(itemsSignal, renderFn, keyFn)
}

/**
 * Creates HTML from raw string (bypasses XSS protection)
 * @param {string} html
 * @returns {DocumentFragment}
 * @example
 * $.raw('<p>Hello <strong>World</strong></p>')
 */
$.raw = function(html) {
  if (typeof html !== 'string') {
    throwError('$.raw expects a string')
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
