# RainWC Examples

Interactive examples and demos for RainWC framework.

## Running Examples

```bash
cd examples
npm install
npm run dev
```

Open http://localhost:3000 to view the examples.

## Available Examples

### Simple Counter
Basic reactive counter with increment/decrement buttons demonstrating:
- Signal state management with `$()`
- Event handling with `@click`  
- Reactive styling with `$.css()`
- Utility classes

### Todo App
Full-featured todo application showing:
- Complex state management
- List rendering with `list()`
- Conditional rendering with computed values
- Form handling
- Filtering and CRUD operations

### Styled Card  
Component with props and theming demonstrating:
- Props with type definitions
- Reactive theming (dark/light mode)
- CSS variable usage
- Progressive styling approach

## Building for Production

```bash
npm run build
```

Creates optimized production build in `dist/` folder.

## Development Notes

- Examples import RainWC from `../src/` for development
- In production, you would import from the npm package: `import { rain, html, $ } from 'rainwc'`
- All examples use the new simplified CSS API
- Examples demonstrate progressive enhancement patterns