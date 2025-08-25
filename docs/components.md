# Components

RainWC components are Web Components with reactive templates and built-in state management. They provide encapsulation, lifecycle hooks, and seamless integration with existing HTML.

## Basic Component Structure

Every RainWC component follows this pattern:

```javascript
rain('component-name', function() {
  // 1. Set up reactive state
  const [state, setState] = $(initialValue)
  
  // 2. Define event handlers and computed values
  const handleClick = () => setState(state() + 1)
  
  // 3. Return template function
  return () => html`
    <div @click=${handleClick}>
      ${state}
    </div>
  `
})
```

## Component Names

Component names must follow Web Components naming rules:

- ✅ Must contain a hyphen: `my-component`, `user-card`, `nav-menu`
- ❌ Cannot be single words: `component`, `card`, `menu`
- ✅ Should be descriptive: `shopping-cart`, `user-profile`, `modal-dialog`

## Props and Type System

Components can accept typed props with defaults and validation:

```javascript
rain('user-card', {
  // String prop with default
  name: { type: String, default: 'Anonymous' },
  
  // Number prop with validation
  age: { type: Number, default: 0, validator: v => v >= 0 },
  
  // Boolean prop (presence = true)
  active: { type: Boolean, default: false },
  
  // Object prop with JSON parsing
  data: { type: Object, default: null },
  
  // Array prop with JSON parsing  
  items: { type: Array, default: [] },
  
  // Function prop (for callbacks)
  onUpdate: { type: Function, default: null }
}, function(props) {
  return () => html`
    <div class=${props().active ? 'active' : 'inactive'}>
      <h3>${props().name}</h3>
      <p>Age: ${props().age}</p>
      ${props().data ? html`<pre>${JSON.stringify(props().data, null, 2)}</pre>` : ''}
    </div>
  `
})
```

### Using Props

```html
<!-- String and number attributes -->
<user-card name="Alice" age="30"></user-card>

<!-- Boolean attributes (presence = true) -->
<user-card name="Bob" age="25" active></user-card>

<!-- JSON for objects/arrays -->
<user-card 
  name="Carol" 
  data='{"role": "admin", "team": "frontend"}'
  items='["task1", "task2", "task3"]'>
</user-card>
```

### Script Placement with Props

**Important**: When using components with props, script placement affects prop availability due to standard Web Components timing:

```html
<!-- ❌ Script in head - props show defaults -->
<head>
  <script type="module">
    import { rain, html, $ } from './rainwc.esm.min.js'
    
    rain('my-component', { name: String }, function(props) {
      return () => html`<div>Hello ${props().name}</div>`
    })
  </script>
</head>
<body>
  <my-component name="Alice"></my-component> <!-- Shows "Hello " (default) -->
</body>
```

```html
<!-- ✅ Script after elements - props work correctly -->
<body>
  <my-component name="Alice"></my-component> <!-- Shows "Hello Alice" -->
  
  <script type="module">
    import { rain, html, $ } from './rainwc.esm.min.js'
    
    rain('my-component', { name: String }, function(props) {
      return () => html`<div>Hello ${props().name}</div>`
    })
  </script>
</body>
```

**Why this happens**: This is standard Web Components behavior. When custom elements are defined after HTML parsing, the browser creates placeholder elements first, then upgrades them when the definition becomes available. During the upgrade, attributes aren't accessible in the constructor phase.

**Solutions**:
1. **Place scripts after HTML elements** (recommended)
2. **Use computed props for reactivity** when needed:
   ```javascript
   rain('my-component', { name: String }, function(props) {
     const name = $.computed(() => props().name)
     return () => html`<div>Hello ${name}</div>`
   })
   ```

### Reactive Props

Props are not reactive by default. To make them reactive, use `$.computed()`:

```javascript
rain('reactive-user', {
  name: { type: String, default: 'Anonymous' }
}, function(props) {
  // Non-reactive (won't update if prop changes)
  const staticName = props().name
  
  // Reactive (updates when prop changes)
  const reactiveName = $.computed(() => props().name)
  const upperName = $.computed(() => props().name.toUpperCase())
  
  return () => html`
    <div>
      <p>Static: ${staticName}</p>
      <p>Reactive: ${reactiveName}</p>
      <p>Computed: ${upperName}</p>
    </div>
  `
})
```

## Lifecycle Hooks

Components have access to lifecycle hooks:

```javascript
// Lifecycle demo
rain('lifecycle-demo', function() {
  const [status, setStatus] = $('Created')
  
  onMounted(() => {
    setStatus('Mounted')
    console.log('Component mounted!')
  })
  
  onUnmounted(() => {
    console.log('Component unmounted!')
  })
  
  return () => html`
    <p>Status: ${status}</p>
  `
})
```

## Events and Communication

### Custom Events

Components can emit custom events:

```javascript
rain('event-sender', function() {
  const [message, setMessage] = $('')
  
  const sendEvent = () => {
    // Emit custom event with data
    this.emit('message-sent', { 
      message: message(), 
      timestamp: Date.now() 
    })
  }
  
  return () => html`
    <div>
      <input 
        type="text" 
        value=${message}
        @input=${e => setMessage(e.target.value)}
      />
      <button @click=${sendEvent}>Send Message</button>
    </div>
  `
})
```

