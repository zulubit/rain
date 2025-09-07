/**
 * RainWC Plugin Options for Vite
 */
export interface RainWCPluginOptions {
  /**
   * Custom JSX factory name
   * @default 'jsx'
   */
  jsxFactory?: string;
  
  /**
   * Custom JSX fragment name
   * @default 'Fragment'
   */
  jsxFragment?: string;
  
  /**
   * Custom JSX inject statement
   * @default "import { jsx, Fragment } from 'rainwc'"
   */
  jsxInject?: string;
}

/**
 * Vite plugin for RainWC - Automatically configures JSX
 * 
 * @example
 * import rainwc from 'rainwc/plugin'
 * import { defineConfig } from 'vite'
 * 
 * export default defineConfig({ 
 *   plugins: [rainwc()],
 *   build: {
 *     lib: {
 *       entry: 'src/app.jsx',
 *       name: 'App',
 *       fileName: 'app',
 *       formats: ['es']
 *     }
 *   }
 * })
 */
export function rainwc(options?: RainWCPluginOptions): any;
export default rainwc;