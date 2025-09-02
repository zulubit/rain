/**
 * Vite plugin for RainWC - Auto-configures JSX for RainWC projects
 * Usage: import { rainwc } from 'rainwc/plugin'
 */
import { readFileSync } from 'fs'

export function rainwc(options = {}) {
  return {
    name: 'vite-plugin-rainwc',
    
    config(config) {
      // Auto-detect RainWC or allow manual override
      const hasRainWC = options.force || checkForRainWC()
      
      if (hasRainWC) {
        // Merge JSX configuration with existing esbuild config
        config.esbuild = {
          ...config.esbuild,
          jsx: 'transform',
          jsxFactory: options.jsxFactory || 'jsx',
          jsxFragment: options.jsxFragment || 'Fragment',
          jsxInject: options.jsxInject || `import { jsx, Fragment } from 'rainwc'`
        }
        
        if (!options.silent) {
          console.log('🌧️  RainWC JSX configured')
        }
      }
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