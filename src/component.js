/**
 * @fileoverview RainJS Component System - Web Components with reactive templates
 * @version 0.0.6
 */

import { html, render, $ } from './core.js'
import { debugLog } from './utils.js'
import { createPropsManager } from './props.js'

/**
 * Logs component errors with contextual information
 * @param {Error} error - The error that occurred
 * @param {string} componentName - Name of the component
 * @param {string} phase - Lifecycle phase where error occurred
 * @private
 */
function logError(error, componentName, phase) {
  console.error(`Component error in ${componentName} during ${phase}:`, error)
}

/**
 * Validates rain component parameters
 * @param {string} name - Component name
 * @param {Record<string, any> | Function} propDefs - Property definitions or factory function
 * @param {Function} [factory] - Factory function
 * @returns {{name: string, propDefs: Record<string, any>, factory: Function}} Validated parameters
 * @throws {Error} When component name is invalid or missing
 * @throws {Error} When factory function is invalid or missing
 * @private
 */
function validateRainParams(name, propDefs, factory) {
  if (typeof propDefs === 'function') {
    factory = propDefs
    propDefs = {}
  }

  if (!name || typeof name !== 'string') {
    throw new Error('Component name is required and must be a string')
  }
  if (!factory || typeof factory !== 'function') {
    throw new Error('Component factory function is required')
  }

  return { name, propDefs: propDefs || {}, factory }
}

/**
 * Sets up error boundary and recovery mechanisms for component
 * @param {HTMLElement} component - Component instance
 * @param {string} name - Component name
 * @returns {{renderError: Function}} Error boundary methods
 * @private
 */
function setupErrorBoundary(component, name) {
  const renderError = (error) => {
    console.error(`Component error in ${name}:`, error)
    return html`<div style="color: red; padding: 1rem;">
      Component "${name}" failed to render. Check console for details.
    </div>`
  }

  return { renderError }
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
function createComponentClass(name, propDefs, factory, shadowMode = 'closed') {
  return class extends HTMLElement {
    static get observedAttributes() {
      // Create temporary props manager to get observed attributes
      const tempManager = createPropsManager(propDefs, {
        hasAttribute: () => false,
        getAttribute: () => null,
        tagName: name.toUpperCase()
      })
      return tempManager.observedAttributes
    }

    constructor() {
      super()

      this._propsManager = createPropsManager(propDefs, this)
      const initialProps = this._propsManager.getInitialProps()

      const [propsSignal, setPropsSignal] = $(initialProps)
      this._propsSignal = propsSignal
      this._setPropsSignal = setPropsSignal
      this._isInitializing = true

      this._propsManager.setupPropertyDescriptors(
        (name) => this._propsSignal()[name],
        (name, value) => {
          if (this._isInitializing) {
            const currentProps = this._propsSignal()
            currentProps[name] = value
          } else {
            const deferUpdate = () => {
              const newProps = { ...this._propsSignal() }
              newProps[name] = value
              this._setPropsSignal(newProps)
            }

            if (typeof queueMicrotask === 'function') {
              queueMicrotask(deferUpdate)
            } else {
              Promise.resolve().then(deferUpdate)
            }
          }
        }
      )

      setupLifecycleHooks(this)
      setupMemoryManagement(this)
      const { renderError } = setupErrorBoundary(this, name)

      this.renderError = renderError

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
        template = factory.call(this, propsSignal)
      } catch (error) {
        logError(error, name, 'factory')
        template = () => this.renderError(error)
      }

      // Mark initialization as complete after factory but before template render
      // This allows dot syntax props to work reactively during template rendering
      this._isInitializing = false
      currentInstance = null

      // Render template immediately
      let templateResult
      try {
        templateResult = template()
      } catch (error) {
        logError(error, name, 'render')
        templateResult = this.renderError(error)
      }

      try {
        render(templateResult, root)
      } catch (renderError) {
        logError(renderError, name, 'render-critical')
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
          logError(error, this.tagName.toLowerCase(), 'connected')
        }
      })
    }

    disconnectedCallback() {
      this._cleanups?.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          try {
            cleanup()
          } catch (error) {
            logError(error, this.tagName.toLowerCase(), 'cleanup')
          }
        }
      })

      this._um?.forEach(cb => {
        try {
          cb()
        } catch (error) {
          logError(error, this.tagName.toLowerCase(), 'unmount')
        }
      })
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
      const coercedValue = this._propsManager.handleAttributeChange(attrName, newValue)
      if (coercedValue !== null) {
        const newProps = { ...this._propsSignal() }
        newProps[attrName] = coercedValue
        this._setPropsSignal(newProps)
      }
    }
  }
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
 * @param {Record<string, any> | Function} propDefs - Property definitions object, or factory function
 * @param {Function} [factory] - Component factory function returning template function
 * @returns {boolean} True if component was successfully registered
 * @throws {Error} When name or factory is invalid
 * @example
 * // Closed shadow DOM (default)
 * rain('my-counter', function() {
 *   const [count, setCount] = $(0);
 *   return () => html`<button @click=${() => setCount(count() + 1)}>${count}</button>`;
 * });
 *
 * // Open shadow DOM
 * rain.open('my-card', function() {
 *   return () => html`<div class="card">Open shadow DOM</div>`;
 * });
 */
function rain(name, propDefs, factory) {
  try {
    const { name: validatedName, propDefs: validatedPropDefs, factory: validatedFactory } = validateRainParams(name, propDefs, factory)

    if (customElements.get(validatedName)) {
      debugLog('Component', `'${validatedName}' already defined, skipping`)
      return true
    }

    const ComponentClass = createComponentClass(validatedName, validatedPropDefs, validatedFactory, 'closed')
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
 * @param {Record<string, any> | Function} propDefs - Property definitions object, or factory function
 * @param {Function} [factory] - Component factory function returning template function
 * @returns {boolean} True if component was successfully registered
 * @throws {Error} When name or factory is invalid
 * @example
 * rain.open('my-card', function() {
 *   return () => html`<div class="card">Open shadow DOM allows external styling</div>`;
 * });
 */
rain.open = function(name, propDefs, factory) {
  try {
    const { name: validatedName, propDefs: validatedPropDefs, factory: validatedFactory } = validateRainParams(name, propDefs, factory)

    if (customElements.get(validatedName)) {
      debugLog('Component', `'${validatedName}' already defined, skipping`)
      return true
    }

    const ComponentClass = createComponentClass(validatedName, validatedPropDefs, validatedFactory, 'open')
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
