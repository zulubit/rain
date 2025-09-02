/**
 * @fileoverview RainJS Component System - Web Components with reactive templates
 * @version 0.0.9
 */

import { html, render, $ } from './core.js'

/**
 * Validates rain component parameters
 * @private
 */
function validateRainParams(name, propNames, factory) {
  if (typeof propNames === 'function') {
    factory = propNames
    propNames = []
  }

  if (!name || typeof name !== 'string') {
    throw new Error('Component name is required and must be a string')
  }
  if (!factory || typeof factory !== 'function') {
    throw new Error('Component factory function is required')
  }
  if (propNames && !Array.isArray(propNames)) {
    throw new Error('Props must be an array of strings')
  }

  return { name, propNames: propNames || [], factory }
}

/**
 * Sets up lifecycle hook arrays for component
 * @param {HTMLElement} component - Component instance
 * @private
 */
function setupLifecycleHooks(component) {
  component._m = []
  component._um = []
}

/**
 * Sets up memory management for component
 * @param {HTMLElement} component - Component instance
 * @private
 */
function setupMemoryManagement(component) {
  component._cleanups = new Set()
}

/**
 * Creates the component class with all necessary methods
 * @param {string} name - Component name
 * @param {Record<string, any>} propDefs - Property definitions
 * @param {Function} factory - Factory function
 * @param {'open' | 'closed'} shadowMode - Shadow DOM mode
 * @returns {typeof HTMLElement} Component class
 * @private
 */
function createComponentClass(name, propNames, factory, shadowMode = 'closed') {
  const ComponentClass = class extends HTMLElement {
    static get observedAttributes() {
      return this._propNames || []
    }

    constructor() {
      super()

      // Get propNames from the class
      const componentPropNames = this.constructor._propNames

      // Create signal tuples directly from propNames
      const props = {}
      this._propSetters = {}

      for (const propName of componentPropNames || []) {
        const [getter, setter] = $(this.getAttribute(propName) || '')
        props[propName] = getter
        this._propSetters[propName] = setter
      }

      setupLifecycleHooks(this)
      setupMemoryManagement(this)

      // Create shadow DOM in constructor
      const root = this.attachShadow({ mode: shadowMode })

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
        console.error(`Component error in ${name} during factory:`, error)
        template = () => html`<div style="color: red; padding: 1rem;">
          Component "${name}" failed to render. Check console for details.
        </div>`
      }

      currentInstance = null

      // Render template immediately
      let templateResult
      try {
        templateResult = template()
      } catch (error) {
        console.error(`Component error in ${name} during render:`, error)
        templateResult = html`<div style="color: red; padding: 1rem;">
          Component "${name}" failed to render. Check console for details.
        </div>`
      }

      try {
        render(templateResult, root)
      } catch (renderError) {
        console.error(`Component error in ${name} during render-critical:`, renderError)
        root.innerHTML = `<div style="padding: 1rem; background: #fee; border: 1px solid #fcc;">
          <strong style="color: #c00;">Critical Render Error: ${name}</strong>
        </div>`
      }

      this._root = root
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
          console.error(`Component error in ${this.tagName.toLowerCase()} during connected:`, error)
        }
      })
    }

    disconnectedCallback() {
      this._cleanups?.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          try {
            cleanup()
          } catch (error) {
            console.error(`Component error in ${this.tagName.toLowerCase()} during cleanup:`, error)
          }
        }
      })

      this._um?.forEach(cb => {
        try {
          cb()
        } catch (error) {
          console.error(`Component error in ${this.tagName.toLowerCase()} during unmount:`, error)
        }
      })
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
      if (this._propSetters && this._propSetters[attrName]) {
        this._propSetters[attrName](newValue || '')
      }
    }
  }

  // Set the propNames on the class
  ComponentClass._propNames = propNames

  return ComponentClass
}

/**
 * @typedef RainComponent
 * @property {import('@preact/signals-core').Signal} _propsSignal - Reactive props signal
 * @property {(eventName: string, detail?: any) => void} emit - Emit custom events
 * @property {(() => void)[]} [_m] - Mounted hooks
 * @property {(() => void)[]} [_um] - Unmounted hooks
 */

/**
 * @typedef {HTMLElement & RainComponent} RainHTMLElement
 */

/** @type {RainComponent | null} */
let currentInstance

/**
 * Defines a reactive web component with built-in state management and styling
 * Uses closed shadow DOM by default for complete encapsulation
 * @param {string} name - Custom element tag name (must contain hyphen)
 * @param {string[] | Function} propNames - Array of prop names, or factory function
 * @param {Function} [factory] - Component factory function returning template function
 * @returns {boolean} True if component was successfully registered
 * @throws {Error} When name or factory is invalid
 * @example
 * // Component with props
 * rain('my-button', ['label', 'disabled'], function(props) {
 *   return () => html`<button disabled=${props.disabled()}>${props.label()}</button>`;
 * });
 *
 * // Component without props
 * rain('my-card', function() {
 *   return () => html`<div class="card">Hello</div>`;
 * });
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

    const ComponentClass = createComponentClass(validatedName, validatedPropNames, validatedFactory, 'closed')
    customElements.define(validatedName, ComponentClass)
    return true
  } catch (error) {
    console.error(`Failed to register component '${name}':`, error)
    return false
  }
}

/**
 * Defines a reactive web component with open shadow DOM
 * @param {string} name - Custom element tag name (must contain hyphen)
 * @param {string[] | Function} propNames - Array of prop names, or factory function
 * @param {Function} [factory] - Component factory function returning template function
 * @returns {boolean} True if component was successfully registered
 * @throws {Error} When name or factory is invalid
 * @example
 * rain.open('my-card', ['title'], function(props) {
 *   return () => html`<div class="card">${props.title()}</div>`;
 * });
 */
rain.open = function(name, propNames, factory) {
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
    console.error(`Failed to register component '${name}':`, error)
    return false
  }
}

/**
 * Registers a callback to run after component is mounted to DOM
 * @param {() => void} cb - Callback function to execute
 * @example
 * rain('my-component', function() {
 *   onMounted(() => console.log('Component mounted'));
 *   return () => html`<div>Hello</div>`;
 * });
 */
function onMounted(cb) {
  if (!currentInstance) {
    console.warn('onMounted called outside component factory')
    return
  }
  (currentInstance._m ||= []).push(cb)
}

/**
 * Registers a callback to run when component is removed from DOM
 * @param {() => void} cb - Callback function to execute
 * @example
 * rain('my-component', function() {
 *   onUnmounted(() => console.log('Component unmounted'));
 *   return () => html`<div>Hello</div>`;
 * });
 */
function onUnmounted(cb) {
  if (!currentInstance) {
    console.warn('onUnmounted called outside component factory')
    return
  }
  (currentInstance._um ||= []).push(cb)
}

export { rain, onMounted, onUnmounted }
