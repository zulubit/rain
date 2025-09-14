# API Reference

## Imports

```javascript
import { $, html, css, rain, onMounted, onUnmounted, getRoot, getChildren } from 'rainwc'
```

## Signals

### `$(value)`
Creates a reactive signal.

```javascript
const [count, setCount] = $(0)
```

### `$.computed(fn)`
Creates computed signal.

```javascript
const doubled = $.computed(() => count() * 2)
```

### `$.effect(fn)`
Runs effects when dependencies change.

```javascript
$.effect(() => console.log('Count:', count()))
```

### `$.batch(fn)`
Batches multiple signal updates.

```javascript
$.batch(() => {
  setName('Alice')
  setAge(25)
})
```

### `$.list(items, renderFn, keyFn?)`
Renders reactive lists.

```javascript
$.list(todos, todo => html`<div>${todo.text}</div>`, todo => todo.id)
```

### `$.if(condition, trueFn, falseFn?)`
Conditional rendering.

```javascript
$.if(isLoading, () => html`<div>Loading...</div>`)
```

### `$.ref()`
Creates a signal-based element reference.

```javascript
const [inputRef, setInputRef] = $.ref()
html`<input @input=${setInputRef} />`
// Access element: inputRef()
```

## Events

### `$.listen(event, handler, target?)`
Listen to events with auto cleanup.

```javascript
$.listen('click', handleClick, button)
```

### `$.emit(event, detail?, target?)`
Emit custom events.

```javascript
$.emit('user-changed', { user })
```

### `$.effectEmit(event, signalValue, target?)`
Auto-emit events when signal changes.

```javascript
const [count, setCount] = $(0)
$.effectEmit('count-changed', count) // Emits whenever count changes
```

## Templates

### `html`
Creates DOM elements.

```javascript
html`<button @click=${handler}>Click me</button>`
```

### `css`
Creates reactive styles.

```javascript
const styles = css`
  .btn { color: ${theme() === 'dark' ? 'white' : 'black'}; }
`
```

## Components

### `rain(name, propNames?, factory)`
Register a Web Element.

```javascript
rain('my-button', function() {
  return () => html`<button>Click me</button>`
})

rain('user-card', ['name', 'age'], function(props) {
  return () => html`<div>${props.name()}, ${props.age()}</div>`
})
```

### `onMounted(fn)`
Run when component connects.

```javascript
onMounted(() => console.log('mounted'))
```

### `onUnmounted(fn)`
Run when component disconnects.

```javascript
onUnmounted(() => console.log('unmounted'))
```

### `getRoot()`
Get component element (inside factory only).

```javascript
const root = getRoot()
root.classList.add('initialized')
```

### `getChildren(slotName?)`
Get component children (inside factory only).

```javascript
const children = getChildren()
const header = getChildren('header')
```

## Children/Slots

```javascript
rain('my-card', function() {
  const header = getChildren('header')
  const content = getChildren('content')
  
  return () => html`
    <div class="card">
      <div class="header">${header}</div>
      <div class="content">${content}</div>
    </div>
  `
})
```

```html
<my-card>
  <h2 slot="header">Title</h2>
  <p slot="content">Body content</p>
</my-card>
```

## Template Syntax

- Events: `@click=${handler}`
- Properties: `.value=${signal}`
- Attributes: `class=${className}`
- Signals: `${signal}` (auto-updates)

## Utilities

### `$.raw(htmlString)`
Creates DOM nodes from raw HTML string (bypasses XSS protection).

```javascript
const fragment = $.raw('<p>Hello <strong>World</strong></p>')
html`<div>${fragment}</div>`
```

⚠️ **Warning**: Only use with trusted content. Never use with user input.

## Complete Example

```javascript
// Feature showcase component
rain('demo-app', function() {
  // Signal
  const [count, setCount] = $(0)
  
  // Computed
  const doubled = $.computed(() => count() * 2)
  
  // Effect 
  $.effect(() => console.log('Count changed:', count()))
  
  // Event listener
  $.listen('keydown', e => e.key === 'r' && setCount(0))
  
  // Lifecycle
  onMounted(() => console.log('mounted'))
  onUnmounted(() => console.log('unmounted'))
  
  // Element access
  getRoot().classList.add('demo')
  
  // Children
  const header = getChildren('header')
  
  // Styles
  const styles = css`
    .demo { color: ${() => count() > 5 ? 'red' : 'blue'}; }
  `
  
  return () => html`
    <div>
      ${styles}
      <div>${header}</div>
      
      <button @click=${() => setCount(count() + 1)}>
        Count: ${count}
      </button>
      
      <p>Doubled: ${doubled}</p>
      
      ${$.if(() => count() > 0, () => html`<p>Positive!</p>`)}
      
      ${$.list(
        () => Array(count()).fill(0).map((_, i) => ({ id: i, text: `Item ${i}` })),
        item => html`<div>• ${item.text}</div>`,
        item => item.id
      )}
      
      <button @click=${() => $.emit('demo-event', { count: count() })}>
        Emit Event
      </button>
      
      <button @click=${() => $.batch(() => { setCount(10); setCount(count() + 5) })}>
        Batch Update
      </button>
    </div>
  `
})
```

```html
<!-- Usage -->
<demo-app>
  <h3 slot="header">🚀 All Features Demo</h3>
</demo-app>
```