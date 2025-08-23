# Getting Started

RainWC is a lightweight reactive Web Components framework. No build step required.

## Your First Component

```html
<script type="module">
import { rain, html, $ } from './rainwc.esm.min.js'

// Simple counter
rain('my-counter', function() {
  const [count, setCount] = $(0)
  
  return () => html`
    <div>
      <h3>Count: ${count}</h3>
      <button @click=${() => setCount(count() - 1)}>-</button>
      <button @click=${() => setCount(count() + 1)}>+</button>
      <button @click=${() => setCount(0)}>Reset</button>
    </div>
  `
})
</script>

<my-counter></my-counter>
```

## Components with Props

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
      <p>Status: ${props().active ? '✅ Active' : '⭕ Inactive'}</p>
    </div>
  `
})
```

```html
<user-card name="Alice" age="30" active></user-card>
<user-card name="Bob" age="25"></user-card>
```

## Slots for Content Projection

```javascript
rain('card-with-slot', {
  title: { type: String, default: 'Card Title' }
}, function(props) {
  return () => html`
    <div>
      <h3>${props().title}</h3>
      <div>
        <slot name="content"></slot>
      </div>
    </div>
  `
})
```

```html
<card-with-slot title="Project Status">
  <ul slot="content">
    <li>✅ Design completed</li>
    <li>🔄 Development in progress</li>
    <li>⏳ Testing pending</li>
  </ul>
</card-with-slot>
```

## Key Concepts

- **Components**: `rain('name', factory)` - names need hyphens
- **State**: `const [get, set] = $(value)` - reactive tuples  
- **Templates**: `html\`<div>${value}</div>\`` - HTM syntax
- **Events**: `@click=${handler}` - event binding
- **Props**: Typed with defaults and validation
- **Slots**: `<slot name="content">` for content projection

## Next Steps

- [Components](components.md) - Advanced patterns
- [Reactivity](reactivity.md) - Signals and effects
- [Templates](templates.md) - Template syntax
- [API Reference](api.md) - Complete API

## Working Example

[examples/01-getting-started.html](../examples/01-getting-started.html)