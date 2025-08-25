# RainWC for LLMs

This guide helps LLM agents write idiomatic RainWC code. RainWC is a lightweight reactive Web Components framework with fine-grained reactivity and no build step required.

## Quick Reference

### Import Pattern
```javascript
import { rain, html, $, css, match, list, render, DHTML } from 'rainwc'
// or CDN
import { rain, html, $, css, match, list, render, DHTML } from 'https://unpkg.com/rainwc/dist/rainwc.esm.min.js'
```

### Component Structure
Every RainWC component follows this exact pattern:

```javascript
rain('component-name', function() {
  // 1. Set up reactive state
  const [state, setState] = $(initialValue)
  
  // 2. Define computed values and event handlers
  const computed = $.computed(() => derivedValue)
  const handler = () => setState(newValue)
  
  // 3. Return template function
  return () => html`
    <div @click=${handler}>
      ${state}
    </div>
  `
})
```

### Component with Props
```javascript
rain('user-card', {
  name: { type: String, default: 'Anonymous' },
  age: { type: Number, default: 0 },
  active: { type: Boolean, default: false }
}, function(props) {
  return () => html`
    <div>
      <h3>${props().name}</h3>
      <p>Age: ${props().age}</p>
    </div>
  `
})
```

## Core APIs

### Signals - `$(value)`
Create reactive state with getter/setter tuple:
```javascript
const [count, setCount] = $(0)
const [user, setUser] = $({ name: 'Alice' })
const [items, setItems] = $(['a', 'b', 'c'])

// Reading: count(), user().name
// Writing: setCount(5), setUser({ name: 'Bob' })
```

### Computed - `$.computed(fn)`
Derive values from signals:
```javascript
const doubled = $.computed(() => count() * 2)
const fullName = $.computed(() => `${first()} ${last()}`)
```

### Effects - `$.effect(fn)`
Side effects with cleanup:
```javascript
$.effect(() => {
  document.title = `Count: ${count()}`
})

// With cleanup
$.effect(() => {
  const timer = setInterval(() => console.log(count()), 1000)
  return () => clearInterval(timer)
})
```

### Events - `$.listen()` and `$.emit()`
```javascript
// Listen (auto cleanup)
$.listen('custom-event', (e) => {
  console.log(e.detail)
})

// Emit
$.emit('custom-event', { data: 'value' })
```

## Template Syntax - `html`

### Basic Templates
```javascript
html`<div>Hello ${name}</div>`
html`<p>Count: ${count()}</p>`
```

### Event Binding - `@event`
```javascript
html`<button @click=${() => setCount(count() + 1)}>+</button>`
html`<input @input=${(e) => setText(e.target.value)} />`
```

### Property Binding - `.prop`
```javascript
html`<input .value=${inputValue} .disabled=${isDisabled} />`
html`<my-component .data=${complexObject} />`
```

### Conditional Rendering - `match(signal, cases)`
```javascript
match(status, {
  'loading': () => html`<div>Loading...</div>`,
  'success': () => html`<div>Success!</div>`,
  'error': () => html`<div>Error!</div>`,
  'default': () => html`<div>Unknown</div>`  // optional default case
})
```

### Lists - `list(signal, renderFn, keyFn?)`
```javascript
// Simple list
list(items, item => html`<li>${item}</li>`)

// Keyed list (smart reconciliation)
list(todos, 
  todo => html`<div>${todo.text}</div>`,
  todo => todo.id
)
```

### Fragments - `<frag>`
Group elements without wrapper DOM:
```javascript
html`
  <frag>
    <h1>Title</h1>
    <p>Content</p>
  </frag>
`
```

### Dangerous HTML - `DHTML(html)`
⚠️ **Security Warning**: Only use with trusted content
```javascript
// Parse HTML string to DocumentFragment
const fragment = DHTML('<p>Trusted <strong>HTML</strong></p>')
// In templates
html`<div>${DHTML(trustedHTMLString)}</div>`
```

## Styling

