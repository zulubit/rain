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
  const pd = $$.page
  const gd = $$.global
  const loading = $$.loading
  
  return () => (
    <div>
      <h1>Welcome {$.c(() => pd().user?.name)}</h1>
      <button onClick={() => $$.update({ action: 'refresh' })} disabled={loading}>
        {$.c(() => loading() ? 'Loading...' : 'Refresh')}
      </button>
      {gd().flash.map(msg => <div class="flash">{msg}</div>)}
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
- **Loading state** - Automatic loading indicators during requests
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
  const pd = $$.page      // Access page-data signal
  const gd = $$.global    // Access global-data signal
  const loading = $$.loading // Access loading state
  
  return () => (
    <header>
      <span>User: {$.c(() => pd().user?.id)}</span>
      {gd().flash.map(msg => <div class="flash">{msg}</div>)}
      {$.c(() => loading() && <div class="spinner">Loading...</div>)}
    </header>
  )
})
```

## API Reference

### `$$.page`
Access current page data signal (fully flexible structure).

```jsx
const pd = $$.page
const userData = $.c(() => pd().user)
const posts = $.c(() => pd().posts)
```

**Returns**: `() => Object` - Signal function returning current page data

### `$$.global`  
Access current global data signal (always contains `csrf_token` and `flash`).

```jsx
const gd = $$.global
const token = $.c(() => gd().csrf_token)
const messages = $.c(() => gd().flash)
const errors = $.c(() => gd().errors)
```

**Returns**: `() => Object` - Signal function returning current global data with guaranteed structure

### `$$.loading`
Access loading state signal - automatically managed during requests.

```jsx
const loading = $$.loading

// Use in templates
return () => (
  <button disabled={loading()}>
    {$.c(() => loading() ? 'Saving...' : 'Save')}
  </button>
)
```

**Returns**: `() => boolean` - Signal function returning loading state


### `$$.update(options?)`
Update current page data by hitting current route.

```jsx
$$.update({ data: { action: 'refresh' } })
$$.update({ 
  method: 'GET',
  onError: (error) => console.error('Update failed:', error)
})
```

**Parameters**:
- `options?: Object` - Request options
  - `method?: string` - HTTP method (default: 'POST')
  - `data?: Object` - Request data
  - `onError?: Function` - Error callback

**Returns**: `Promise<Object>` - Server response

### `$$.submitForm(url, options?)`
Submit form with automatic data collection and file uploads.

```jsx
<form onSubmit={$$.submitForm('/users/create')}>
  <input name="name" />
  <input type="file" name="avatar" />
  <button>Save</button>
</form>

// With validation and error handling
<form onSubmit={$$.submitForm('/users/update', {
  onBeforeSubmit: (formData) => {
    if (!formData.get('email').includes('@')) {
      alert('Invalid email')
      return false // Prevent submission
    }
  },
  onError: (error) => {
    alert('Server error: ' + error.message)
  }
})}>
```

**Parameters**:
- `url: string` - Form action URL  
- `options?: Object` - Submit options
  - `method?: string` - HTTP method (default: 'POST')
  - `onBeforeSubmit?: Function` - Validation callback, return false to cancel
  - `onError?: Function` - Error callback

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
  const pd = $$.page
  const gd = $$.global
  const loading = $$.loading
  
  return () => (
    <form onSubmit={$$.submitForm('/users/update')}>
      <input name="name" defaultValue={$.c(() => pd().user?.name)} />
      <input type="file" name="avatar" />
      
      {$.c(() => gd().errors?.name) && (
        <span class="error">{$.c(() => gd().errors.name)}</span>
      )}
      
      <button disabled={loading}>
        {$.c(() => loading() ? 'Saving...' : 'Save')}
      </button>
    </form>
  )
})
```

### Error Handling
```jsx
rain('error-example', function() {
  const gd = $$.global
  const loading = $$.loading
  
  const handleAction = async () => {
    try {
      await $$.update({ data: { risky_action: true } })
    } catch (error) {
      // Error automatically added to gd().errors
      console.log('Action failed:', gd().errors?.request)
    }
  }
  
  return () => (
    <div>
      <button onClick={handleAction} disabled={loading}>
        {$.c(() => loading() ? 'Processing...' : 'Try Action')}
      </button>
      {$.c(() => gd().errors?.request) && (
        <div class="error">{$.c(() => gd().errors.request)}</div>
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
