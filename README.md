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
- **Zero config** with Vite plugin

## Installation

### NPM

```bash
npm install rainwc
```

### Vite Setup (Recommended)

```js
// vite.config.js
import { defineConfig } from 'vite'
import { rainwc } from 'rainwc/plugin'

export default defineConfig({
  plugins: [rainwc()]
})
```

```jsx
// MyComponent.jsx
import { rain, $ } from 'rainwc'

function MyComponent() {
  const [count, setCount] = $(0)
  return () => <button onClick={() => setCount(count() + 1)}>Count: {count}</button>
}

rain('my-component', MyComponent)
```

### Manual Build Configuration

If not using the Vite plugin, configure your build tool:

```js
// For esbuild/Vite
{
  jsx: 'transform',
  jsxFactory: 'jsx',
  jsxFragment: 'Fragment'
}
```

Then import jsx:

```jsx
import { rain, jsx, $ } from 'rainwc'
```

## Quick Start

```jsx
// Component with props
rain('user-card', ['name', 'age'], function(props) {
  return () => (
    <div>
      <h3>{props.name() || 'Anonymous'}</h3>
      <p>Age: {props.age() || '0'}</p>
    </div>
  )
})

// Use it in HTML
// <user-card name="Alice" age="25"></user-card>
```

## Documentation

- [API Reference](api.md) - Complete API documentation

## Example

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
        value={input} 
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