# Reactivity

RainJS uses reactive signals for state management with automatic updates.

## Basic Signals

```javascript
rain('basic-signals', function() {
  const [count, setCount] = $(0)
  const [name, setName] = $('World')
  
  return () => html`
    <div>
      <p>Count: ${count}</p>
      <p>Hello ${name}</p>
      <button @click=${() => setCount(count() + 1)}>+</button>
      <button @click=${() => setName('RainJS')}>Change Name</button>
    </div>
  `
})
```

## Computed Values

```javascript
rain('computed-demo', function() {
  const [a, setA] = $(5)
  const [b, setB] = $(3)
  
  const sum = $.computed(() => a() + b())
  const product = $.computed(() => a() * b())
  
  return () => html`
    <div>
      <p>A: ${a} | B: ${b}</p>
      <p>Sum: ${sum}</p>
      <p>Product: ${product}</p>
      <button @click=${() => setA(a() + 1)}>A+</button>
      <button @click=${() => setB(b() + 1)}>B+</button>
    </div>
  `
})
```

## Effects

```javascript
rain('effects-demo', function() {
  const [title, setTitle] = $('RainJS')
  
  $.effect(() => {
    document.title = `${title()} - Reactivity Demo`
  })
  
  return () => html`
    <div>
      <p>Current title: ${title}</p>
      <p>Check browser tab title!</p>
      <button @click=${() => setTitle('Updated!')}>Change Title</button>
    </div>
  `
})
```

## Key Concepts

- **Signals**: `const [get, set] = $(value)` - reactive state
- **Computed**: `$.computed(() => expression)` - derived values
- **Effects**: `$.effect(() => sideEffect)` - run code when signals change
- **Auto-updates**: Templates automatically re-render when signals change

## Signal Patterns

```javascript
// Primitive values
const [count, setCount] = $(0)
const [text, setText] = $('hello')
const [flag, setFlag] = $(true)

// Objects and arrays
const [user, setUser] = $({ name: 'Alice', age: 30 })
const [items, setItems] = $(['a', 'b', 'c'])

// Reading values
console.log(count())        // get current value
console.log(user().name)    // access object properties

// Updating values
setCount(42)                           // set new value
setCount(count() + 1)                  // increment
setUser({ ...user(), age: 31 })        // update object
setItems([...items(), 'new'])          // add to array
```

## Computed Signals

```javascript
// Simple computation
const doubled = $.computed(() => count() * 2)

// Multiple dependencies
const fullName = $.computed(() => `${first()} ${last()}`)

// Complex logic
const status = $.computed(() => {
  if (loading()) return 'Loading...'
  if (error()) return 'Error occurred'
  return 'Ready'
})
```

## Effects for Side Effects

```javascript
// DOM manipulation
$.effect(() => {
  document.title = `Count: ${count()}`
})

// API calls
$.effect(() => {
  if (userId()) {
    fetch(`/api/users/${userId()}`)
      .then(r => r.json())
      .then(setUserData)
  }
})

// Cleanup
$.effect(() => {
  const timer = setInterval(() => {
    console.log('Tick:', count())
  }, 1000)
  
  return () => clearInterval(timer)
})
```

## Working Example

[examples/03-reactivity.html](../examples/03-reactivity.html)

## Next Steps

- [Templates](templates.md) - Template syntax
- [Components](components.md) - Component patterns
- [API Reference](api.md) - Complete function documentation