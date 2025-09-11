/**
 * @fileoverview DOM manipulation utilities for RainWC
 */

import { effect } from '@preact/signals-core'
import { isReactive } from './signal-utils.js'

/**
 * Sets an element's property or attribute based on the key and value
 * @param {Element} element
 * @param {string} key
 * @param {any} val
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
 * Handles reactive values for both properties and attributes
 * @param {Element} element
 * @param {string} key
 * @param {any} value
 * @param {boolean} isProperty - true for properties (.), false for attributes
 */
function handleReactiveValue(element, key, value, isProperty = false) {
  if (isReactive(value)) {
    effect(() => {
      if (isProperty) {
        element[key] = value()
      } else {
        setElementValue(element, key, value())
      }
    })
  } else {
    if (isProperty) {
      element[key] = value
    } else {
      setElementValue(element, key, value)
    }
  }
}

/**
 * Processes an attribute or property on an element, handling events and reactive values
 * @param {Element} element
 * @param {string} key
 * @param {any} value
 */
function processAttribute(element, key, value) {
  if (key.startsWith('@') && typeof value === 'function') {
    const eventName = key.slice(1)
    element.addEventListener(eventName, value)
  } else if (key.startsWith('.')) {
    const propName = key.slice(1)
    handleReactiveValue(element, propName, value, true)
  } else {
    handleReactiveValue(element, key, value, false)
  }
}

/**
 * Processes a child element, handling reactive content
 * @param {Element} element
 * @param {any} child
 */
function processChild(element, child) {
  if (child == null) return

  if (typeof child === 'string' || typeof child === 'number') {
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

export {
  processAttribute,
  processChild
}
