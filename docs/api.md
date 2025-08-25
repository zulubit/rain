# API Reference

Complete reference for RainWC functions and utilities.

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

### `$.getSlots()`
Captures slotted content for light DOM components. **Only available in light DOM components**.

```javascript
rain.light('my-component', function() {
  const slots = $.getSlots()  // Capture slotted content
  
  return () => html`
    <div class="card">
      <header>${slots.header || html`<h2>Default Header</h2>`}</header>
      <main>${slots.content || slots.default || 'No content'}</main>
      <footer>${slots.footer || html`<small>Default footer</small>`}</footer>
    </div>
  `
})
```

**Usage**:
```html
<my-component>
  <h1 slot="header">Custom Title</h1>
  <p slot="content">Main content</p>
  <button slot="footer">Action</button>
</my-component>
```

**Returns**: `{ [slotName: string]: DocumentFragment }` - object mapping slot names to content
- Named slots: accessed by `slot` attribute value
- Default slot: elements without `slot` attribute, accessible as `slots.default`
- Fallback: Use `||` operator to provide fallback content when slots are empty

**Important**: 
- Only works in light DOM components created with `rain.light()`
- Must be called within the component factory function
- Throws error if called outside light DOM component context

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

- Template literal with CSS and reactive interpolations
- Returns computed signal returning `<style>` element
- Works in both shadow DOM and light DOM

### `dangerouslySetInnerHTML(html)`
Inserts raw HTML. ⚠️ **Only use with trusted content**.

```javascript
rain.light('my-component', function() {
  return () => html`
    <div>
      ${dangerouslySetInnerHTML('<style>.custom { color: blue; }</style>')}
      <div class="custom">Content</div>
    </div>
  `
})
```

## Component System

### `rain(name, factory)`
### `rain(name, props, factory)`
Registers a Web Component with closed shadow DOM (default).

```javascript
// Simple component
rain('my-button', function() {
  return () => html`<button>Click me</button>`
})

// Component with props
rain('user-card', {
  name: { type: String, default: 'Anonymous' },
  age: { type: Number, default: 0 }
}, function(props) {
  return () => html`
    <div>
      <h3>${props().name}</h3>
      <p>Age: ${props().age}</p>
    </div>
  `
})
```

**Parameters**:
- `name: string` - component tag name (must contain hyphen)
- `props?: object` - prop definitions (optional)
- `factory: function` - component factory function

**Returns**: `boolean` - success status

### `rain.open(name, factory)`
### `rain.open(name, props, factory)`
Registers a Web Component with open shadow DOM (allows external JavaScript access).

```javascript
// Component with open shadow DOM
rain.open('my-component', function() {
  return () => html`<div>Open shadow DOM</div>`
})

// External JavaScript can access shadowRoot
const element = document.querySelector('my-component')
console.log(element.shadowRoot) // accessible
```

**Parameters**: Same as `rain()`
**Returns**: `boolean` - success status

**When to use open shadow DOM**:
- When external tools need to inspect the shadow tree
- For debugging or testing purposes
- When intentionally allowing external manipulation

### `rain.light(name, factory)`
### `rain.light(name, props, factory)`
Registers a Web Component with light DOM (no shadow DOM).

```javascript
rain.light('my-component', function() {
  return () => html`
    <div>
      ${css`.card { padding: 1rem; }`}
      <div class="card">Light DOM content</div>
    </div>
  `
})
```

- No style encapsulation - styles are global
- Use for SSR compatibility and simpler DOM structure

### Prop Types
- `String` - text values
- `Number` - numeric values  
- `Boolean` - true/false (attribute presence)
- `Object` - JSON objects
- `Array` - JSON arrays
- `Function` - callback functions

```javascript
{
  text: { type: String, default: '' },
  count: { type: Number, default: 0, validator: v => v >= 0 },
  active: { type: Boolean, default: false },
  data: { type: Object, default: null },
  items: { type: Array, default: [] },
  onClick: { type: Function, default: null }
}
```

## Template System

### `html`
HTM template function for creating reactive DOM elements.

```javascript
html`<div>Hello ${name}</div>`
html`<button @click=${handler}>Click</button>`
```

**Returns**: `Element` - DOM element

### `match(signal, cases, fallback?)`
Conditional rendering based on signal value.

```javascript
match(status, {
  'loading': () => html`<div>Loading...</div>`,
  'success': () => html`<div>Success!</div>`,
  'error': () => html`<div>Error!</div>`
})
```

**Parameters**:
- `signal: () => T` - reactive signal
- `cases: object` - value to render function mapping
- `fallback?: () => Element` - optional fallback renderer

**Returns**: `Element` - container with conditional content

### `list(signal, renderFn, keyFn?)`
Renders reactive lists with optional smart reconciliation.

```javascript
// Simple list
list(items, item => html`<li>${item}</li>`)

// Keyed list (smart reconciliation)
list(todos, 
  todo => html`<div>${todo.text}</div>`,
  todo => todo.id
)
```

**Parameters**:
- `signal: () => Array<T>` - array signal
- `renderFn: (item: T, index: number) => Element` - item renderer
- `keyFn?: (item: T, index: number) => string|number` - optional key extractor

**Returns**: `Element` - container with list items

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
  
  const timer = setInterval(() => {
    console.log('tick')
  }, 1000)
  
  // Return cleanup function
  return () => clearInterval(timer)
})
```

**Parameters**:
- `fn: () => void | (() => void)` - mount callback, optional cleanup return

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

## Performance

### List Reconciliation
- Use keyed lists for dynamic data: `list(items, render, keyFn)`
- Keys should be unique and stable
- Avoids unnecessary DOM updates

### Signal Best Practices  
- Use computed signals for derived values
- Avoid calling signal getters in loops
- Clean up effects and event listeners

### Component Isolation
- Each component instance has isolated state
- Shadow DOM provides style encapsulation
- Slots enable content projection

## Working Examples

- [examples/01-getting-started.html](../examples/01-getting-started.html) - Basic usage
- [examples/02-components.html](../examples/02-components.html) - Component patterns
- [examples/03-reactivity.html](../examples/03-reactivity.html) - Reactive state
- [examples/04-templates.html](../examples/04-templates.html) - Template features
- [examples/05-light-dom.html](../examples/05-light-dom.html) - Light DOM components