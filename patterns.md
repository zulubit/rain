# Rain Patterns

Common patterns and gotchas for building with Rain.

## Signal Updates

### Nested Objects Need Full Updates

Effects only trigger when the signal reference changes, not when nested properties change.

```javascript
// ❌ Won't trigger effects
const [user, setUser] = $({ name: 'Alice', age: 25 })
user().age = 26 // Effect won't run

// ✅ Will trigger effects
const [user, setUser] = $({ name: 'Alice', age: 25 })
setUser({ ...user(), age: 26 }) // Effect runs
```

### Batching Multiple Updates

Use `$.batch()` to avoid multiple re-renders.

```javascript
$.batch(() => {
  setName('Bob')
  setAge(30)
  setEmail('bob@example.com')
}) // Only one re-render
```

## Styling

### Component-Scoped Styles

Use `css` template function for reactive, scoped styles.

```javascript
rain('my-button', function() {
  const [theme, setTheme] = $('light')

  const styles = css`
    button {
      background: ${() => theme() === 'dark' ? '#333' : '#fff'};
      color: ${() => theme() === 'dark' ? '#fff' : '#333'};
    }
  `

  return () => html`
    <div>
      ${styles}
      <button @click=${() => setTheme(theme() === 'dark' ? 'light' : 'dark')}>
        Toggle Theme
      </button>
    </div>
  `
})
```

### Manual Style Scoping

Use random class prefixes to manually scope styles.

```javascript
rain('my-widget', function() {
  const scopeId = `widget-${Math.random().toString(36).slice(2)}`

  const styles = css`
    .${scopeId} {
      padding: 1rem;
      border: 1px solid #ccc;
    }
    .${scopeId} .title {
      font-weight: bold;
      color: blue;
    }
  `

  return () => html`
    <div class=${scopeId}>
      ${styles}
      <div class="title">Scoped Widget</div>
    </div>
  `
})
```

## Event Handling

### Element References

Use `$.ref()` to capture element references in event handlers.

```javascript
const [inputRef, setInputRef] = $.ref()

// In template
html`<input @focus=${setInputRef} />`

// Later use
inputRef()?.focus()
```

### Passing Arguments to Event Handlers

Use arrow function wrappers to pass additional data to event handlers.

```javascript
const items = [
  { id: 1, name: 'Alice', type: 'user' },
  { id: 2, name: 'Bob', type: 'admin' }
]

// Pass extra arguments with arrow functions
items.map(item => html`
  <button @click=${(e) => handleClick(e, item.id, item.type)}>
    ${item.name}
  </button>
`)

function handleClick(event, itemId, itemType) {
  console.log('Clicked:', event.target.textContent)
  console.log('Item ID:', itemId)
  console.log('Item Type:', itemType)
}
```

### Custom Events

Communicate between components using events.

```javascript
// Emit from component
this.emit('value-changed', { value: newValue })

// Listen from parent
$.listen('value-changed', (e) => {
  setParentValue(e.detail.value)
})
```

## List Rendering

### Always Use Keys for Dynamic Lists

Keys enable efficient reconciliation.

```javascript
// ✅ Good - with keys
$.list(items, item => html`<div>${item.name}</div>`, item => item.id)

// ❌ Avoid - without keys (re-creates all DOM nodes)
$.list(items, item => html`<div>${item.name}</div>`)
```

### Input Focus in Lists

Use `@blur` instead of `@input` to avoid focus loss from list re-renders.

```javascript
const [todos, setTodos] = $([...])

// ❌ Bad - input loses focus on every keystroke
$.list(todos, todo => html`
  <input value=${todo.text} @input=${e => {
    const newTodos = todos().map(t =>
      t.id === todo.id ? { ...t, text: e.target.value } : t
    )
    setTodos(newTodos) // This triggers list re-render
  }} />
`, todo => todo.id)

// ✅ Good - update on blur to avoid re-renders while typing
$.list(todos, todo => html`
  <input value=${todo.text} @blur=${e => {
    const newTodos = todos().map(t =>
      t.id === todo.id ? { ...t, text: e.target.value } : t
    )
    setTodos(newTodos)
  }} />
`, todo => todo.id)
```

## Component Communication

### Props Down, Events Up

Pass data down via props, send data up via events.

```javascript
// Parent
rain('todo-app', function() {
  const [todos, setTodos] = $([])

  $.listen('todo-added', (e) => {
    setTodos([...todos(), e.detail.todo])
  })

  return () => html`
    <todo-form></todo-form>
    <todo-list .todos=${todos}></todo-list>
  `
})

// Child
rain('todo-form', function() {
  const addTodo = () => {
    this.emit('todo-added', { todo: { id: Date.now(), text: 'New todo' } })
  }

  return () => html`<button @click=${addTodo}>Add Todo</button>`
})
```

### Shared State

Use a simple state store pattern for shared state.

```javascript
// store.js
export const [globalState, setGlobalState] = $({
  user: null,
  theme: 'light'
})

// In components
import { globalState, setGlobalState } from './store.js'

rain('nav-bar', function() {
  return () => html`
    <div>Welcome ${() => globalState().user?.name || 'Guest'}</div>
  `
})
```

## Performance

### Conditional Rendering

Use `$.if()` instead of ternary operators for better performance.

```javascript
// ✅ Good - only creates DOM when needed
$.if(isVisible, () => html`<expensive-component></expensive-component>`)

// ❌ Less efficient - always creates both branches
html`${isVisible() ? html`<expensive-component></expensive-component>` : ''}`
```

## Common Gotchas

### Don't Call Signals in Signal Creation

```javascript
// ❌ Won't be reactive
const [derived, setDerived] = $(count() * 2)

// ✅ Use computed instead
const derived = $.computed(() => count() * 2)
```

### Effects Run Immediately

Effects run once on creation, then on each dependency change.

```javascript
$.effect(() => {
  console.log('Count:', count()) // Runs immediately, then on count changes
})
```

### Component Lifecycle

Access component APIs only within the factory function.

```javascript
rain('my-component', function() {
  const root = getRoot() // ✅ Good - inside factory

  onMounted(() => {
    getRoot().querySelector('input').focus() // ✅ Good - inside lifecycle hook
  })

  return () => html`<input />`
})

// ❌ Bad - outside factory
const root = getRoot() // Error!
```
