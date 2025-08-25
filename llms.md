# RainWC - Complete LLM Reference

RainWC is a fine-grained reactive Web Components framework with HTM templates and Preact signals. This document provides comprehensive reference for LLMs to generate correct code.

## Core Imports & Setup

```javascript
// ESM import (preferred)
import { 
  rain,           // Component definition
  html,           // HTM template literals
  $,              // Reactive signals
  css,            // Reactive CSS
  dangerouslySetInnerHTML,  // Raw HTML insertion
  onMounted,      // Lifecycle hook
  onUnmounted     // Lifecycle hook
} from './rainwc.esm.min.js'

// UMD (legacy)
const { rain, html, $, css } = RainWC
```

## Component Definition Patterns

### Basic Component
```javascript
rain('component-name', function() {
  const [state, setState] = $(initialValue)
  
  return () => html`
    <div @click=${() => setState(state() + 1)}>
      ${state}
    </div>
  `
})
```

### Component with Props
```javascript
rain('user-card', {
  name: { type: String, default: 'Anonymous' },
  age: { type: Number, default: 0, validator: v => v >= 0 },
  active: { type: Boolean, default: false },
  data: { type: Object, default: null },
  items: { type: Array, default: [] },
  onUpdate: { type: Function, default: null }
}, function(props) {
  return () => html`
    <div class=${props().active ? 'active' : 'inactive'}>
      <h3>${props().name}</h3>
      <p>Age: ${props().age}</p>
    </div>
  `
})
```

### Shadow DOM Variants
```javascript
// Closed Shadow DOM (default)
rain('my-component', function() { ... })

// Open Shadow DOM
rain.open('my-component', function() { ... })

// Light DOM (no shadow DOM)
rain.light('my-component', function() { ... })
```

## Reactive State Management

### Signals (Basic State)
```javascript
const [count, setCount] = $(0)              // number
const [text, setText] = $('hello')          // string
const [flag, setFlag] = $(true)             // boolean
const [user, setUser] = $({ name: 'Alice' }) // object
const [items, setItems] = $(['a', 'b'])     // array

// Reading values
console.log(count())        // get current value
console.log(user().name)    // access object properties

// Updating values
setCount(42)                           // set new value
setCount(count() + 1)                  // increment
setUser({ ...user(), age: 31 })        // update object
setItems([...items(), 'new'])          // add to array
```

### Computed Values
```javascript
const doubled = $.computed(() => count() * 2)
const fullName = $.computed(() => `${first()} ${last()}`)
const status = $.computed(() => {
  if (loading()) return 'Loading...'
  if (error()) return 'Error occurred'
  return 'Ready'
})
```

### Effects (Side Effects)
```javascript
// Simple effect
$.effect(() => {
  document.title = `Count: ${count()}`
})

// Effect with cleanup
$.effect(() => {
  const timer = setInterval(() => console.log(count()), 1000)
  return () => clearInterval(timer)
})
```

## Template Syntax

### HTM Template Literals
```javascript
return () => html`
  <div>
    <!-- String interpolation -->
    <h1>Hello ${name}</h1>
    
    <!-- Event handlers -->
    <button @click=${handleClick}>Click</button>
    <input @input=${e => setValue(e.target.value)} />
    
    <!-- Attributes -->
    <div class=${className} id=${elementId}></div>
    <button disabled=${isDisabled}>Button</button>
    
    <!-- Conditional attributes -->
    <input type="checkbox" checked=${isChecked} />
    
    <!-- Slots -->
    <slot name="header"></slot>
    <slot name="content">Default content</slot>
  </div>
`
```

### Conditional Rendering
```javascript
// Using match() for complex conditions
${match(status, {
  'loading': () => html`<div>Loading...</div>`,
  'success': () => html`<div>Success!</div>`,
  'error': () => html`<div>Error occurred</div>`
})}

// With fallback
${match(userType, {
  'admin': () => html`<admin-panel />`,
  'user': () => html`<user-dashboard />`
}, () => html`<guest-view />`)}

// Simple ternary for basic conditions
${showContent ? html`<div>Content</div>` : ''}
```

