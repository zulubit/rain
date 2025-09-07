/**
 * @fileoverview RainJS Component System
 */

import { html, render, $ } from './core.js'

/**
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
 * @param {HTMLElement} component
 * @private
 */
function setupLifecycleHooks(component) {
  component._m = []
  component._um = []
}

/**
 * @param {HTMLElement} component
 * @private
 */
function setupMemoryManagement(component) {
  component._cleanups = new Set()
}

/**
 * @param {string} name
 * @param {string[]} propNames
 * @param {Function} factory
 * @param {'open' | 'closed'} shadowMode
 * @returns {typeof HTMLElement}
 * @private
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

      // Auto-adopt stylesheet if enabled
      if (autoAdoptEnabled) {
        scanAndAdoptStylesheet().then(stylesheet => {
          if (stylesheet) {
            root.adoptedStyleSheets = [...root.adoptedStyleSheets, stylesheet]
          }
        }).catch(() => {
          // Silently fail
        })
      }

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

  ComponentClass._propNames = propNames

  return ComponentClass
}

let currentInstance

/**
 * Auto-adoption state and cache
 */
let autoAdoptEnabled = false
let autoAdoptStylesheet = null

/**
 * Scans document head for first stylesheet marked with data-rain-adopt
 * @returns {Promise<CSSStyleSheet|null>} The adopted stylesheet or null
 * @private
 */
async function scanAndAdoptStylesheet() {
  if (autoAdoptStylesheet !== null) {
    return autoAdoptStylesheet
  }

  try {
    const link = document.head.querySelector('link[data-rain-adopt][href]')

    if (link) {
      const response = await fetch(link.href)
      if (response.ok) {
        const cssText = await response.text()
        const sheet = new CSSStyleSheet()
        await sheet.replace(cssText)
        autoAdoptStylesheet = sheet
        return sheet
      }
    }
  } catch (error) {
    // Silently fail
    if (typeof window !== 'undefined' && window.RAIN_DEBUG) {
      console.log('[Rain:AutoAdopt] Failed to load stylesheet:', error.message)
    }
  }

  autoAdoptStylesheet = false // Mark as attempted but failed
  return null
}

/**
 * Defines a reactive web component with closed shadow DOM
 * @param {string} name
 * @param {string[] | Function} propNames
 * @param {Function} [factory]
 * @returns {boolean}
 * @example
 * rain('my-button', ['label'], function(props) {
 *   return () => html`<button>${props.label()}</button>`
 * })
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
 * @param {string} name
 * @param {string[] | Function} propNames
 * @param {Function} [factory]
 * @returns {boolean}
 * @example
 * rain.open('my-card', ['title'], function(props) {
 *   return () => html`<div>${props.title()}</div>`
 * })
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
 * Enables automatic adoption of stylesheets marked with data-rain-adopt
 * @example
 * rain.autoAdopt() // Enable for all components
 */
rain.autoAdopt = function() {
  autoAdoptEnabled = true
}

/**
 * Reset auto-adopt state - for testing only
 * @private
 */
rain._resetAutoAdopt = function() {
  autoAdoptEnabled = false
  autoAdoptStylesheet = null
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
    throw new Error('getShadowRoot() called outside component factory')
  }
  if (!currentInstance._root) {
    throw new Error('Component has no shadow root')
  }
  return currentInstance._root
}

export { rain, onMounted, onUnmounted, getShadowRoot }
