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

### Using the Plugin (Works with both esbuild and Vite)

RainWC provides a universal plugin that automatically configures JSX for both esbuild and Vite:

```js
// esbuild.config.js
import { build } from 'esbuild'
import rainwc from 'rainwc/plugin'

await build({
  entryPoints: ['src/app.jsx'],
  outfile: 'dist/app.js',
  bundle: true,
  plugins: [rainwc()]
})
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import rainwc from 'rainwc/plugin'

export default defineConfig({
  plugins: [rainwc()]
})
```

Then write your components:

```jsx
// MyComponent.jsx
import { rain, $ } from 'rainwc'

rain('my-component', function() {
  const [count, setCount] = $(0)
  return () => <button onClick={() => setCount(count() + 1)}>Count: {count}</button>
})
```

### Manual Configuration

If you prefer to configure JSX manually:

```js
// esbuild or vite config
{
  jsx: 'transform',
  jsxFactory: 'jsx',
  jsxFragment: 'Fragment',
  jsxInject: `import { jsx, Fragment } from 'rainwc'`
}
```

## Documentation

- [API Reference](api.md) - Complete API documentation

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