### Scoped Styles
```javascript
rain('styled-component', function() {
  return () => html`
    <style>
      .container { padding: 1rem; }
      .title { color: #333; }
    </style>
    <div class="container">
      <h2 class="title">Styled</h2>
    </div>
  `
})
```

### Reactive CSS - `css`
```javascript
rain('theme-component', function() {
  const [theme, setTheme] = $('light')
  
  const styles = css`
    .container {
      background: ${$.computed(() => theme() === 'dark' ? '#333' : '#fff')};
      color: ${$.computed(() => theme() === 'dark' ? '#fff' : '#333')};
    }
  `
  
  return () => html`
    <div class="container">
      ${styles}
      <p>Theme: ${theme}</p>
    </div>
  `
})
```

## Prop Types

```javascript
{
  text: { type: String, default: '' },
  count: { type: Number, default: 0, validator: v => v >= 0 },
  active: { type: Boolean, default: false },
  data: { type: Object, default: null },
  items: { type: Array, default: [] },
  callback: { type: Function, default: null }
}
```

### Props in HTML
```html
<!-- String/Number attributes -->
<user-card name="Alice" age="30"></user-card>

<!-- Boolean (presence = true) -->
<user-card name="Bob" active></user-card>

<!-- JSON for objects/arrays -->
<user-card data='{"role": "admin"}' items='["a", "b"]'></user-card>
```

### Reactive Props
Props are not reactive by default. Make them reactive:
```javascript
rain('reactive-component', { name: String }, function(props) {
  const reactiveName = $.computed(() => props().name)
  return () => html`<div>Hello ${reactiveName}</div>`
})
```

## Lifecycle Hooks

```javascript
rain('lifecycle-component', function() {
  onMounted(() => {
    console.log('Mounted!')
    const timer = setInterval(() => {}, 1000)
    return () => clearInterval(timer)  // cleanup
  })
  
  onUnmounted(() => {
    console.log('Unmounted!')
  })
  
  return () => html`<div>Component</div>`
})
```

## Component Communication

### Custom Events
```javascript
// Emitting component
rain('event-sender', function() {
  const sendEvent = () => {
    $.emit('custom-event', { message: 'Hello' })
    // or this.emit('custom-event', { message: 'Hello' })
  }
  return () => html`<button @click=${sendEvent}>Send</button>`
})

// Listening component
rain('event-listener', function() {
  const [message, setMessage] = $('')
  
  $.listen('custom-event', (e) => {
    setMessage(e.detail.message)
  })
  
  return () => html`<p>Received: ${message}</p>`
})
```

### Slots
```javascript
// Component with slots
rain('card-component', function() {
  return () => html`
    <div class="card">
      <header>
        <slot name="header">Default Header</slot>
      </header>
      <main>
        <slot name="content"></slot>
      </main>
    </div>
  `
})
```

```html
<!-- Usage -->
<card-component>
  <h2 slot="header">Custom Header</h2>
  <p slot="content">Custom content</p>
</card-component>
```

## Best Practices

### 1. Component Naming
- ✅ Must contain hyphen: `user-card`, `nav-menu`
- ❌ No single words: `card`, `menu`
- ✅ Descriptive: `shopping-cart-item`

### 2. Script Placement
Place scripts after HTML elements for proper prop handling:
```html
<body>
  <my-component name="Alice"></my-component>
  <script type="module">
    // Define component here
  </script>
</body>
```

### 3. Signal Patterns
```javascript
// Update objects immutably
setUser({ ...user(), age: user().age + 1 })

// Update arrays
setItems([...items(), newItem])
setItems(items().filter(item => item.id !== id))
```

### 4. Performance
- Use keyed lists: `list(items, render, keyFn)` 
- Use computed for derived values
- Clean up effects and listeners
- Avoid calling getters in loops

### 5. Common Patterns

#### Counter
```javascript
rain('my-counter', function() {
  const [count, setCount] = $(0)
  return () => html`
    <div>
      <button @click=${() => setCount(count() - 1)}>-</button>
      <span>${count}</span>
      <button @click=${() => setCount(count() + 1)}>+</button>
    </div>
  `
})
```

#### Todo List
```javascript
rain('todo-list', function() {
  const [todos, setTodos] = $([])
  const [input, setInput] = $('')
  
  const addTodo = () => {
    if (input().trim()) {
      setTodos([...todos(), { id: Date.now(), text: input(), done: false }])
      setInput('')
    }
  }
  
  const toggleTodo = (id) => {
    setTodos(todos().map(todo => 
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ))
  }
  
  return () => html`
    <div>
      <input 
        .value=${input} 
        @input=${e => setInput(e.target.value)}
        @keydown=${e => e.key === 'Enter' && addTodo()}
      />
      <button @click=${addTodo}>Add</button>
      ${list(todos, 
        todo => html`
          <div>
            <input 
              type="checkbox" 
              .checked=${todo.done}
              @change=${() => toggleTodo(todo.id)}
            />
            <span>${todo.text}</span>
          </div>
        `,
        todo => todo.id
      )}
    </div>
  `
})
```

#### Form Component
```javascript
rain('user-form', function() {
  const [form, setForm] = $({ name: '', email: '' })
  const [errors, setErrors] = $({})
  
  const validate = () => {
    const newErrors = {}
    if (!form().name) newErrors.name = 'Name required'
    if (!form().email.includes('@')) newErrors.email = 'Valid email required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      $.emit('user-submitted', form())
    }
  }
  
  const updateField = (field, value) => {
    setForm({ ...form(), [field]: value })
  }
  
  return () => html`
    <form @submit=${handleSubmit}>
      <input 
        .value=${form().name}
        @input=${e => updateField('name', e.target.value)}
        placeholder="Name"
      />
      ${errors().name ? html`<span class="error">${errors().name}</span>` : ''}
      
      <input 
        type="email"
        .value=${form().email}
        @input=${e => updateField('email', e.target.value)}
        placeholder="Email"
      />
      ${errors().email ? html`<span class="error">${errors().email}</span>` : ''}
      
      <button type="submit">Submit</button>
    </form>
  `
})
```

## Error Handling

Components automatically handle errors. For custom error boundaries:
```javascript
rain('error-boundary', function() {
  const [error, setError] = $(null)
  
  return () => {
    try {
      return html`<div>Normal content</div>`
    } catch (e) {
      setError(e)
      return html`<div>Error: ${error()?.message}</div>`
    }
  }
})
```

## Shadow DOM Modes

```javascript
// Closed shadow DOM (default)
rain('my-component', function() { ... })

// Open shadow DOM (for debugging/testing)
rain.open('my-component', function() { ... })
```

This guide covers all essential RainWC patterns. Always return a template function from components, use signals for state, and follow the HTM template syntax.