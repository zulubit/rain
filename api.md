# API Reference

Complete reference for RainWC functions and utilities.

## Core Functions

### `$(initialValue)`
Creates a reactive signal with getter/setter tuple.

```jsx
const [count, setCount] = $(0)
const [user, setUser] = $({ name: 'Alice' })
```

**Returns**: `[getter, setter]` tuple
- `getter()` - returns current value
- `setter(newValue)` - updates value

### `$.computed(fn)`
Creates a computed signal that updates when dependencies change.

```jsx
const doubled = $.computed(() => count() * 2)
const fullName = $.computed(() => `${first()} ${last()}`)
```

**Parameters**:
- `fn: () => T` - computation function

**Returns**: `() => T` - readonly computed accessor

### `$.effect(fn)`
Runs side effects when dependencies change.

```jsx
$.effect(() => {
  document.title = `Count: ${count()}`
})
```

**Parameters**:
- `fn: () => void` - effect function

**Returns**: `() => void` - cleanup function

### `$.listen(eventName, handler, target?)`
Listens for custom events with automatic cleanup.

```jsx
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

```jsx
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

```jsx
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
  
  return () => (
    <div className="container">
      {styles}
      <p>Theme: {theme}</p>
      <button onClick={() => setTheme(theme() === 'light' ? 'dark' : 'light')}>
        Toggle
      </button>
    </div>
  )
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

```jsx
// Simple component
rain('my-button', function() {
  return () => <button>Click me</button>
})

// Component with props
rain('user-card', ['name', 'age'], function(props) {
  return () => (
    <div>
      <h3>{props.name() || 'Anonymous'}</h3>
      <p>Age: {props.age() || '0'}</p>
    </div>
  )
})
```

**Parameters**:
- `name: string` - component tag name (must contain hyphen)
- `propNames?: string[]` - array of observed attribute names (optional)
- `factory: function` - component factory function

**Returns**: `boolean` - success status

### `rain.closed(name, factory)`
### `rain.closed(name, propNames, factory)`
Registers a Web Component with closed shadow DOM (prevents external JavaScript access).

```jsx
rain.closed('secure-widget', ['data'], function(props) {
  return () => <div>{props.data()}</div>
})
```

**Parameters**: Same as `rain()`
**Returns**: `boolean` - success status

## JSX System

### `jsx(type, props, ...children)`
JSX pragma function - automatically used by build tools when compiling JSX syntax.

```jsx
// This JSX syntax:
<div className="container">Hello {name}</div>

// Gets compiled to:
jsx('div', { className: 'container' }, 'Hello ', name)
```

**Parameters**:
- `type: string | Function` - Element type or component function
- `props: Object | null` - Properties/attributes
- `children: ...any[]` - Child elements

**Returns**: `Element | any` - DOM element or component result

**Notes**:
- You typically don't call this directly - the build tool inserts calls automatically
- Configure your build tool with `jsxFactory: 'jsx'`

## Reactive Utilities

### `$.if(conditionSignal, trueFn, falseFn?)`
Conditional rendering based on signal value.

```jsx
// Basic conditional
$.if(isLoading, 
  () => <div>Loading...</div>,
  () => <div>Ready!</div>
)

// Without else case
$.if(showMessage, () => <div>Hello World!</div>)
```

**Parameters**:
- `conditionSignal: () => any` - signal function containing the condition
- `trueFn: () => Element` - function to render when truthy
- `falseFn?: () => Element` - optional function to render when falsy

**Returns**: `Element` - container element with conditionally rendered content

### `$.list(itemsSignal, renderFn, keyFn?)`
Renders reactive lists with optional keyed reconciliation.

```jsx
// Simple list (re-renders all on change)
$.list(items, item => <li>{item}</li>)

// Keyed list (smart reconciliation - recommended)
$.list(todos, 
  todo => <div>{todo.text}</div>,
  todo => todo.id
)

// With index parameter
$.list(items, (item, index) => <div>{index}: {item}</div>)
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

### `$.DHTML(htmlString)`
Creates HTML from string (bypasses XSS protection - use carefully).

