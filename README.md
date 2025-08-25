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
- **Light DOM support** with slot emulation for SSR compatibility
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

// Light DOM component with slot emulation
rain.light('my-card', function() {
  const slots = $.getSlots()
  
  return () => html`
    <div class="card">
      <header>${slots.header || html`<h2>Default</h2>`}</header>
      <main>${slots.content || 'No content'}</main>
    </div>
  `
})

// Use it in HTML
// <user-card name="Alice" age="25"></user-card>
// <my-card><h1 slot="header">Title</h1><p slot="content">Body</p></my-card>
```

## Documentation

- [Getting Started](docs/getting-started.md) - Installation and first component
- [Components](docs/components.md) - Creating and using components
- [Reactivity](docs/reactivity.md) - Signals and reactive state
- [Templates](docs/templates.md) - HTM templates and directives
- [API Reference](docs/api.md) - Complete API documentation

## Examples

Browse the [examples](examples/) directory for working demos of all features.

## Acknowledgments

RainWC is built on top of excellent open source libraries:

- **[@preact/signals-core](https://github.com/preactjs/signals)** - Fine-grained reactivity system
- **[HTM](https://github.com/developit/htm)** - JSX-like syntax using template literals

## License

MIT