### Listening to Events

```javascript
rain('event-listener', function() {
  const [received, setReceived] = $([])
  
  // Listen for custom events with automatic cleanup
  $.listen('message-sent', (event) => {
    setReceived([...received(), event.detail])
  })
  
  return () => html`
    <div>
      <h3>Received Messages:</h3>
      ${received().map(msg => html`
        <p>${msg.message} (${new Date(msg.timestamp).toLocaleTimeString()})</p>
      `)}
    </div>
  `
})
```

## Slots and Content Projection

Slots allow components to accept and render external content:

```javascript
rain('modal-dialog', {
  title: { type: String, default: 'Dialog' },
  open: { type: Boolean, default: false }
}, function(props) {
  return () => html`
    <div class="modal" style="display: ${props().open ? 'block' : 'none'}">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${props().title}</h2>
          <slot name="header-actions"></slot>
        </div>
        <div class="modal-body">
          <slot name="body"></slot>
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <button>Close</button>
          </slot>
        </div>
      </div>
    </div>
  `
})
```

Usage with slotted content:

```html
<modal-dialog title="Confirm Action" open>
  <!-- Close button in header -->
  <button slot="header-actions" onclick="closeModal()">×</button>
  
  <!-- Main content -->
  <div slot="body">
    <p>Are you sure you want to delete this item?</p>
    <p><strong>This action cannot be undone.</strong></p>
  </div>
  
  <!-- Custom footer buttons -->
  <div slot="footer">
    <button onclick="confirmDelete()">Delete</button>
    <button onclick="closeModal()">Cancel</button>
  </div>
</modal-dialog>
```

### Default Slot Content

Slots can have default content that shows when no slotted content is provided:

```javascript
return () => html`
  <div class="card">
    <slot name="content">
      <p>No content provided</p>
    </slot>
  </div>
`
```

## Light DOM Slot Emulation

Light DOM components can emulate slot behavior using `$.getSlots()`:

```javascript
rain.light('light-modal', {
  title: { type: String, default: 'Modal' },
  open: { type: Boolean, default: false }
}, function(props) {
  const slots = $.getSlots()  // Capture slotted content
  
  return () => html`
    <div>
      ${dangerouslySetInnerHTML(`
        <style>
          .modal { display: ${props().open ? 'block' : 'none'}; }
          .modal-header { font-weight: bold; border-bottom: 1px solid #ccc; }
          .modal-body { padding: 1rem 0; }
          .modal-footer { border-top: 1px solid #ccc; padding-top: 0.5rem; }
        </style>
      `)}
      <div class="modal">
        <div class="modal-header">
          <h2>${props().title}</h2>
          ${slots.headerActions || ''}
        </div>
        <div class="modal-body">
          ${slots.content || slots.default || html`<p>No content provided</p>`}
        </div>
        <div class="modal-footer">
          ${slots.footer || html`<button>Close</button>`}
        </div>
      </div>
    </div>
  `
})
```

Usage with slotted content:

```html
<light-modal title="Confirm Action" open>
  <button slot="headerActions">×</button>
  
  <div slot="content">
    <p>Are you sure you want to proceed?</p>
    <p><strong>This action cannot be undone.</strong></p>
  </div>
  
  <div slot="footer">
    <button onclick="confirm()">Yes</button>
    <button onclick="cancel()">No</button>
  </div>
</light-modal>
```

### Key Differences from Shadow DOM Slots

- **Slot capture**: `$.getSlots()` captures content at component creation time
- **Manual rendering**: Developer controls where slots are rendered in template
- **No automatic projection**: Content doesn't automatically flow to slots
- **Fallback handling**: Use `||` operator for fallback content
- **Light DOM only**: Function only available in `rain.light()` components

### Multiple Elements in Same Slot

Multiple elements with the same slot name are grouped together:

```html
<my-component>
  <p slot="content">First paragraph</p>
  <p slot="content">Second paragraph</p>
  <span slot="content">And a span</span>
</my-component>
```

All three elements will be available in `slots.content` as a DocumentFragment.

## Nested Components

Components can contain other components:

```javascript
// Child component
rain('child-comp', function() {
  return () => html`<span>I am a child</span>`
})

// Parent component using child
rain('user-profile', function() {
  return () => html`
    <div>
      <p>Parent component:</p>
      <child-comp></child-comp>
    </div>
  `
})
```

### Component Communication

Components can communicate through custom events:

```javascript
// Counter that emits events
rain('counter-with-events', function() {
  const [count, setCount] = $(0)
  
  const increment = () => {
    const newCount = count() + 1
    setCount(newCount)
    // Emit custom event when counter changes
    $.emit('count-changed', { count: newCount })
  }
  
  return () => html`
    <button @click=${increment}>
      Count: ${count}
    </button>
  `
})

// Component that listens for events
rain('event-display', function() {
  const [message, setMessage] = $('Waiting for events...')
  
  // Listen for events with automatic cleanup
  $.listen('count-changed', (e) => {
    setMessage(`Counter changed to: ${e.detail.count}`)
  })
  
  return () => html`<p>${message}</p>`
})
```

