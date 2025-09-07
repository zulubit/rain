# 🌧️ RainWC

A lightweight reactive Web Components framework with fine-grained reactivity and JSX.

```jsx
// Simple counter component
rain('my-counter', function() {
  const [count, setCount] = $(0)
  
  return () => (
    <button onClick={() => setCount(count() + 1)}>
      Count: {count}
    </button>
  )
})
```

## Features

- **Fine-grained reactivity** with Preact signals
- **JSX syntax** with build-time compilation
- **Web Components** with reactive templates
- **Tiny size** - 16KB minified ESM bundle
- **TypeScript friendly** with full declarations
- **Universal plugin** for both esbuild and Vite

## Installation

```bash
npm install rainwc
```

## Quick Start

### Using with Vite

RainWC provides a Vite plugin that automatically configures JSX:

```bash
npm install rainwc vite
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import rainwc from 'rainwc/plugin'

export default defineConfig({
  plugins: [rainwc()],
  build: {
    lib: {
      entry: 'src/app.jsx',
      name: 'App',
      fileName: 'app',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        dir: 'static'
      }
    }
  }
})
```

This builds `src/app.jsx` into `static/app.js` without generating an HTML file.

Then write your components:

```jsx
// src/app.jsx
import { rain, $ } from 'rainwc'

rain('my-component', function() {
  const [count, setCount] = $(0)
  return () => <button onClick={() => setCount(count() + 1)}>Count: {count}</button>
})
```

### Preventing Flash of Unstyled Content (FOUC)

Add this CSS to your HTML `<head>` to prevent components from showing before they're defined:

```css
<style>
  :not(:defined) { visibility: hidden; }
  :not(:defined) * { visibility: hidden; }
</style>
```

This is especially useful for slotted content, which always appears before components mount and can cause visual flashes.

### Build and Serve

```bash
# Build your components
npm run build  # or: vite build

# Serve your app however you like
# The demo/ folder shows an example with Go
```

## Documentation

- [API Reference](api.md) - Complete API documentation
- [Rainbow](rainbow.md) - Server-driven paradigm for dynamic apps

## Examples

```jsx
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
  
  return () => (
    <div>
      <input 
        $value={input} 
        onInput={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && addTodo()}
        placeholder="Add todo..." 
      />
      <button onClick={addTodo}>Add</button>
      {$.list(todos, todo => 
        <div>{todo.text}</div>, 
        todo => todo.id
      )}
    </div>
  )
})
```

## Fragment Syntax

Use `<></>` for grouping elements:

```jsx
return () => (
  <>
    <h1>Title</h1>
    <p>Content</p>
  </>
)
```

## Acknowledgments

RainWC is built on top of excellent open source libraries:

- **[@preact/signals-core](https://github.com/preactjs/signals)** - Fine-grained reactivity system

## License

MIT
