# 🌈 Rainbow

Server-driven reactive paradigm for RainWC. Build dynamic apps where the server controls state and components react automatically.

```jsx
// Server renders HTML with JSON props
<rain-bow 
  page-data='{"user": {"name": "John"}, "posts": [...]}' 
  global-data='{"csrf_token": "abc123", "flash": []}'>
  <user-dashboard></user-dashboard>
</rain-bow>

// Components automatically access server data
import { rain, $$, $ } from 'rainwc'

rain('user-dashboard', function() {
  const pageData = $$.page()
  const globalData = $$.global()
  
  return () => (
    <div>
      <h1>Welcome {pageData().user?.name}</h1>
      <button onClick={() => $$.update({ action: 'refresh' })}>
        Refresh
      </button>
    </div>
  )
})
```

## Features

- **Server-driven state** - Backend controls all data flow
- **Reactive components** - Auto-update when server data changes  
- **Automatic CSRF** - Tokens included from global data
- **File upload support** - Multipart forms handled automatically
- **Error handling** - Validation errors update component state
- **Zero client state** - No complex state management needed

## Installation

Rainbow is included with RainWC:

```bash
npm install rainwc
```

## Quick Start

### 1. Import Rainbow

```jsx
import { rain, $$, $ } from 'rainwc'
```

### 2. Prevent Flash of Unstyled Content (FOUC)

Add this CSS to your HTML `<head>` **before** loading your JavaScript:

```html
<style>
  :not(:defined) { visibility: hidden; }
  :not(:defined) * { visibility: hidden; }
</style>
```

**Why this matters for Rainbow:**
- Server renders `<rain-bow>` and child components immediately
- Components aren't defined until JavaScript loads
- Without this CSS, unstyled content flashes before components mount
- Especially important for slotted content inside components

### 3. Server HTML Structure

Your server should render HTML with JSON attributes:

```html
<rain-bow 
  page-data='{"posts": [], "user": {"id": 1}}' 
  global-data='{"csrf_token": "xyz", "flash": [], "errors": {}}'>
  
  <my-header></my-header>
  <my-content></my-content>
</rain-bow>
```

### 4. Component Data Access

Components automatically get access to server data:

```jsx
rain('my-header', function() {
  const page = $$.page()   // Access page-data
  const global = $$.global() // Access global-data
  
  return () => (
    <header>
      <span>User: {page().user?.id}</span>
      {global().flash.map(msg => <div>{msg}</div>)}
    </header>
  )
})
```

## API Reference

### `$$.page()`
Access current page data (fully flexible structure).

```jsx
const userData = $$.page().user
const posts = $$.page().posts
```

**Returns**: `Object` - Current page data

### `$$.global()`  
Access current global data (always contains `csrf_token` and `flash`).

```jsx
const token = $$.global().csrf_token
const messages = $$.global().flash
const errors = $$.global().errors
```

**Returns**: `Object` - Current global data with guaranteed structure


### `$$.update(options?)`
Update current page data by hitting current route.

```jsx
$$.update({ data: { action: 'refresh' } })
$$.update({ method: 'GET' })
```

**Parameters**:
- `options?: Object` - Request options

**Returns**: `Promise<Object>` - Server response

### `$$.submitForm(url, options?)`
Submit form with automatic data collection and file uploads.

```jsx
<form onSubmit={$$.submitForm('/users/create')}>
  <input name="name" />
  <input type="file" name="avatar" />
  <button>Save</button>
</form>

// With callbacks
<form onSubmit={$$.submitForm('/users/update', {
  onSuccess: () => window.location.href = '/users',
  onError: (err) => console.log('Failed!')
})}>
```

**Parameters**:
- `url: string` - Form action URL  
- `options?: Object` - Submit options

**Returns**: `Function` - Event handler for form onSubmit

## Server Contract

### Page Data
Completely flexible - send any structure:

```json
{
  "user": {"name": "Alice", "posts": []},
  "metrics": {"views": 1234},
  "anything": "you want"
}
```

### Global Data  
Must contain minimum structure, additional fields allowed:

```json
{
  "csrf_token": "abc123",
  "flash": ["Message saved!"],
  "errors": {"name": "Required field"},
  "custom_field": "anything else"
}
```

### Response Format
Server responses should return updated data:

```json
{
  "pageData": {"user": {"name": "Updated"}},
  "globalData": {"csrf_token": "new123", "flash": ["Success!"]}
}
```

## Examples

### Navigation
```jsx
// Use regular links for navigation
<a href="/dashboard">Go to Dashboard</a>

// Or programmatic navigation
window.location.href = '/dashboard'
```

### Data Updates
```jsx
// Refresh current page data
$$.update({ action: 'poll_notifications' })

// Toggle favorite
$$.update({ 
  data: { action: 'toggle_favorite', id: 123 }
})
```

### Forms
```jsx
rain('user-form', function() {
  const page = $$.page()
  const global = $$.global()
  
  return () => (
    <form onSubmit={$$.submitForm('/users/update')}>
      <input name="name" defaultValue={page().user.name} />
      <input type="file" name="avatar" />
      
      {global().errors?.name && (
        <span class="error">{global().errors.name}</span>
      )}
      
      <button>Save</button>
    </form>
  )
})
```

### Error Handling
```jsx
rain('error-example', function() {
  const global = $$.global()
  
  const handleAction = async () => {
    try {
      await $$.update({ data: { risky_action: true } })
    } catch (error) {
      // Error automatically added to global().errors
      console.log('Action failed:', global().errors.request)
    }
  }
  
  return () => (
    <div>
      <button onClick={handleAction}>Try Action</button>
      {global().errors?.request && (
        <div class="error">{global().errors.request}</div>
      )}
    </div>
  )
})
```

## Integration Patterns

### With Backend Frameworks
```php
// Laravel example
class DashboardController {
    public function show() {
        $pageData = [
            'user' => auth()->user(),
            'posts' => Post::recent()->get()
        ];
        
        $globalData = [
            'csrf_token' => csrf_token(),
            'flash' => session()->get('flash', []),
            'errors' => session()->get('errors', [])
        ];
        
        return view('dashboard', compact('pageData', 'globalData'));
    }
}
```

```html
<!-- Blade template -->
<rain-bow 
  page-data='{!! json_encode($pageData) !!}'
  global-data='{!! json_encode($globalData) !!}'>
  @include('components.dashboard')
</rain-bow>
```

## Best Practices

1. **Keep page data flexible** - Server can send any structure
2. **Use global data for app-wide state** - Flash messages, user auth, errors
3. **Leverage automatic CSRF** - Tokens included in all requests
4. **Handle errors gracefully** - Use global().errors for user feedback
5. **Use standard navigation** - Regular links and server redirects for page changes

## License

MIT