## Component Composition

Components can be composed together for reusability:

```javascript
// Base button component
rain('base-button', {
  variant: { type: String, default: 'primary' },
  disabled: { type: Boolean, default: false }
}, function(props) {
  return () => html`
    <button 
      class="btn btn-${props().variant}"
      disabled=${props().disabled}
    >
      <slot></slot>
    </button>
  `
})

// Specialized save button
rain('save-button', {
  saving: { type: Boolean, default: false }
}, function(props) {
  return () => html`
    <base-button 
      variant="success" 
      disabled=${props().saving}
    >
      ${props().saving ? 'Saving...' : 'Save'}
    </base-button>
  `
})
```

## Shadow DOM and Styling

RainWC components use Shadow DOM by default, providing style encapsulation:

```javascript
rain('styled-component', function() {
  return () => html`
    <style>
      /* Styles are scoped to this component */
      .container {
        padding: 1rem;
        background: #f0f0f0;
        border-radius: 8px;
      }
      
      .title {
        color: #333;
        margin: 0 0 1rem 0;
      }
    </style>
    
    <div class="container">
      <h2 class="title">Styled Component</h2>
      <p>This component has isolated styles.</p>
    </div>
  `
})
```

### Reactive CSS with css

For reactive styling, use the `css` template literal to create computed style elements:

```javascript
rain('theme-card', {
  theme: { type: String, default: 'light' }
}, function(props) {
  const bgColor = $.computed(() => 
    props().theme === 'dark' ? '#333' : '#fff'
  )
  
  const styles = css`
    .card {
      background: ${bgColor};
      color: ${$.computed(() => props().theme === 'dark' ? '#fff' : '#333')};
      padding: 1rem;
      border-radius: 8px;
    }
  `
  
  return () => html`
    <div class="card">
      ${styles}
      <h3>Theme: ${props().theme}</h3>
      <p>Reactive styling with $.css</p>
    </div>
  `
})
```

### CSS Custom Properties

Use CSS custom properties to create themeable components:

```javascript
rain('themed-card', {
  color: { type: String, default: 'blue' }
}, function(props) {
  return () => html`
    <style>
      .card {
        --card-color: ${props().color};
        border: 2px solid var(--card-color);
        padding: 1rem;
        border-radius: 8px;
      }
      
      .title {
        color: var(--card-color);
        margin: 0;
      }
    </style>
    
    <div class="card">
      <h3 class="title">Themed Card</h3>
      <slot></slot>
    </div>
  `
})
```

## Error Handling

Components automatically handle rendering errors:

```javascript
rain('error-prone', function() {
  const [shouldError, setShouldError] = $(false)
  
  return () => {
    if (shouldError()) {
      // This will be caught and show an error boundary
      throw new Error('Intentional error for demo')
    }
    
    return html`
      <div>
        <button @click=${() => setShouldError(true)}>
          Trigger Error
        </button>
      </div>
    `
  }
})
```

When a component throws an error, RainWC will:
1. Log the error with context
2. Render a fallback error UI
3. Prevent the error from breaking other components

## Best Practices

### 1. Keep Components Focused
Each component should have a single responsibility:

```javascript
// ✅ Good - focused component
rain('user-avatar', { src: String, name: String }, ...)

// ❌ Avoid - too many responsibilities
rain('user-everything', { 
  src: String, name: String, posts: Array, 
  friends: Array, settings: Object 
}, ...)
```

### 2. Use Descriptive Names
Component names should clearly indicate their purpose:

```javascript
// ✅ Clear and descriptive
rain('shopping-cart-item', ...)
rain('user-profile-card', ...)
rain('navigation-menu', ...)

// ❌ Vague or unclear
rain('my-thing', ...)
rain('widget-one', ...)
rain('comp-a', ...)
```

### 3. Validate Props When Needed
Use validation for critical props:

```javascript
rain('progress-bar', {
  value: { 
    type: Number, 
    default: 0,
    validator: v => v >= 0 && v <= 100
  }
}, ...)
```

### 4. Clean Up Resources
Always clean up in lifecycle hooks:

```javascript
onMounted(() => {
  const subscription = someService.subscribe(...)
  const interval = setInterval(...)
  
  return () => {
    subscription.unsubscribe()
    clearInterval(interval)
  }
})
```

## Working Examples

- [examples/01-getting-started.html](../examples/01-getting-started.html) - Basic components with props and slots
- [examples/02-components.html](../examples/02-components.html) - Advanced component patterns:
  - Nested components and hierarchies
  - Component communication with events
  - Lifecycle hooks and cleanup
  - Error handling and boundaries

## Next Steps

- Learn about [Reactivity](reactivity.md) and reactive state management
- Explore [Templates](templates.md) and template syntax
- Check the [API Reference](api.md) for complete function documentation