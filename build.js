#!/usr/bin/env node

import { build } from 'esbuild'
import { rmSync } from 'fs'

const sharedConfig = {
  entryPoints: ['src/index.js'],
  bundle: true,
  sourcemap: true,
  external: [], // Bundle ALL dependencies internally
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}

async function buildLibrary() {
  console.log('Building RainWC library...')

  // Clean dist directory
  try {
    rmSync('dist', { recursive: true, force: true })
    console.log('Cleaned dist directory')
  } catch (error) {
    // Directory doesn't exist, that's fine
  }

  try {
    // ESM build for modern bundlers and Node.js
    await build({
      ...sharedConfig,
      outfile: 'dist/rainwc.esm.js',
      format: 'esm',
      target: 'es2020',
      platform: 'neutral'
    })
    console.log('ESM build complete: dist/rainwc.esm.js')

    // UMD build for CDN usage
    await build({
      ...sharedConfig,
      outfile: 'dist/rainwc.umd.js',
      format: 'iife',
      globalName: 'RainWC',
      target: 'es2017',
      platform: 'browser',
      define: {
        ...sharedConfig.define,
        'global': 'globalThis'
      }
    })
    console.log('UMD build complete: dist/rainwc.umd.js')

    // Minified UMD build for CDN
    await build({
      ...sharedConfig,
      outfile: 'dist/rainwc.umd.min.js',
      format: 'iife',
      globalName: 'RainWC',
      target: 'es2017',
      platform: 'browser',
      minify: true,
      define: {
        ...sharedConfig.define,
        'global': 'globalThis'
      }
    })
    console.log('Minified UMD build complete: dist/rainwc.umd.min.js')

    console.log('Build complete! Ready for NPM and CDN distribution.')
    console.log('')
    console.log('NPM usage:')
    console.log('  npm install rainwc')
    console.log('  import { rain, html, $ } from "rainwc"')
    console.log('')
    console.log('CDN usage:')
    console.log('  <script src="https://unpkg.com/rainwc/dist/rainwc.umd.min.js"></script>')
    console.log('  const { rain, html, $ } = RainWC')

  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

buildLibrary()