```jsx
const htmlContent = $.DHTML('<strong>Bold text</strong>')
return () => <div>{htmlContent}</div>
```

**Parameters**:
- `htmlString: string` - HTML string to parse

**Returns**: `DocumentFragment` - parsed HTML as document fragment

**Warning**: Only use with trusted HTML content to avoid XSS vulnerabilities.

### `render(element, container)`
Renders element to container with cleanup.

```jsx
render(() => <div>Hello</div>, document.body)
```

**Parameters**:
- `element: Element | (() => Element)` - element or element factory
- `container: Element` - target container

**Returns**: `{ dispose: () => void }` - cleanup object

## Lifecycle Hooks

### `onMounted(fn)`
Runs when component connects to DOM.

```jsx
onMounted(() => {
  console.log('Component mounted!')
})
```

**Parameters**:
- `fn: () => void` - mount callback

### `onUnmounted(fn)`
Runs when component disconnects from DOM.

```jsx
onUnmounted(() => {
  console.log('Component unmounted!')
})
```

**Parameters**:
- `fn: () => void` - unmount callback

## JSX Syntax

### Event Handling
```jsx
<button onClick={handler}>Click</button>
<input onInput={e => setValue(e.target.value)} />
<div onKeyPress={e => e.key === 'Enter' && submit()} />
```

### Property Binding with $ Prefix

**Rule**: Use `$` prefix to set DOM properties instead of HTML attributes.

```jsx
// Properties ($ prefix) - Sets element.value, element.checked, etc.
<input $value={text} onInput={e => setText(e.target.value)} />
<input type="checkbox" $checked={isChecked} />
<select $value={selectedOption}>{options}</select>

// Without $ - Sets as HTML attributes (gets stringified)
<div data-value={myObject} />  // Becomes data-value="[object Object]"
<input value="static" />       // Sets attribute, not property
```

**When to use $**: Primarily for form inputs that need their DOM properties set directly.

### Attributes
```jsx
<div className={styles} id={elementId} />
<input type="text" placeholder={hint} disabled={isDisabled} />
```

### Conditional Attributes
```jsx
<button disabled={isDisabled}>Button</button>
// disabled=true sets attribute, disabled=false removes it
```

### Styles
```jsx
// Style strings
<div style="color: red; font-size: 16px;">Styled</div>

// Reactive style strings
<div style={styleSignal} />

// Dynamic styles with template literals
const dynamicStyle = $.computed(() => `color: ${color()}; padding: ${padding()}px`)
<div style={dynamicStyle} />
```

### Fragments
Use `<></>` to group elements without wrapper DOM:

```jsx
return () => (
  <>
    <h1>Title</h1>
    <p>Content</p>
  </>
)
```

**Benefits**:
- Groups elements logically without affecting layout
- Uses native DocumentFragment for minimal overhead
- Useful for conditional rendering of multiple elements

## Component Communication

### Custom Events
Components can emit custom events:

```jsx
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

```jsx
// Component template
return () => (
  <div className="card">
    <slot name="header" />
    <div className="content">
      <slot name="content" />
    </div>
  </div>
)
```

```html
<!-- Usage -->
<my-card>
  <h2 slot="header">Title</h2>
  <p slot="content">Body content</p>
</my-card>
```

## Build Configuration

### Universal Plugin (Works with both esbuild and Vite)
```js
// With esbuild
import rainwc from 'rainwc/plugin'
import { build } from 'esbuild'

build({
  entryPoints: ['src/app.jsx'],
  bundle: true,
  plugins: [rainwc()]
})

// With Vite
import rainwc from 'rainwc/plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [rainwc()]
})
```

### Manual Configuration
```js
// For esbuild/Vite
{
  jsx: 'transform',
  jsxFactory: 'jsx',
  jsxFragment: 'Fragment',
  jsxInject: `import { jsx, Fragment } from 'rainwc'`
}

// For Babel
{
  plugins: [
    ['@babel/plugin-transform-react-jsx', {
      pragma: 'jsx',
      pragmaFrag: 'Fragment'
    }]
  ]
}
```

## Debugging

Enable debug logging:

```jsx
window.RAIN_DEBUG = true
```