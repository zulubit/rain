# API Reference

Complete reference for RainWC functions and utilities.

## Imports

```javascript
// Core functions
import { $, html, css, render } from 'rainwc'

// Component system
import { rain, onMounted, onUnmounted, getShadowRoot } from 'rainwc'

// Everything
import { $, html, css, render, rain, onMounted, onUnmounted, getShadowRoot } from 'rainwc'
```

## Core Functions

### `$(initialValue)`
Creates a reactive signal with getter/setter tuple.

```javascript
const [count, setCount] = $(0)
const [user, setUser] = $({ name: 'Alice' })
```

**Returns**: `[getter, setter]` tuple
- `getter()` - returns current value
- `setter(newValue)` - updates value

### `$.computed(fn)`
Creates a computed signal that updates when dependencies change.

```javascript
const doubled = $.computed(() => count() * 2)
const fullName = $.computed(() => `${first()} ${last()}`)
```

**Parameters**:
- `fn: () => T` - computation function

**Returns**: `() => T` - readonly computed accessor

### `$.effect(fn)`
Runs side effects when dependencies change.

```javascript
$.effect(() => {
  document.title = `Count: ${count()}`
})
```

**Parameters**:
- `fn: () => void` - effect function

**Returns**: `() => void` - cleanup function

### `$.listen(eventName, handler, target?)`
Listens for custom events with automatic cleanup.

```javascript
// Listen globally
$.listen('user-changed', (e) => {
  setUser(e.detail.user)
})

// Listen on specific element
$.listen('click', handleClick, button)
```

**Parameters**:
- `eventName: string` - event name to listen for
- `handler: (event: CustomEvent) => void` - event handler function
- `target?: EventTarget` - target to listen on (defaults to document)

**Returns**: `() => void` - cleanup function

### `$.emit(eventName, detail?, target?)`
Emits custom events with consistent API.

```javascript
// Emit global event
$.emit('user-changed', { user: newUser })

// Emit on specific element
$.emit('custom-event', { data: 'value' }, element)
```

**Parameters**:
- `eventName: string` - event name to emit
- `detail?: any` - event detail data (optional)
- `target?: EventTarget` - target to emit from (defaults to document)

### `$.batch(fn)`
Batches signal updates to avoid multiple re-renders.

```javascript
// Multiple signal updates in one batch
const [name, setName] = $('John')
const [age, setAge] = $(30)
const [email, setEmail] = $('john@example.com')

$.batch(() => {
  setName('Alice')
  setAge(25) 
  setEmail('alice@example.com')
  // Only triggers one re-render for all three changes
})

// With return value
const result = $.batch(() => {
  updateUser(userData)
  return computeTotal()
})
```

**Parameters**:
- `fn: () => T` - function containing signal updates

**Returns**: `T` - return value of the batched function

### `css`
Creates reactive CSS stylesheets using template literals.

```javascript
rain('styled-component', function() {
  const [theme, setTheme] = $('light')
  
  const bgColor = $.computed(() => 
    theme() === 'dark' ? '#333' : '#fff'
  )
  
  const styles = css`
    .container {
      background: ${bgColor};
      padding: 1rem;
      border-radius: 8px;
    }
  `
  
  return () => html`
    <div class="container">
      ${styles}
      <p>Theme: ${theme}</p>
      <button @click=${() => setTheme(theme() === 'light' ? 'dark' : 'light')}>Toggle</button>
    </div>
  `
})
```

**Parameters**:
- Template literal with CSS and reactive interpolations

**Returns**: `() => Element` - computed signal returning `<style>` element

**Notes**:
- Must be used as template literal: `css\`...\``
- Supports reactive values through computed signals
- Returns new `<style>` element on each call
- CSS is automatically scoped within Shadow DOM

## Component System

### `rain(name, factory)`
### `rain(name, propNames, factory)`
Registers a Web Component with open shadow DOM (default).

```javascript
// Simple component
rain('my-button', function() {
  return () => html`<button>Click me</button>`
})

// Component with props
rain('user-card', ['name', 'age'], function(props) {
  return () => html`
    <div>
      <h3>${props.name() || 'Anonymous'}</h3>
      <p>Age: ${props.age() || '0'}</p>
    </div>
  `
})
```

**Parameters**:
- `name: string` - component tag name (must contain hyphen)
- `propNames?: string[]` - array of observed attribute names (optional)
- `factory: function` - component factory function

**Returns**: `boolean` - success status

### `rain.closed(name, factory)`
### `rain.closed(name, propNames, factory)`
Registers a Web Component with closed shadow DOM (restricts external JavaScript access).

```javascript
rain.closed('secure-component', ['data'], function(props) {
  return () => html`<div>${props.data()}</div>`
})
```

