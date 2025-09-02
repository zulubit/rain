/**
 * Rain.js Examples - Comprehensive Showcase
 * Demonstrates all Rain.js features with correct syntax
 */

const { $, html, css, rain, onMounted, onUnmounted } = RainWC

// =============================================================================
// 1. BASIC COMPONENTS
// =============================================================================

// Simple counter - demonstrates basic signals and event handling
rain('demo-counter', function() {
  const [count, setCount] = $(0)
  
  const increment = () => setCount(count() + 1)
  const decrement = () => setCount(count() - 1)
  const reset = () => setCount(0)
  
  return () => html`
    <div class="counter">
      <h3>Count: ${count}</h3>
      <div class="button-group">
        <button @click=${decrement}>-1</button>
        <button @click=${reset}>Reset</button>
        <button @click=${increment}>+1</button>
      </div>
    </div>
  `
})

// =============================================================================
// 2. PROPS AND ATTRIBUTES
// =============================================================================

// User card with props
rain('user-card', ['name', 'age', 'email', 'active', 'role'], function() {
  const [props, setProps] = $({})
  
  // Set up prop watching
  onMounted(() => {
    const updateProps = () => {
      const newProps = {
        name: this.getAttribute('name') || 'Anonymous User',
        age: parseInt(this.getAttribute('age')) || 18,
        email: this.getAttribute('email') || 'user@example.com',
        active: this.getAttribute('active') === 'true',
        role: this.getAttribute('role') || 'user'
      }
      setProps(newProps)
    }
    
    updateProps()
    
    // Watch for attribute changes
    const observer = new MutationObserver(updateProps)
    observer.observe(this, { attributes: true })
    
    return () => observer.disconnect()
  })
  
  const roleColor = $.computed(() => {
    const role = props().role
    switch(role) {
      case 'admin': return '#dc3545'
      case 'moderator': return '#fd7e14'  
      case 'premium': return '#6f42c1'
      default: return '#6c757d'
    }
  })
  
  const statusBadge = $.computed(() => 
    props().active ? 'Active' : 'Inactive'
  )
  
  return () => html`
    <div class="user-card">
      <div class="user-header">
        <h3>${() => props().name}</h3>
        <span class="role-badge" style="background-color: ${roleColor}">
          ${() => props().role}
        </span>
      </div>
      <div class="user-info">
        <p><strong>Age:</strong> ${() => props().age}</p>
        <p><strong>Email:</strong> ${() => props().email}</p>
        <p><strong>Status:</strong> 
          <span class="status ${$.computed(() => props().active ? 'active' : 'inactive')}">
            ${statusBadge}
          </span>
        </p>
      </div>
    </div>
  `
})

// =============================================================================
// 3. COMPUTED VALUES AND REACTIVITY
// =============================================================================

// Calculator demonstrating computed values
rain('demo-calculator', function() {
  const [a, setA] = $(10)
  const [b, setB] = $(5)
  const [operation, setOperation] = $('add')
  
  const result = $.computed(() => {
    switch(operation()) {
      case 'add': return a() + b()
      case 'subtract': return a() - b()
      case 'multiply': return a() * b()
      case 'divide': return b() !== 0 ? (a() / b()).toFixed(2) : 'Error'
      default: return 0
    }
  })
  
  const expression = $.computed(() => {
    const symbols = {
      add: '+',
      subtract: '-', 
      multiply: '×',
      divide: '÷'
    }
    return `${a()} ${symbols[operation()]} ${b()} = ${result()}`
  })
  
  return () => html`
    <div class="calculator">
      <h3>Calculator</h3>
      <div class="calc-display">
        ${expression}
      </div>
      <div class="calc-inputs">
        <div class="input-group">
          <label>A:</label>
          <input type="number" .value=${a} @input=${(e) => setA(+e.target.value)} />
        </div>
        <div class="input-group">
          <label>Operation:</label>
          <select .value=${operation} @change=${(e) => setOperation(e.target.value)}>
            <option value="add">Add (+)</option>
            <option value="subtract">Subtract (-)</option>
            <option value="multiply">Multiply (×)</option>
            <option value="divide">Divide (÷)</option>
          </select>
        </div>
        <div class="input-group">
          <label>B:</label>
          <input type="number" .value=${b} @input=${(e) => setB(+e.target.value)} />
        </div>
      </div>
    </div>
  `
})

