/**
 * @fileoverview RainJS Component System
 */

import { html, render, $ } from './core.js'
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
}

/**
 * @private
 * @param {HTMLElement} component
 */
function setupMemoryManagement(component) {
  component._cleanups = new Set()
}

/**
 * @private
 * @param {string} name
 * @param {string[]} propNames
 * @param {Function} factory
 * @param {'open'|'closed'} [shadowMode='closed']
 * @returns {typeof HTMLElement}
 */
function createComponentClass(name, propNames, factory, shadowMode = 'closed') {
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
      setupMemoryManagement(this)

      const root = this.attachShadow({ mode: shadowMode })
      this._root = root

      currentInstance = this

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
        template = () => html`<div style="color: red; padding: 1rem;">Component "${name}" error</div>`
      }

      currentInstance = null

      let templateResult
      try {
        templateResult = template()
      } catch (error) {
        logError(`Component render error in ${name}:`, error)
        templateResult = html`<div style="color: red; padding: 1rem;">Component "${name}" error</div>`
      }

      try {
        render(templateResult, root)
      } catch (renderError) {
        logError(`Component critical error in ${name}:`, renderError)
        root.innerHTML = `<div style="padding: 1rem; background: #fee; border: 1px solid #fcc;"><strong style="color: #c00;">Error: ${name}</strong></div>`
      }

      this._isMounted = false
    }

    _cleanupElement(element) {
      if (element._listCleanup && typeof element._listCleanup === 'function') {
        element._listCleanup()
        element._listCleanup = null
      }

      Array.from(element.children).forEach(child => {
        this._cleanupElement(child)
      })
    }

    connectedCallback() {
      this._isMounted = true

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
        if (typeof cleanup === 'function') {
          try {
            cleanup()
          } catch (error) {
            logError(`Component ${this.tagName.toLowerCase()} cleanup error:`, error)
          }
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
 * Defines a reactive web component with open shadow DOM (default)
 * @overload
 * @param {string} name - Component name (must include hyphen)
 * @param {string[]} propNames - Array of prop names
 * @param {(props: Record<string, () => any>) => () => Element} factory - Component factory
 * @returns {boolean}
 * 
 * @overload
 * @param {string} name - Component name (must include hyphen)
 * @param {(props: Record<string, () => any>) => () => Element} factory - Component factory
 * @returns {boolean}
 * 
 * @param {string} name
 * @param {string[] | Function} propNames
 * @param {Function} [factory]
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
      if (typeof window !== 'undefined' && window.RAIN_DEBUG) {
        console.log(`[Rain:Component] '${validatedName}' already defined, skipping`)
      }
      return true
    }

    const ComponentClass = createComponentClass(validatedName, validatedPropNames, validatedFactory, 'open')
    customElements.define(validatedName, ComponentClass)
    return true
  } catch (error) {
    logError(`Failed to register component '${name}':`, error)
    return false
  }
}

/**
 * Defines a reactive web component with closed shadow DOM
 * @param {string} name - Component name (must include hyphen)
 * @param {string[] | (props: Record<string, () => any>) => () => Element} propNames - Array of prop names or factory
 * @param {(props: Record<string, () => any>) => () => Element} [factory] - Component factory
 * @returns {boolean}
 * @example
 * rain.closed('secure-component', ['data'], function(props) {
 *   return () => html`<div>${props.data()}</div>`
 * })
 */
rain.closed = function(name, propNames, factory) {
  try {
    const { name: validatedName, propNames: validatedPropNames, factory: validatedFactory } = validateRainParams(name, propNames, factory)

    if (customElements.get(validatedName)) {
      if (typeof window !== 'undefined' && window.RAIN_DEBUG) {
        console.log(`[Rain:Component] '${validatedName}' already defined, skipping`)
      }
      return true
    }

    const ComponentClass = createComponentClass(validatedName, validatedPropNames, validatedFactory, 'closed')
    customElements.define(validatedName, ComponentClass)
    return true
  } catch (error) {
    logError(`Failed to register component '${name}':`, error)
    return false
  }
}

/**
 * Helper to create and adopt stylesheet from CSS string
 * @param {string} css - CSS string to adopt
 * @example
 * import styles from './theme.css?inline'
 * rain.adopt(styles)
 */
rain.adopt = function(css) {
  if (!currentInstance) {
    throwError('rain.adopt() can only be called within component factory')
  }
  if (!currentInstance._root) {
    throwError('Component has no shadow root')
  }
  if (typeof css !== 'string') {
    throwError('rain.adopt() expects a CSS string')
  }

  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)

  const existingSheets = currentInstance._root.adoptedStyleSheets || []
  currentInstance._root.adoptedStyleSheets = [...existingSheets, sheet]
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
 * Gets the shadow root of the current component
 * @returns {ShadowRoot} The component's shadow root
 * @example
 * const root = getShadowRoot()
 * root.adoptedStyleSheets = [myStyleSheet]
 */
function getShadowRoot() {
  if (!currentInstance) {
    throwError('getShadowRoot() called outside component factory')
  }
  if (!currentInstance._root) {
    throwError('Component has no shadow root')
  }
  return currentInstance._root
}

export { rain, onMounted, onUnmounted, getShadowRoot }
