/**
 * Universal plugin for RainWC - Works with both esbuild and Vite
 * 
 * Usage with esbuild:
 * import rainwc from 'rainwc/plugin'
 * esbuild.build({ plugins: [rainwc()] })
 * 
 * Usage with Vite:
 * import rainwc from 'rainwc/plugin'
 * export default defineConfig({ plugins: [rainwc()] })
 */
import { readFileSync } from 'fs'

export function rainwc(options = {}) {
  const jsxFactory = options.jsxFactory || 'jsx'
  const jsxFragment = options.jsxFragment || 'Fragment'
  const jsxInject = options.jsxInject || `import { jsx, Fragment } from 'rainwc'`
  
  // Check if RainWC is in the project
  const hasRainWC = options.force || checkForRainWC()
  
  if (!hasRainWC) {
    return {
      name: 'rainwc-plugin-noop',
      // For Vite
      config() {},
      // For esbuild
      setup() {}
    }
  }
  
  // Return a plugin that works for both Vite and esbuild
  return {
    name: 'rainwc-plugin',
    
    // Vite-specific hook
    config(config) {
      if (!options.silent) {
        console.log('🌧️  RainWC JSX configured for Vite')
      }
      
      // Configure esbuild options within Vite
      config.esbuild = {
        ...config.esbuild,
        jsx: 'transform',
        jsxFactory,
        jsxFragment,
        jsxInject
      }
      
      return config
    },
    
    // esbuild-specific hook
    setup(build) {
      if (!options.silent) {
        console.log('🌧️  RainWC JSX configured for esbuild')
      }
      
      // Configure JSX settings
      build.initialOptions.jsx = 'transform'
      build.initialOptions.jsxFactory = jsxFactory
      build.initialOptions.jsxFragment = jsxFragment
      
      // Auto-inject JSX imports for esbuild
      build.onLoad({ filter: /\.(jsx?|tsx?)$/ }, async (args) => {
        const source = await readFileSync(args.path, 'utf8')
        
        // Skip if already has jsx import
        if (source.includes('from \'rainwc\'') || source.includes('from "rainwc"')) {
          return { contents: source, loader: 'jsx' }
        }
        
        return {
          contents: `${jsxInject}\n${source}`,
          loader: 'jsx'
        }
      })
    }
  }
}

function checkForRainWC() {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    return !!(
      (pkg.dependencies?.rainwc) ||
      (pkg.devDependencies?.rainwc)
    )
  } catch {
    return false
  }
}

// Default export for convenience
export default rainwc