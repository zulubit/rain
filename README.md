# 🌧️ RainWC

A lightweight reactive Web Components framework with fine-grained reactivity and no build step required.

```javascript
// Simple counter component
rain('my-counter', function() {
  const [count, setCount] = $(0)
  
  return () => html`
    <button @click=${() => setCount(count() + 1)}>
      Count: ${count}
    </button>
  `
})
```

## Features

- **Fine-grained reactivity** with Preact signals
- **No build step** - works directly in the browser
- **Web Components** with reactive templates
- **Tiny size** - 7KB gzipped
- **TypeScript friendly** with full JSDoc annotations

## Installation

### NPM

```bash
npm install rainwc
```

```javascript
import { rain, html, $, css } from 'rainwc'
```

### CDN

```html
<script type="module">
  import { rain, html, $, css } from 'https://unpkg.com/rainwc/dist/rainwc.esm.min.js'
</script>
```

## Quick Start

```javascript
// Component with props
rain('user-card', ['name', 'age'], function(props) {
  return () => html`
    <div>
      <h3>${props.name() || 'Anonymous'}</h3>
      <p>Age: ${props.age() || '0'}</p>
    </div>
  `
})

// Use it in HTML
// <user-card name="Alice" age="25"></user-card>
```

## Documentation

- [API Reference](api.md) - Complete API documentation

## Example

```javascript
// Todo app with reactive state
rain('todo-app', function() {
  const [todos, setTodos] = $([])
  const [input, setInput] = $('')
  
  const addTodo = () => {
    if (input().trim()) {
      setTodos([...todos(), { id: Date.now(), text: input() }])
      setInput('')
    }
  }
  
  return () => html`
    <div>
      <input 
        .value=${input} 
        @input=${e => setInput(e.target.value)}
        @keypress=${e => e.key === 'Enter' && addTodo()}
        placeholder="Add todo..." 
      />
      <button @click=${addTodo}>Add</button>
      ${$.list(todos, todo => 
        html`<div>${todo.text}</div>`, 
        todo => todo.id
      )}
    </div>
  `
})
```

## Acknowledgments

RainWC is built on top of excellent open source libraries:

- **[@preact/signals-core](https://github.com/preactjs/signals)** - Fine-grained reactivity system
- **[HTM](https://github.com/developit/htm)** - JSX-like syntax using template literals

## License

MIT
