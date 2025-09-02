/**
 * esbuild plugin for RainWC - Auto-configures JSX for RainWC projects
 * Usage: 
 * import { rainwc } from 'rainwc/esbuild-plugin'
 * 
 * esbuild.build({
 *   plugins: [rainwc()]
 * })
 */
import { readFileSync } from 'fs'

export function rainwc(options = {}) {
  return {
    name: 'esbuild-plugin-rainwc',
    setup(build) {
      // Auto-detect RainWC or allow manual override
      const hasRainWC = options.force || checkForRainWC()
      
      if (hasRainWC) {
        // Configure JSX settings
        build.initialOptions.jsxFactory = options.jsxFactory || 'jsx'
        build.initialOptions.jsxFragment = options.jsxFragment || 'Fragment'
        
        // Auto-inject JSX imports
        const jsxInject = options.jsxInject || `import { jsx, Fragment } from 'rainwc'`
        
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
        
        if (!options.silent) {
          console.log('🌧️  RainWC JSX configured for esbuild')
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