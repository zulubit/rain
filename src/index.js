/**
 * @fileoverview RainWC - Reactive Web Components with JSX
 */

// Core exports - reactive primitives
export { $, css, render } from './core.js'

// JSX exports (Fragment is internal - use <></> syntax)
export { jsx, jsx as h } from './jsx.js'

// Component system exports  
export { rain, onMounted, onUnmounted } from './component.js'