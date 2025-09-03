/**
 * @fileoverview RainWC - Reactive Web Components with JSX
 */

// Inject FOUC prevention CSS immediately when framework is imported
if (typeof document !== 'undefined' && !document.querySelector('#rainwc-fouc-styles')) {
  const style = document.createElement('style')
  style.id = 'rainwc-fouc-styles'
  style.textContent = `
    /* RainWC FOUC Prevention - hides undefined custom elements */
    :not(:defined) {
      visibility: hidden;
    }
  `
  document.head.appendChild(style)
}

// Core exports - reactive primitives
export { $, css, render } from './core.js'

// JSX exports
export { jsx, jsx as h, Fragment } from './jsx.js'

// Component system exports
export { rain, onMounted, onUnmounted } from './component.js'