// =============================================================================
// 4. CONDITIONAL RENDERING
// =============================================================================

// Login form with conditional rendering using $.if
rain('demo-login', function() {
  const [username, setUsername] = $('')
  const [password, setPassword] = $('')
  const [isLoggedIn, setIsLoggedIn] = $(false)
  const [isLoading, setIsLoading] = $(false)
  const [user, setUser] = $(null)
  
  const login = async () => {
    if (!username() || !password()) return
    
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setUser({ name: username(), lastLogin: new Date().toLocaleTimeString() })
    setIsLoggedIn(true)
    setIsLoading(false)
  }
  
  const logout = () => {
    setIsLoggedIn(false)
    setUser(null)
    setUsername('')
    setPassword('')
  }
  
  const canLogin = $.computed(() => username() && password() && !isLoading())
  
  return () => html`
    <div class="login-demo">
      <h3>Login Demo</h3>
      
      ${$.if(isLoggedIn,
        () => html`
          <div class="welcome">
            <h4>Welcome, ${() => user().name}!</h4>
            <p>Last login: ${() => user().lastLogin}</p>
            <button @click=${logout} class="btn-secondary">Logout</button>
          </div>
        `,
        () => html`
          <div class="login-form">
            <div class="form-group">
              <input 
                type="text" 
                .value=${username}
                @input=${(e) => setUsername(e.target.value)}
                placeholder="Username"
                .disabled=${isLoading}
              />
            </div>
            <div class="form-group">
              <input 
                type="password"
                .value=${password} 
                @input=${(e) => setPassword(e.target.value)}
                placeholder="Password"
                .disabled=${isLoading}
              />
            </div>
            <button 
              @click=${login}
              .disabled=${$.computed(() => !canLogin())}
              class="btn-primary"
            >
              ${$.if(isLoading, () => 'Logging in...', () => 'Login')}
            </button>
          </div>
        `
      )}
    </div>
  `
})

// =============================================================================
// 5. LISTS AND RECONCILIATION
// =============================================================================

