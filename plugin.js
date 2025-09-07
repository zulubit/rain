/**
 * Vite plugin for RainWC
 */
export function rainwc(options = {}) {
  return {
    name: 'rainwc-plugin',
    config(config) {
      console.log('🌧️  RainWC JSX configured for Vite')
      
      // Configure JSX for RainWC
      config.esbuild = {
        ...config.esbuild,
        jsx: 'transform',
        jsxFactory: options.jsxFactory || 'jsx',
        jsxFragment: options.jsxFragment || 'Fragment',
        jsxInject: options.jsxInject || `import { jsx, Fragment } from 'rainwc'`
      }
      
      return config
    }
  }
}

export default rainwc