**Parameters**: Same as `rain()`
**Returns**: `boolean` - success status



### `getShadowRoot()`
Gets the shadow root of the current component - only callable within component factory functions.

```javascript
rain('my-component', function() {
  const root = getShadowRoot()
  
  // Manually add stylesheets
  root.adoptedStyleSheets = [myStyleSheet]
  
  return () => html`<div>Content</div>`
})
```

**Returns**: `ShadowRoot` - the component's shadow root

**Throws**: 
- Error if called outside component factory
- Error if component has no shadow root

**Use Cases**:
- Manual stylesheet adoption
- Direct shadow DOM manipulation
- Integration with third-party libraries that need shadow root access

## CSS Styling

### Preventing Flash of Unstyled Content (FOUC)

To prevent unstyled content from appearing while components are loading, add this CSS to your HTML head:

```html
<head>
  <!-- Prevent FOUC - hide undefined custom elements -->
  <style>
    :not(:defined) {
      visibility: hidden;
    }
    :not(:defined) * {
      visibility: hidden;
    }
  </style>
  <!-- Your other head content -->
</head>
```

This hides all undefined custom elements and their children until they are registered and upgraded by the browser.

### `rain.adopt(css)`
Helper function to create and adopt stylesheets from CSS strings - only callable within component factory functions.

```javascript
// Import CSS as text using ?inline parameter
import styles from './theme.css?inline'

rain('themed-button', function() {
  // Adopt stylesheet using helper
  rain.adopt(styles)
  
  return () => html`<button class="primary">Styled Button</button>`
})
```

**Parameters**:
- `css: string` - CSS string to create stylesheet from

**Throws**:
- Error if called outside component factory
- Error if component has no shadow root
- Error if css parameter is not a string

**Benefits**:
- Clean integration with Vite's build system
- CSS is processed and bundled normally  
- No runtime fetching or parsing needed
- Type-safe imports with proper IDE support
- Concise helper eliminates boilerplate code

### Manual Stylesheet Control
For more control, use `getShadowRoot()` to manually manage stylesheets:

```javascript
rain('custom-styled', function() {
  const root = getShadowRoot()
  
  // Create custom stylesheet
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(`
    .custom { 
      color: blue; 
      font-weight: bold; 
    }
  `)
  
  // Adopt it
  root.adoptedStyleSheets = [sheet]
  
  return () => html`<div class="custom">Custom styled content</div>`
})
```

### Reactive CSS
Use the `css` template function for dynamic, reactive styles:

```javascript
rain('dynamic-theme', function() {
  const [isDark, setIsDark] = $(false)
  
  const styles = css`
    .container {
      background: ${() => isDark() ? '#333' : '#fff'};
      color: ${() => isDark() ? '#fff' : '#333'};
      padding: 1rem;
    }
  `
  
  return () => html`
    <div class="container">
      ${styles}
      <button @click=${() => setIsDark(!isDark())}>
        ${() => isDark() ? 'Light' : 'Dark'} Theme
      </button>
    </div>
  `
})
```

## Template System

### `html`
HTM template function for creating reactive DOM elements.

```javascript
html`<div>Hello ${name}</div>`
html`<button @click=${handler}>Click</button>`
```

**Returns**: `Element` - DOM element

### `$.if(conditionSignal, trueFn, falseFn?)`
Simple conditional rendering based on signal value.

```javascript
// Basic conditional
$.if(isLoading, 
  () => html`<div>Loading...</div>`,
  () => html`<div>Ready!</div>`
)

// Without else case
$.if(showMessage, () => html`<div>Hello World!</div>`)
```

**Parameters**:
- `conditionSignal: () => any` - signal function containing the condition
- `trueFn: () => Element` - function to render when truthy
- `falseFn?: () => Element` - optional function to render when falsy

**Returns**: `Element` - container element with conditionally rendered content

### `$.list(itemsSignal, renderFn, keyFn?)`
Renders reactive lists with optional keyed reconciliation.

```javascript
// Simple list (re-renders all on change)
$.list(items, item => html`<li>${item}</li>`)

// Keyed list (smart reconciliation - recommended)
$.list(todos, 
  todo => html`<div>${todo.text}</div>`,
  todo => todo.id
)

// With index parameter
$.list(items, (item, index) => html`<div>${index}: ${item}</div>`)
```

**Parameters**:
- `itemsSignal: () => Array<T>` - signal function containing array data
- `renderFn: (item: T, index: number) => Element` - function to render each item
- `keyFn?: (item: T, index: number) => string|number` - optional key extraction function

**Returns**: `Element` - container element with rendered list items

**Benefits of keyed lists**:
- Efficient updates when items are reordered, added, or removed
- Preserves component state and DOM focus
- Fallback to full re-render with invalid/duplicate keys

