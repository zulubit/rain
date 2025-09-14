/**
 * @fileoverview RainJS Component System
 */

import { render, $ } from './core.js'
import { logError, throwError } from './error-utils.js'

/**
 * @private
 * @param {string} name
 * @param {string[]|Function} propNames
 * @param {Function} [factory]
 */
function validateRainParams(name, propNames, factory) {
  if (typeof propNames === 'function') {
    factory = propNames
    propNames = []
  }

  if (!name || typeof name !== 'string') {
    throwError('Component name is required and must be a string')
  }
  if (!factory || typeof factory !== 'function') {
    throwError('Component factory function is required')
  }
  if (propNames && !Array.isArray(propNames)) {
    throwError('Props must be an array of strings')
  }

  return { name, propNames: propNames || [], factory }
}

/**
 * @private
 * @param {HTMLElement} component
 */
function setupLifecycleHooks(component) {
  component._m = []
  component._um = []
  component._cleanups = []
}

/**
 * @private
 * @param {string} name
 * @param {string[]} propNames
 * @param {Function} factory
 * @returns {typeof HTMLElement}
 */
function createComponentClass(name, propNames, factory) {
  const ComponentClass = class extends HTMLElement {
    static get observedAttributes() {
      return this._propNames || []
    }

    constructor() {
      super()

      const componentPropNames = this.constructor._propNames

      const props = {}
      this._propSetters = {}

      for (const propName of componentPropNames || []) {
        const [getter, setter] = $(this.getAttribute(propName) || '')
        props[propName] = getter
        this._propSetters[propName] = setter
      }

      setupLifecycleHooks(this)

      currentInstance = this

      if (typeof window !== 'undefined') {
        window.__currentRainInstance = this
      }

      // Capture initial children before they're replaced
      this._initialChildren = Array.from(this.childNodes)

      this.emit = (eventName, detail) => {
        this.dispatchEvent(
          new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true
          })
        )
      }

      let template
      try {
        template = factory.call(this, props)
      } catch (error) {
        logError(`Component factory error in ${name}:`, error)
        template = () => document.createTextNode(`Component "${name}" error`)
      }

      currentInstance = null

      if (typeof window !== 'undefined') {
        window.__currentRainInstance = null
      }

      let templateResult
      try {
        templateResult = template()
      } catch (error) {
        logError(`Component render error in ${name}:`, error)
        templateResult = document.createTextNode(`Component "${name}" error`)
      }

      try {
        render(templateResult, this)
      } catch (renderError) {
        logError(`Component critical error in ${name}:`, renderError)
        this.textContent = `Error: ${name}`
      }

    }

    connectedCallback() {
      this._m?.forEach(cb => {
        try {
          cb()
        } catch (error) {
          logError(`Component ${this.tagName.toLowerCase()} mount error:`, error)
        }
      })
    }

    disconnectedCallback() {
      this._cleanups?.forEach(cleanup => {
        try {
          if (typeof cleanup === 'function') {
            cleanup()
          }
        } catch (error) {
          logError(`Component ${this.tagName.toLowerCase()} cleanup error:`, error)
        }
      })

      this._um?.forEach(cb => {
        try {
          cb()
        } catch (error) {
          logError(`Component ${this.tagName.toLowerCase()} unmount error:`, error)
        }
      })
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
      if (this._propSetters && this._propSetters[attrName]) {
        this._propSetters[attrName](newValue || '')
      }
    }
  }

  ComponentClass._propNames = propNames

  return ComponentClass
}

let currentInstance

/**
 * Defines a reactive web component without shadow DOM
 * @param {string} name - Component name (must include hyphen)
 * @param {string[] | Function} propNames - Array of prop names or factory
 * @param {Function} [factory] - Component factory
 * @returns {boolean}
 * @example
 * rain('my-button', ['label'], function(props) {
 *   return () => html`<button>${props.label()}</button>`
 * })
 * @example
 * // With typed props using JSDoc
 * rain('user-card', ['name', 'age'],
 *   /** @type {(props: {name: () => string, age: () => number}) => () => Element} *\/
 *   function(props) {
 *     return () => html`<div>${props.name()} is ${props.age()}</div>`
 *   }
 * )
 */
function rain(name, propNames, factory) {
  try {
    const { name: validatedName, propNames: validatedPropNames, factory: validatedFactory } = validateRainParams(name, propNames, factory)

    if (customElements.get(validatedName)) {
      return true
    }

    const ComponentClass = createComponentClass(validatedName, validatedPropNames, validatedFactory)
    customElements.define(validatedName, ComponentClass)
    return true
  } catch (error) {
    logError(`Failed to register component '${name}':`, error)
    return false
  }
}

/**
 * Registers a callback to run when component mounts
 * @param {() => void} cb
 * @example
 * onMounted(() => console.log('mounted'))
 */
function onMounted(cb) {
  if (!currentInstance) {
    console.warn('onMounted called outside component factory')
    return
  }
  (currentInstance._m ||= []).push(cb)
}

/**
 * Registers a callback to run when component unmounts
 * @param {() => void} cb
 * @example
 * onUnmounted(() => console.log('unmounted'))
 */
function onUnmounted(cb) {
  if (!currentInstance) {
    console.warn('onUnmounted called outside component factory')
    return
  }
  (currentInstance._um ||= []).push(cb)
}

/**
 * Gets the root element of the current component
 * @returns {HTMLElement} The component's root element
 * @example
 * const root = getRoot()
 * root.querySelector('button').focus()
 */
function getRoot() {
  if (!currentInstance) {
    throwError('getRoot() called outside component factory')
  }
  return currentInstance
}

/**
 * Gets the children passed to the component
 * @param {string} [slotName] - Optional slot name to filter by slot attribute
 * @returns {Node[]} Array of child nodes
 * @example
 * const children = getChildren()
 * const headerSlot = getChildren('header')
 */
function getChildren(slotName) {
  if (!currentInstance) {
    throwError('getChildren() called outside component factory')
  }
  if (!slotName) {
    return currentInstance._initialChildren || []
  }
  return (currentInstance._initialChildren || []).filter(child =>
    child.nodeType === 1 && child.getAttribute && child.getAttribute('slot') === slotName
  )
}

export { rain, onMounted, onUnmounted, getRoot, getChildren }
