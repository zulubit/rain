/**
 * @fileoverview RainWC Component System
 */

import { render, $ } from './core.js'

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
        template = () => {
          const errorDiv = document.createElement('div')
          errorDiv.style.color = 'red'
          errorDiv.style.padding = '1rem'
          errorDiv.textContent = `Component "${name}" failed to render. Check console for details.`
          return errorDiv
        }
      }

      currentInstance = null

      let templateResult
      try {
        if (typeof template !== 'function') {
          const errorMsg = `Component "${name}" factory must return a function, not ${typeof template}. ` +
            'Did you mean: return () => <YourJSX/> instead of return <YourJSX/>?'
          throw new TypeError(errorMsg)
        }
        templateResult = template()
      } catch (error) {
        console.error(`Component error in ${name} during render:`, error)
        const errorDiv = document.createElement('div')
        errorDiv.style.color = 'red'
        errorDiv.style.padding = '1rem'
        errorDiv.textContent = `Component "${name}" failed to render. Check console for details.`
        templateResult = errorDiv
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

  ComponentClass._propNames = propNames

  return ComponentClass
}

let currentInstance

/**
 * Defines a reactive web component with closed shadow DOM
 * @param {string} name
 * @param {string[] | Function} propNames
 * @param {Function} [factory]
 * @returns {boolean}
 * @example
 * rain('my-button', ['label'], function(props) {
 *   return () => <button>{props.label()}</button>
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
 *   return () => <div>{props.title()}</div>
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

export { rain, onMounted, onUnmounted }