### List Rendering
```javascript
// Simple lists (re-renders all items on change)
${list(items, item => html`<li>${item}</li>`)}

// Keyed lists (smart reconciliation - preferred)
${list(todos, 
  todo => html`
    <div>
      <input type="checkbox" checked=${todo.done} />
      <span>${todo.text}</span>
    </div>
  `,
  todo => todo.id  // key function
)}
```

### Fragments
```javascript
// Group elements without wrapper DOM
${showMultiple ? html`
  <frag>
    <h3>Title</h3>
    <p>Paragraph 1</p>
    <p>Paragraph 2</p>
  </frag>
` : ''}
```

## Styling

### Shadow DOM Scoped Styles
```javascript
return () => html`
  <style>
    .container { padding: 1rem; background: #f0f0f0; }
    .title { color: #333; margin: 0; }
  </style>
  <div class="container">
    <h2 class="title">Styled Component</h2>
  </div>
`
```

### Reactive CSS with css()
```javascript
const styles = css`
  .card {
    background: ${theme() === 'dark' ? '#333' : '#fff'};
    color: ${$.computed(() => theme() === 'dark' ? '#fff' : '#333')};
    padding: 1rem;
  }
`

return () => html`
  <div>
    ${styles}
    <div class="card">Content</div>
  </div>
`
```

### Light DOM Manual Styles
```javascript
// For light DOM components
return () => html`
  <div>
    ${dangerouslySetInnerHTML('<style>.my-comp { color: red; }</style>')}
    <div class="my-comp">Styled content</div>
  </div>
`
```

### Light DOM with Slot Emulation
```javascript
// Light DOM component with slot emulation
rain.light('my-light-component', function() {
  const slots = $.getSlots()  // Capture slotted content
  
  return () => html`
    <div>
      ${dangerouslySetInnerHTML('<style>.card { padding: 1rem; }</style>')}
      <div class="card">
        <header>${slots.header || html`<h2>Default Header</h2>`}</header>
        <main>${slots.content || slots.default || 'No content'}</main>
        <footer>${slots.footer || html`<small>Default footer</small>`}</footer>
      </div>
    </div>
  `
})
```

## Component Communication

### Custom Events
```javascript
// Emitting events
rain('sender', function() {
  const sendMessage = () => {
    this.emit('message-sent', { data: 'hello', timestamp: Date.now() })
  }
  
  return () => html`
    <button @click=${sendMessage}>Send</button>
  `
})

// Listening to events
rain('receiver', function() {
  const [message, setMessage] = $('')
  
  $.listen('message-sent', (event) => {
    setMessage(event.detail.data)
  })
  
  return () => html`<p>Received: ${message}</p>`
})
```

### Global Event System
```javascript
// Global event emission
$.emit('user-login', { userId: 123 })

// Global event listening with cleanup
const cleanup = $.listen('user-login', (e) => {
  console.log('User logged in:', e.detail.userId)
})
// cleanup() when no longer needed
```

### Light DOM Slot Emulation with $.getSlots()

Light DOM components can use `$.getSlots()` to emulate slot functionality:

```javascript
// Light DOM component with slot emulation
rain.light('my-slot-card', function() {
  const slots = $.getSlots()  // Must be called inside light DOM component factory
  
  return () => html`
    <div class="card">
      <div class="header">
        ${slots.header || html`<h3>Default Header</h3>`}
      </div>
      <div class="content">
        ${slots.content || slots.default || html`<p>No content provided</p>`}
      </div>
      <div class="footer">
        ${slots.footer || html`<small>Default footer</small>`}
      </div>
    </div>
  `
})
```

Usage with slotted content:
```html
<my-slot-card>
  <h2 slot="header">Custom Header</h2>
  <p slot="content">This goes in the content slot</p>
  <button slot="footer">Custom Footer Button</button>
</my-slot-card>

<!-- Elements without slot attribute go to 'default' slot -->
<my-slot-card>
  <p>This goes to default slot</p>
</my-slot-card>
```

**Important**: `$.getSlots()` only works in light DOM components (`rain.light()`) and must be called within the component factory function.

## Lifecycle Hooks

```javascript
rain('lifecycle-demo', function() {
  const [status, setStatus] = $('created')
  
  onMounted(() => {
    setStatus('mounted')
    console.log('Component mounted to DOM')
    
    // Cleanup function (optional)
    return () => {
      console.log('Mounted cleanup')
    }
  })
  
  onUnmounted(() => {
    console.log('Component removed from DOM')
  })
  
  return () => html`<p>Status: ${status}</p>`
})
```

## Props System

### Prop Types and Validation
```javascript
rain('validated-component', {
  // String with default
  name: { type: String, default: 'Anonymous' },
  
  // Number with validation
  age: { type: Number, default: 0, validator: v => v >= 0 && v <= 120 },
  
  // Boolean (attribute presence = true)
  active: { type: Boolean, default: false },
  
  // Object (JSON parsed from attribute)
  config: { type: Object, default: () => ({}) },
  
  // Array (JSON parsed from attribute)
  items: { type: Array, default: () => [] },
  
  // Function (must be set via JavaScript property)
  onChange: { type: Function, default: null },
  
  // Required prop
  id: { type: String, required: true }
}, function(props) {
  return () => html`<div id=${props().id}>${props().name}</div>`
})
```

### Reactive Props
```javascript
rain('reactive-props', { name: String }, function(props) {
  // Non-reactive (captures value once)
  const staticName = props().name
  
  // Reactive (updates when prop changes)
  const reactiveName = $.computed(() => props().name)
  const upperName = $.computed(() => props().name.toUpperCase())
  
  return () => html`
    <div>
      <p>Static: ${staticName}</p>
      <p>Reactive: ${reactiveName}</p>
      <p>Upper: ${upperName}</p>
    </div>
  `
})
```

## HTML Usage Patterns

### Basic Usage
```html
<!DOCTYPE html>
<html>
<head>
  <title>RainWC App</title>
</head>
<body>
  <!-- Components used like regular HTML elements -->
  <my-counter></my-counter>
  <user-card name="Alice" age="30" active></user-card>
  <todo-list items='["task1", "task2"]'></todo-list>
  
  <!-- Script after HTML for proper prop handling -->
  <script type="module">
    import { rain, html, $ } from './rainwc.esm.min.js'
    
    rain('my-counter', function() {
      const [count, setCount] = $(0)
      return () => html`
        <button @click=${() => setCount(count() + 1)}>
          Count: ${count}
        </button>
      `
    })
  </script>
</body>
</html>
```

### Slots and Content Projection
```html
<!-- Component definition -->
<script type="module">
rain('modal-dialog', {
  title: { type: String, default: 'Dialog' }
}, function(props) {
  return () => html`
    <div class="modal">
      <header>
        <h2>${props().title}</h2>
        <slot name="header-actions"></slot>
      </header>
      <main>
        <slot name="content"></slot>
      </main>
      <footer>
        <slot name="footer">
          <button>Close</button>
        </slot>
      </footer>
    </div>
  `
})
</script>

<!-- Component usage with slotted content -->
<modal-dialog title="Confirm">
  <button slot="header-actions">×</button>
  
  <div slot="content">
    <p>Are you sure?</p>
  </div>
  
  <div slot="footer">
    <button>Yes</button>
    <button>No</button>
  </div>
</modal-dialog>
```

## Common Patterns and Examples

### Form Component
```javascript
rain('contact-form', function() {
  const [formData, setFormData] = $({
    name: '',
    email: '',
    message: ''
  })
  const [errors, setErrors] = $({})
  const [submitting, setSubmitting] = $(false)
  
  const validate = () => {
    const errs = {}
    if (!formData().name) errs.name = 'Name required'
    if (!formData().email) errs.email = 'Email required'
    if (!formData().message) errs.message = 'Message required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }
  
  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setSubmitting(true)
    try {
      await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData())
      })
      setFormData({ name: '', email: '', message: '' })
      this.emit('form-submitted', formData())
    } catch (err) {
      console.error('Submit failed:', err)
    } finally {
      setSubmitting(false)
    }
  }
  
  const updateField = (field, value) => {
    setFormData({ ...formData(), [field]: value })
    if (errors()[field]) {
      setErrors({ ...errors(), [field]: null })
    }
  }
  
  return () => html`
    <form @submit=${submit}>
      <div>
        <label>Name:</label>
        <input 
          type="text" 
          value=${formData().name}
          @input=${e => updateField('name', e.target.value)}
        />
        ${errors().name ? html`<span class="error">${errors().name}</span>` : ''}
      </div>
      
      <div>
        <label>Email:</label>
        <input 
          type="email" 
          value=${formData().email}
          @input=${e => updateField('email', e.target.value)}
        />
        ${errors().email ? html`<span class="error">${errors().email}</span>` : ''}
      </div>
      
      <div>
        <label>Message:</label>
        <textarea 
          value=${formData().message}
          @input=${e => updateField('message', e.target.value)}
        ></textarea>
        ${errors().message ? html`<span class="error">${errors().message}</span>` : ''}
      </div>
      
      <button type="submit" disabled=${submitting}>
        ${submitting() ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  `
})
```

### Data Fetching Component
```javascript
rain('user-profile', {
  userId: { type: String, required: true }
}, function(props) {
  const [user, setUser] = $(null)
  const [loading, setLoading] = $(true)
  const [error, setError] = $(null)
  
  // Reactive data fetching
  $.effect(() => {
    const id = props().userId
    if (!id) return
    
    setLoading(true)
    setError(null)
    
    fetch(`/api/users/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then(userData => {
        setUser(userData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  })
  
  return () => html`
    <div class="user-profile">
      ${match(loading, {
        'true': () => html`<div class="loading">Loading user...</div>`,
        'false': () => match(error, {
          'null': () => html`
            <div class="user-info">
              <h2>${user()?.name}</h2>
              <p>Email: ${user()?.email}</p>
              <p>Joined: ${new Date(user()?.createdAt).toLocaleDateString()}</p>
            </div>
          `,
          '_': () => html`<div class="error">Error: ${error}</div>`
        })
      })}
    </div>
  `
})
```

### Counter with Persistence
```javascript
rain('persistent-counter', {
  storageKey: { type: String, default: 'counter' }
}, function(props) {
  // Load from localStorage
  const stored = localStorage.getItem(props().storageKey)
  const [count, setCount] = $(stored ? parseInt(stored, 10) : 0)
  
  // Save to localStorage on changes
  $.effect(() => {
    localStorage.setItem(props().storageKey, count().toString())
  })
  
  const increment = () => setCount(count() + 1)
  const decrement = () => setCount(count() - 1)
  const reset = () => setCount(0)
  
  return () => html`
    <div class="counter">
      <button @click=${decrement}>-</button>
      <span class="count">${count}</span>
      <button @click=${increment}>+</button>
      <button @click=${reset}>Reset</button>
    </div>
  `
})
```

## Error Handling

Components automatically handle rendering errors with built-in error boundaries:

```javascript
rain('error-prone', function() {
  const [shouldError, setShouldError] = $(false)
  
  return () => {
    if (shouldError()) {
      throw new Error('Intentional error for demo')
    }
    
    return html`
      <button @click=${() => setShouldError(true)}>
        Trigger Error
      </button>
    `
  }
})
```

## Key Rules for Code Generation

1. **Component Names**: Must contain hyphen (`my-component`, not `component`)
2. **Signal Access**: Always call signals as functions (`count()`, not `count`)
3. **Template Returns**: Components return a function that returns html`` template
4. **Event Handlers**: Use `@event=${handler}` syntax
5. **Attribute Binding**: Use `attribute=${value}` (not `.property=${value}`)
6. **Script Placement**: Place scripts after HTML elements for proper prop handling
7. **Prop Reactivity**: Use `$.computed(() => props().propName)` for reactive props
8. **List Keys**: Prefer keyed lists for dynamic content: `list(items, renderFn, keyFn)`
9. **Style Encapsulation**: Use `css` template literal or `<style>` tags in shadow DOM
10. **Event Communication**: Use `this.emit()` and `$.listen()` for component communication
11. **Light DOM Slots**: Use `$.getSlots()` only in light DOM components for slot emulation

This reference covers all essential patterns for generating correct RainWC code.