// Todo list with keyed reconciliation
rain('demo-todolist', function() {
  const [todos, setTodos] = $([
    { id: 1, text: 'Learn Rain.js', completed: false, priority: 'high' },
    { id: 2, text: 'Build awesome app', completed: false, priority: 'medium' },
    { id: 3, text: 'Deploy to production', completed: false, priority: 'low' }
  ])
  const [newTodo, setNewTodo] = $('')
  const [filter, setFilter] = $('all')
  let nextId = 4
  
  const addTodo = () => {
    if (!newTodo().trim()) return
    const todo = { 
      id: nextId++, 
      text: newTodo(), 
      completed: false, 
      priority: 'medium' 
    }
    setTodos([...todos(), todo])
    setNewTodo('')
  }
  
  const toggleTodo = (id) => {
    setTodos(todos().map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }
  
  const deleteTodo = (id) => {
    setTodos(todos().filter(todo => todo.id !== id))
  }
  
  const updatePriority = (id, priority) => {
    setTodos(todos().map(todo => 
      todo.id === id ? { ...todo, priority } : todo
    ))
  }
  
  const filteredTodos = $.computed(() => {
    const list = todos()
    switch(filter()) {
      case 'active': return list.filter(t => !t.completed)
      case 'completed': return list.filter(t => t.completed)
      default: return list
    }
  })
  
  const stats = $.computed(() => {
    const list = todos()
    const completed = list.filter(t => t.completed).length
    const total = list.length
    return { completed, active: total - completed, total }
  })
  
  return () => html`
    <div class="todo-demo">
      <h3>Todo List (${() => stats().total} items)</h3>
      
      <div class="todo-input">
        <input 
          type="text"
          .value=${newTodo}
          @input=${(e) => setNewTodo(e.target.value)}
          @keydown=${(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
        />
        <button @click=${addTodo} class="btn-primary">Add</button>
      </div>
      
      <div class="todo-filters">
        <button 
          @click=${() => setFilter('all')}
          class="filter-btn ${$.computed(() => filter() === 'all' ? 'active' : '')}"
        >
          All (${() => stats().total})
        </button>
        <button 
          @click=${() => setFilter('active')}
          class="filter-btn ${$.computed(() => filter() === 'active' ? 'active' : '')}"
        >
          Active (${() => stats().active})
        </button>
        <button 
          @click=${() => setFilter('completed')}
          class="filter-btn ${$.computed(() => filter() === 'completed' ? 'active' : '')}"
        >
          Completed (${() => stats().completed})
        </button>
      </div>
      
      <div class="todo-list">
        ${$.list(
          filteredTodos,
          (todo) => html`
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
              <input 
                type="checkbox"
                .checked=${todo.completed}
                @change=${() => toggleTodo(todo.id)}
              />
              <span class="todo-text">${todo.text}</span>
              <select 
                .value=${todo.priority}
                @change=${(e) => updatePriority(todo.id, e.target.value)}
                class="priority-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button @click=${() => deleteTodo(todo.id)} class="btn-danger">×</button>
            </div>
          `,
          (todo) => todo.id
        )}
      </div>
      
      ${$.if($.computed(() => filteredTodos().length === 0),
        () => html`<p class="empty-state">No todos match the current filter.</p>`
      )}
    </div>
  `
})

// =============================================================================
// 6. EFFECTS AND LIFECYCLE
// =============================================================================

// Document title updater with effects
rain('demo-effects', function() {
  const [pageTitle, setPageTitle] = $('Rain.js Demo')
  const [notification, setNotification] = $('')
  const [count, setCount] = $(0)
  
  // Effect to update document title
  $.effect(() => {
    document.title = pageTitle()
  })
  
  // Effect to show notification when count changes
  $.effect(() => {
    const currentCount = count()
    if (currentCount > 0) {
      setNotification(`Count changed to ${currentCount}`)
      // Clear notification after 2 seconds
      setTimeout(() => setNotification(''), 2000)
    }
  })
  
  // Lifecycle hooks
  onMounted(() => {
    console.log('Effects demo mounted')
    setNotification('Component mounted!')
  })
  
  onUnmounted(() => {
    console.log('Effects demo unmounted')
    document.title = 'Rain.js Examples' // Reset title
  })
  
  return () => html`
    <div class="effects-demo">
      <h3>Effects & Lifecycle</h3>
      <div class="form-group">
        <label>Page Title:</label>
        <input 
          type="text"
          .value=${pageTitle}
          @input=${(e) => setPageTitle(e.target.value)}
        />
        <small>Updates the browser tab title</small>
      </div>
      
      <div class="form-group">
        <label>Counter (triggers notification):</label>
        <button @click=${() => setCount(count() + 1)}>
          Count: ${count}
        </button>
      </div>
      
      ${$.if($.computed(() => notification()),
        () => html`<div class="notification">${notification}</div>`
      )}
    </div>
  `
})

// =============================================================================
// 7. REACTIVE CSS
// =============================================================================

// Theme switcher with reactive CSS
rain('demo-theme', function() {
  const [theme, setTheme] = $('light')
  const [accentColor, setAccentColor] = $('#007bff')
  
  const isDark = $.computed(() => theme() === 'dark')
  
  const themeStyles = css`
    .themed-container {
      background: ${$.computed(() => isDark() ? '#2d3748' : '#ffffff')};
      color: ${$.computed(() => isDark() ? '#e2e8f0' : '#2d3748')};
      border: 2px solid ${accentColor};
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }
    
    .theme-btn {
      background: ${accentColor};
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin: 0.25rem;
    }
    
    .color-preview {
      width: 30px;
      height: 30px;
      background: ${accentColor};
      border-radius: 50%;
      display: inline-block;
      margin-left: 0.5rem;
      border: 2px solid ${$.computed(() => isDark() ? '#4a5568' : '#e2e8f0')};
    }
  `
  
  const presetColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14']
  
  return () => html`
    <div class="themed-container">
      ${themeStyles}
      <h3>Reactive CSS Theme Demo</h3>
      
      <div class="theme-controls">
        <div class="form-group">
          <label>Theme:</label>
          <button 
            @click=${() => setTheme(theme() === 'light' ? 'dark' : 'light')}
            class="theme-btn"
          >
            Switch to ${$.computed(() => isDark() ? 'Light' : 'Dark')}
          </button>
        </div>
        
        <div class="form-group">
          <label>Accent Color:</label>
          <input 
            type="color"
            .value=${accentColor}
            @input=${(e) => setAccentColor(e.target.value)}
          />
          <span class="color-preview"></span>
        </div>
        
        <div class="form-group">
          <label>Preset Colors:</label>
          <div class="color-presets">
            ${$.list(
              () => presetColors,
              (color) => html`
                <button 
                  @click=${() => setAccentColor(color)}
                  class="color-preset"
                  style="background: ${color}"
                  title=${color}
                ></button>
              `
            )}
          </div>
        </div>
      </div>
      
      <p>This container's styling updates reactively based on theme and accent color changes.</p>
    </div>
  `
})

// =============================================================================
// 8. EVENTS AND COMMUNICATION
// =============================================================================

// Event emitter component
rain('demo-emitter', function() {
  const [message, setMessage] = $('')
  const [counter, setCounter] = $(0)
  
  const sendMessage = () => {
    if (!message().trim()) return
    $.emit('demo-message', { message: message(), timestamp: Date.now() })
    setMessage('')
  }
  
  const sendCounter = () => {
    const newCount = counter() + 1
    setCounter(newCount)
    $.emit('demo-counter', { count: newCount })
  }
  
  return () => html`
    <div class="event-emitter">
      <h4>Event Emitter</h4>
      <div class="form-group">
        <input 
          type="text"
          .value=${message}
          @input=${(e) => setMessage(e.target.value)}
          @keydown=${(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Enter a message"
        />
        <button @click=${sendMessage} class="btn-primary">Send Message</button>
      </div>
      
      <div class="form-group">
        <button @click=${sendCounter} class="btn-secondary">
          Send Counter (${counter})
        </button>
      </div>
    </div>
  `
})

// Event listener component  
rain('demo-listener', function() {
  const [messages, setMessages] = $([])
  const [counterValue, setCounterValue] = $(0)
  
  // Listen for messages
  onMounted(() => {
    const cleanupMessage = $.listen('demo-message', (e) => {
      const newMessage = {
        id: Date.now(),
        text: e.detail.message,
        time: new Date(e.detail.timestamp).toLocaleTimeString()
      }
      setMessages([...messages(), newMessage])
    })
    
    // Listen for counter events
    const cleanupCounter = $.listen('demo-counter', (e) => {
      setCounterValue(e.detail.count)
    })
    
    return () => {
      cleanupMessage()
      cleanupCounter()
    }
  })
  
  const clearMessages = () => setMessages([])
  
  return () => html`
    <div class="event-listener">
      <h4>Event Listener</h4>
      <div class="counter-display">
        <p>Last counter value: ${counterValue}</p>
      </div>
      
      <div class="messages">
        <div class="messages-header">
          <h5>Messages (${() => messages().length})</h5>
          ${$.if($.computed(() => messages().length > 0),
            () => html`<button @click=${clearMessages} class="btn-danger">Clear</button>`
          )}
        </div>
        
        <div class="message-list">
          ${$.list(
            messages,
            (msg) => html`
              <div class="message-item">
                <span class="message-time">[${msg.time}]</span>
                <span class="message-text">${msg.text}</span>
              </div>
            `,
            (msg) => msg.id
          )}
        </div>
        
        ${$.if($.computed(() => messages().length === 0),
          () => html`<p class="empty-messages">No messages yet. Send some from the emitter above!</p>`
        )}
      </div>
    </div>
  `
})

// =============================================================================
// 9. SLOTS AND CONTENT PROJECTION  
// =============================================================================

// Card component with slots
rain('demo-card', ['title', 'subtitle'], function() {
  const [props, setProps] = $({ title: 'Card Title', subtitle: '' })
  
  onMounted(() => {
    const updateProps = () => {
      setProps({
        title: this.getAttribute('title') || 'Card Title',
        subtitle: this.getAttribute('subtitle') || ''
      })
    }
    
    updateProps()
    const observer = new MutationObserver(updateProps)
    observer.observe(this, { attributes: true })
    
    return () => observer.disconnect()
  })
  
  return () => html`
    <div class="demo-card">
      <div class="card-header">
        <h4>${() => props().title}</h4>
        ${$.if($.computed(() => props().subtitle),
          () => html`<p class="card-subtitle">${() => props().subtitle}</p>`
        )}
      </div>
      <div class="card-body">
        <slot></slot>
      </div>
      <div class="card-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  `
})

console.log('Rain.js examples loaded successfully!')