### `$.raw(html)`
Creates DOM nodes from raw HTML string (**bypasses XSS protection**).

```javascript
// Create HTML elements from string
const fragment = $.raw('<p>Hello <strong>World</strong></p>')

// Use with templates (be careful of XSS!)
const userContent = '<script>alert("xss")</script>' // Dangerous!
const safeContent = '<p>Safe content</p>'
html`<div>${$.raw(safeContent)}</div>`
```

**Parameters**:
- `html: string` - HTML string to parse

**Returns**: `DocumentFragment` - DOM fragment containing parsed elements

**⚠️ Security Warning**: 
This function bypasses XSS protection by setting `innerHTML` directly. Only use with trusted HTML content. Never use with user-provided input without proper sanitization.

### `render(element, container)`
Renders element to container with cleanup.

```javascript
render(() => html`<div>Hello</div>`, document.body)
```

**Parameters**:
- `element: Element | (() => Element)` - element or element factory
- `container: Element` - target container

**Returns**: `{ dispose: () => void }` - cleanup object

## Lifecycle Hooks

### `onMounted(fn)`
Runs when component connects to DOM.

```javascript
onMounted(() => {
  console.log('Component mounted!')
})
```

**Parameters**:
- `fn: () => void` - mount callback

### `onUnmounted(fn)`
Runs when component disconnects from DOM.

```javascript
onUnmounted(() => {
  console.log('Component unmounted!')
})
```

**Parameters**:
- `fn: () => void` - unmount callback

## Template Syntax

### Event Binding
```javascript
html`<button @click=${handler}>Click</button>`
html`<input @input=${e => setValue(e.target.value)} />`
```

### Property Binding
```javascript
html`<input .value=${value} .disabled=${disabled} />`
html`<my-component .data=${complexObject} />`
```

### Attribute Binding
```javascript
html`<div class=${className} id=${elementId}></div>`
html`<input type="text" placeholder=${hint} />`
```

### Conditional Attributes
```javascript
html`<button disabled=${isDisabled}>Button</button>`
// disabled=true sets attribute, disabled=false removes it
```

### Single Root Element Requirement
Templates must have a single root element:

```javascript
// ✅ Valid - single root element
html`
  <div>
    <h1>Title</h1>
    <p>Content</p>
  </div>
`

// ❌ Invalid - multiple root elements
html`
  <h1>Title</h1>
  <p>Content</p>
`
// Throws: "Multiple root elements are not allowed"
```

**Note**: If you need to group multiple elements, wrap them in a container element like `<div>` or use semantic HTML elements like `<section>`, `<article>`, etc.

## Component Communication

### Custom Events
Components can emit custom events:

```javascript
// In component - using this.emit
this.emit('custom-event', { data: 'value' })

// Or using $.emit for global events
$.emit('custom-event', { data: 'value' })

// Listening with automatic cleanup
$.listen('custom-event', (e) => {
  console.log('Event received:', e.detail)
})
```

### Slots
Components can accept slotted content:

```javascript
// Component template
html`
  <div class="card">
    <slot name="header"></slot>
    <div class="content">
      <slot name="content"></slot>
    </div>
  </div>
`
```

```html
<!-- Usage -->
<my-card>
  <h2 slot="header">Title</h2>
  <p slot="content">Body content</p>
</my-card>
```

## Debugging

Enable debug logging:

```javascript
window.RAIN_DEBUG = true
```

## Tips & Best Practices

### Type-Safe Components with JSDoc

While Rain is JavaScript-first, you can get excellent IDE support and type checking using JSDoc comments:

```javascript
// Define typed props inline
rain('user-card', ['name', 'age'],
  /** @type {(props: {name: () => string, age: () => number}) => () => Element} */
  function(props) {
    // Now props.name() is typed as string
    // and props.age() is typed as number
    return () => html`
      <div>${props.name()} is ${props.age()} years old</div>
    `
  }
)

// Or define prop types separately for reuse
/** @typedef {{name: () => string, age: () => number, email: () => string}} UserProfileProps */

rain('user-profile', ['name', 'age', 'email'],
  /** @param {UserProfileProps} props */
  function(props) {
    return () => html`
      <div>
        <h2>${props.name()}</h2>
        <p>Age: ${props.age()}</p>
        <p>Email: ${props.email()}</p>
      </div>
    `
  }
)
```

### Performance Tips

1. **Use keys in lists** for better reconciliation:
   ```javascript
   $.list(items, item => html`<li>${item.name}</li>`, item => item.id)
   ```

2. **Memoize expensive computations**:
   ```javascript
   const expensive = $.computed(() => {
     // This only recalculates when dependencies change
     return heavyCalculation(data())
   })
   ```
