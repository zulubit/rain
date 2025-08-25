# Templates

RainWC uses HTM (Hyperscript Tagged Markup) for templates. No build step needed.

## Dynamic Content and Computed Values

```javascript
rain('dynamic-content', function() {
  const [count, setCount] = $(0)
  const [show, setShow] = $(true)
  
  const doubled = $.computed(() => count() * 2)
  
  return () => html`
    <div>
      <h3>Count: ${count}</h3>
      <p>Double: ${doubled}</p>
      ${match(show, {
        'true': () => html`<p>Visible!</p>`,
        'false': () => html`<p>Hidden!</p>`
      })}
      <button @click=${() => setCount(count() + 1)}>+</button>
      <button @click=${() => setShow(!show())}>Toggle</button>
    </div>
  `
})
```

## Event Handlers

```javascript
rain('event-demo', function() {
  const [message, setMessage] = $('')
  
  return () => html`
    <div>
      <button @click=${() => setMessage('Clicked!')}>Click Me</button>
      <input @input=${(e) => setMessage(e.target.value)} placeholder="Type here" />
      <p>${message}</p>
    </div>
  `
})
```

## Simple Lists

```javascript
rain('list-demo', function() {
  const [items, setItems] = $(['apple', 'banana'])
  
  const addItem = () => {
    setItems([...items(), 'new item'])
  }
  
  return () => html`
    <div>
      ${list(items, item => html`<li>${item}</li>`)}
      <button @click=${addItem}>Add Item</button>
    </div>
  `
})
```

## Keyed Lists with Smart Reconciliation

```javascript
rain('keyed-list-demo', function() {
  const [todos, setTodos] = $([
    { id: 1, text: 'Learn RainWC', done: false },
    { id: 2, text: 'Build app', done: true },
    { id: 3, text: 'Deploy', done: false }
  ])
  
  let nextId = 4
  
  const addTodo = () => {
    const newTodo = { id: nextId++, text: `Task ${nextId-1}`, done: false }
    setTodos([...todos(), newTodo])
  }
  
  const toggleTodo = (id) => {
    setTodos(todos().map(todo => 
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ))
  }
  
  const removeTodo = (id) => {
    setTodos(todos().filter(todo => todo.id !== id))
  }
  
  return () => html`
    <div>
      ${list(todos, 
        todo => html`
          <div>
            <input 
              type="checkbox" 
              checked=${todo.done}
              @change=${() => toggleTodo(todo.id)}
            />
            <span>${todo.text}</span>
            <button @click=${() => removeTodo(todo.id)}>×</button>
          </div>
        `,
        todo => todo.id
      )}
      <button @click=${addTodo}>Add Todo</button>
    </div>
  `
})
```

## Key Concepts

- **Interpolation**: `${expression}` for dynamic content
- **Events**: `@event=${handler}` for event binding  
- **Attributes**: `attribute=${value}` for HTML attributes
- **Conditionals**: `match(signal, cases)` for conditional rendering
- **Lists**: `list(signal, renderFn)` for arrays
- **Keyed Lists**: `list(signal, renderFn, keyFn)` for smart reconciliation
- **Fragments**: `<frag>` for grouping elements without wrapper DOM
- **Computed**: `$.computed(() => expression)` for derived values

## Conditional Rendering with match()

The `match()` function provides type-safe conditional rendering based on signal values:

```javascript
rain('status-display', function() {
  const [status, setStatus] = $('idle')
  
  return () => html`
    <div>
      ${match(status, {
        'idle': () => html`<p>Ready to start</p>`,
        'loading': () => html`<p>Loading...</p>`,
        'success': () => html`<p>✓ Complete!</p>`,
        'error': () => html`<p>✗ Failed!</p>`
      })}
      <button @click=${() => setStatus('loading')}>Start</button>
    </div>
  `
})
```

### With Fallback

```javascript
match(userType, {
  'admin': () => html`<admin-panel />`,
  'user': () => html`<user-dashboard />`
}, () => html`<guest-view />`)  // fallback for unmatched values
```

### Benefits over if/else
- Clean, declarative syntax
- Automatic reactivity
- Type-safe value matching
- Efficient DOM updates (only matched branch renders)
- Optional fallback for unhandled cases

## List Reconciliation

RainWC uses smart reconciliation with keys to efficiently update lists:

**Without keys** (simple):
```javascript
list(items, item => html`<li>${item}</li>`)
```
- Re-renders entire list on changes
- Good for simple, small lists

**With keys** (smart reconciliation):
```javascript
list(items, item => html`<li>${item.name}</li>`, item => item.id)
```
- Only updates changed items
- Preserves DOM state and focus
- Optimal performance for dynamic lists
- Key function should return unique, stable identifiers

## Fragments

Use `<frag>` elements to group multiple elements without creating wrapper DOM:

```javascript
rain('fragment-demo', function() {
  const [showContent, setShowContent] = $(true)
  
  return () => html`
    <div>
      <button @click=${() => setShowContent(!showContent())}>Toggle Content</button>
      ${showContent() ? html`
        <frag>
          <h3>Title</h3>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </frag>
      ` : ''}
    </div>
  `
})
```

Fragments use `display: contents` CSS, so they don't affect layout but group elements logically.

## Template Patterns

```javascript
// Simple interpolation
html`<p>Hello ${name}</p>`

// Event handling
html`<button @click=${handler}>Click</button>`

// Conditional rendering
match(status, {
  'loading': () => html`<div>Loading...</div>`,
  'success': () => html`<div>Success!</div>`
})

// List rendering
list(items, item => html`<div>${item}</div>`, item => item.id)

// Fragments for grouping
html`<frag>
  <h1>Title</h1>
  <p>Content</p>
</frag>`
```

## Working Example

[examples/04-templates.html](../examples/04-templates.html)

## Next Steps

- [API Reference](api.md) - Complete function documentation
- [Components](components.md) - Component patterns  
- [Reactivity](reactivity.md) - State management