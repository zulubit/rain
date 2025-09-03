/**
 * RainWC Plugin Options
 */
export interface RainWCPluginOptions {
  /**
   * Force enable the plugin even if rainwc is not detected
   * @default false
   */
  force?: boolean;
  
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
  
  /**
   * Disable console output
   * @default false
   */
  silent?: boolean;
}

/**
 * Universal plugin for RainWC - Works with both esbuild and Vite
 * 
 * @example
 * // With esbuild
 * import rainwc from 'rainwc/plugin'
 * esbuild.build({ plugins: [rainwc()] })
 * 
 * @example
 * // With Vite
 * import rainwc from 'rainwc/plugin'
 * export default defineConfig({ plugins: [rainwc()] })
 */
export function rainwc(options?: RainWCPluginOptions): any;
export default rainwc;