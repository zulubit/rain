/**
 * Vite plugin for RainWC - Auto-configures JSX for RainWC projects
 */

export interface RainWCPluginOptions {
  /** Force enable even if RainWC not detected in dependencies */
  force?: boolean;
  /** Custom JSX factory function name */
  jsxFactory?: string;
  /** Custom JSX fragment function name */
  jsxFragment?: string;
  /** Suppress console output */
  silent?: boolean;
}

export interface VitePlugin {
  name: string;
  config?: (config: any) => void;
}

/**
 * RainWC Vite plugin - automatically configures JSX for RainWC projects
 */
export function rainwc(options?: RainWCPluginOptions): VitePlugin;

export default rainwc;