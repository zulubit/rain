// Import RainJS from the parent src directory (for development)
import { rain, html, $, list, match, onMounted } from '../src/index.js'
import '../src/grayscale-css.js' // Add CSS utilities

// Simple Counter Example
rain('simple-counter', function() {
  const [count, setCount] = $(0)
  
  const styles = $.css(() => `
    ${$.css.utility(['p-md', 'bg-light', 'rounded', 'text-center'])}
    
    .counter {
      font-size: 2rem;
      font-weight: bold;
      color: var(--color-primary);
      margin: 1rem 0;
    }
    
    .btn {
      background: var(--color-primary);
      color: white;
      border: none;
      padding: var(--space-xs) var(--space-sm);
      margin: 0 var(--space-xs);
      border-radius: var(--border-radius);
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s ease;
    }
    
    .btn:hover {
      opacity: 0.8;
    }
  `)
  
  return () => html`<>
    ${styles}
    <div class="p-md bg-light rounded text-center">
      <div class="counter">${count}</div>
      <button class="btn" @click=${() => setCount(count() - 1)}>-</button>
      <button class="btn" @click=${() => setCount(count() + 1)}>+</button>
      <button class="btn" @click=${() => setCount(0)}>Reset</button>
    </div>
  </>`
})

// Todo App Example
rain('todo-app', function() {
  const [todos, setTodos] = $([
    { id: 1, text: 'Learn RainJS', done: false },
    { id: 2, text: 'Build something awesome', done: true }
  ])
  const [newTodo, setNewTodo] = $('')
  const [filter, setFilter] = $('all')
  
  const filteredTodos = $.computed(() => {
    const items = todos()
    const filterVal = filter()
    if (filterVal === 'active') return items.filter(t => !t.done)
    if (filterVal === 'completed') return items.filter(t => t.done)
    return items
  })
  
  const addTodo = () => {
    if (newTodo().trim()) {
      setTodos([...todos(), { 
        id: Date.now(), 
        text: newTodo(), 
        done: false 
      }])
      setNewTodo('')
    }
  }
  
  const toggleTodo = (id) => {
    setTodos(todos().map(t => 
      t.id === id ? { ...t, done: !t.done } : t
    ))
  }
  
  const deleteTodo = (id) => {
    setTodos(todos().filter(t => t.id !== id))
  }
  
  const styles = $.css(() => `
    ${$.css.utility(['p-md', 'bg-light', 'rounded'])}
    
    .todo-form {
      display: flex;
      gap: var(--space-xs);
      margin-bottom: var(--space-md);
    }
    
    .todo-input {
      flex: 1;
      padding: var(--space-xs);
      border: var(--border-width) solid var(--color-secondary);
      border-radius: var(--border-radius);
      font-size: var(--text-md);
    }
    
    .btn {
      background: var(--color-primary);
      color: white;
      border: none;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--border-radius);
      cursor: pointer;
      font-size: var(--text-md);
    }
    
    .btn:hover {
      opacity: 0.8;
    }
    
    .btn-small {
      padding: var(--space-xs);
      font-size: var(--text-sm);
      margin-left: var(--space-xs);
    }
    
    .filter-tabs {
      display: flex;
      gap: var(--space-xs);
      margin-bottom: var(--space-md);
    }
    
    .filter-btn {
      background: transparent;
      border: var(--border-width) solid var(--color-secondary);
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--border-radius);
      cursor: pointer;
    }
    
    .filter-btn.active {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }
    
    .todo-item {
      display: flex;
      align-items: center;
      padding: var(--space-xs) 0;
      border-bottom: var(--border-width) solid var(--color-light);
    }
    
    .todo-item.done .todo-text {
      text-decoration: line-through;
      opacity: 0.6;
    }
    
    .todo-text {
      flex: 1;
      margin-left: var(--space-xs);
    }
  `)
  
  return () => html`<>
    ${styles}
    <div class="p-md bg-light rounded">
      <form class="todo-form" @submit=${(e) => { e.preventDefault(); addTodo() }}>
        <input 
          class="todo-input"
          type="text"
          value=${newTodo}
          @input=${(e) => setNewTodo(e.target.value)}
          placeholder="Add new todo..."
        />
        <button class="btn" type="submit">Add</button>
      </form>
      
      <div class="filter-tabs">
        <button 
          class="filter-btn ${filter() === 'all' ? 'active' : ''}"
          @click=${() => setFilter('all')}
        >All</button>
        <button 
          class="filter-btn ${filter() === 'active' ? 'active' : ''}"
          @click=${() => setFilter('active')}
        >Active</button>
        <button 
          class="filter-btn ${filter() === 'completed' ? 'active' : ''}"
          @click=${() => setFilter('completed')}
        >Completed</button>
      </div>
      
      <div>
        ${list(filteredTodos, todo => html`
          <div class="todo-item ${todo.done ? 'done' : ''}">
            <input 
              type="checkbox"
              checked=${todo.done}
              @change=${() => toggleTodo(todo.id)}
            />
            <span class="todo-text">${todo.text}</span>
            <button 
              class="btn btn-small"
              @click=${() => deleteTodo(todo.id)}
            >Delete</button>
          </div>
        `, todo => todo.id)}
      </div>
      
      ${() => filteredTodos().length === 0 ? html`
        <div class="text-center">
          <p>No todos found!</p>
          <small>Add some todos above</small>
        </div>
      ` : ''}
    </div>
  </>`
})

// Styled Card Example
rain('styled-card', {
  title: { type: String, default: 'Card Title' },
  subtitle: { type: String, default: 'Card subtitle' }
}, function(props) {
  const [isDark, setIsDark] = $(false)
  
  const styles = $.css(() => `
    ${$.css.utility(['p-lg', 'rounded', 'shadow'])}
    
    .card {
      background: ${isDark() ? 'var(--color-dark)' : 'var(--color-light)'};
      color: ${isDark() ? 'var(--color-light)' : 'var(--color-dark)'};
      transition: all 0.3s ease;
      border: var(--border-width) solid ${isDark() ? 'var(--color-secondary)' : 'var(--color-light)'};
    }
    
    .card-title {
      font-size: var(--text-xl);
      font-weight: bold;
      margin-bottom: var(--space-xs);
      color: var(--color-primary);
    }
    
    .card-subtitle {
      color: ${isDark() ? 'var(--color-secondary)' : 'var(--color-dark)'};
      margin-bottom: var(--space-md);
    }
    
    .toggle-btn {
      background: var(--color-primary);
      color: white;
      border: none;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .toggle-btn:hover {
      opacity: 0.8;
    }
  `)
  
  return () => html`<>
    ${styles}
    <div class="card p-lg rounded shadow">
      <h3 class="card-title">${() => props().title}</h3>
      <p class="card-subtitle">${() => props().subtitle}</p>
      <button class="toggle-btn" @click=${() => setIsDark(!isDark())}>
        Toggle ${isDark() ? 'Light' : 'Dark'} Mode
      </button>
    </div>
  </>`
})