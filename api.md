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
Registers a Web Component with closed shadow DOM (default).

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

### `rain.open(name, factory)`
### `rain.open(name, propNames, factory)`
Registers a Web Component with open shadow DOM (allows external JavaScript access).

```javascript
rain.open('my-component', ['title'], function(props) {
  return () => html`<div>${props.title()}</div>`
})
```

**Parameters**: Same as `rain()`
**Returns**: `boolean` - success status

### `rain.autoAdopt()`
Enables automatic adoption of stylesheets marked with `data-rain-adopt` attribute for all components.

```javascript
// Enable auto-adopt for all components
rain.autoAdopt()

// Mark a stylesheet in HTML head for automatic adoption
// <link rel="stylesheet" href="styles.css" data-rain-adopt>
```

**Benefits**:
- Automatically loads and adopts external stylesheets into component shadow DOM
- Uses Constructable Stylesheets for optimal performance  
- Caches stylesheet content - fetched only once for all components
- Gracefully handles fetch errors without breaking components

**Usage Example**:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="components.css" data-rain-adopt>
</head>
<body>
  <script type="module">
    import { rain } from './rainwc.js'
    
    // Enable auto-adoption
    rain.autoAdopt()
    
    // All components will now automatically adopt components.css
    rain('my-component', function() {
      return () => html`<div class="styled">Auto-styled content</div>`
    })
  </script>
</body>
</html>
```

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

### Automatic Stylesheet Adoption
RainWC can automatically adopt external stylesheets into component shadow DOM:

1. **Enable auto-adoption** with `rain.autoAdopt()`
2. **Mark stylesheets** in HTML head with `data-rain-adopt` attribute
3. **All components** automatically receive the styles

```html
<!DOCTYPE html>
<html>
<head>
  <!-- This stylesheet will be auto-adopted by all components -->
  <link rel="stylesheet" href="theme.css" data-rain-adopt>
</head>
<body>
  <script type="module">
    import { rain } from 'rainwc'
    
    // Enable automatic stylesheet adoption
    rain.autoAdopt()
    
    rain('themed-button', function() {
      return () => html`<button class="primary">Styled Button</button>`
    })
  </script>
  
  <themed-button></themed-button>
</body>
</html>
```

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

### Fragments
Use `<frag>` to group elements without creating wrapper DOM:

```javascript
html`
  <frag>
    <h1>Title</h1>
    <p>Content</p>
  </frag>
`
// Creates h1 and p elements with display: contents container
```

**Benefits**:
- Groups elements logically without affecting layout
- Uses `display: contents` CSS property
- Useful for conditional rendering of multiple elements

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
