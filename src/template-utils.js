/**
 * @fileoverview Template utilities for HTM and HTML templating
 */

import htm from 'htm'
import { effect } from '@preact/signals-core'
import { $, SIGNAL_SYMBOL, isReactive } from './signal-utils.js'
import { processAttribute, processChild } from './dom-utils.js'
import { throwError } from './error-utils.js'

/**
 * @param {string} type
 * @param {Object|null} props
 * @param {...any} children
 * @returns {Element}
 * @private
 */
function h(type, props, ...children) {
  if (typeof type !== 'string' || !type) {
    throwError(`Invalid element type: ${type}`)
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
export function html(strings, ...values) {
  const modifiedStrings = [...strings]

  // Trim whitespace from the first and last template strings to prevent multiple root elements
  if (modifiedStrings.length > 0) {
    modifiedStrings[0] = modifiedStrings[0].trimStart()
    modifiedStrings[modifiedStrings.length - 1] = modifiedStrings[modifiedStrings.length - 1].trimEnd()
  }

  modifiedStrings[modifiedStrings.length - 1] += `<!-- ${getInstanceKey()} -->`

  const result = htmBound(modifiedStrings, ...values)

  // Check for multiple root elements
  if (Array.isArray(result)) {
    throwError('Multiple root elements are not allowed. Wrap your template in a single root element.')
  }

  return result
}

/**
 * Creates reactive CSS stylesheets using template literals
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {() => Element}
 */
export function css(strings, ...values) {
  if (!strings || !strings.raw) {
    throwError('css must be used as a template literal')
  }

  return $.computed(() => {
    const style = document.createElement('style')
    let result = ''

    for (let i = 0; i < strings.length; i++) {
      result += strings[i]
      if (i < values.length) {
        const value = values[i]
        result += typeof value === 'function' && value[SIGNAL_SYMBOL] ? value() : value
      }
    }

    style.textContent = result
    return style
  })
}
