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
  console.log('Building RainJS library...')

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
      outfile: 'dist/rainjs.esm.js',
      format: 'esm',
      target: 'es2020',
      platform: 'neutral'
    })
    console.log('ESM build complete: dist/rainjs.esm.js')

    // UMD build for CDN usage
    await build({
      ...sharedConfig,
      outfile: 'dist/rainjs.umd.js',
      format: 'iife',
      globalName: 'RainJS',
      target: 'es2017',
      platform: 'browser',
      define: {
        ...sharedConfig.define,
        'global': 'globalThis'
      }
    })
    console.log('UMD build complete: dist/rainjs.umd.js')

    // Minified UMD build for CDN
    await build({
      ...sharedConfig,
      outfile: 'dist/rainjs.umd.min.js',
      format: 'iife',
      globalName: 'RainJS',
      target: 'es2017',
      platform: 'browser',
      minify: true,
      define: {
        ...sharedConfig.define,
        'global': 'globalThis'
      }
    })
    console.log('Minified UMD build complete: dist/rainjs.umd.min.js')

    console.log('Build complete! Ready for NPM and CDN distribution.')
    console.log('')
    console.log('NPM usage:')
    console.log('  npm install rainjs-framework')
    console.log('  import { rain, html, $ } from "rainjs-framework"')
    console.log('')
    console.log('CDN usage:')
    console.log('  <script src="https://unpkg.com/rainjs-framework/dist/rainjs.umd.min.js"></script>')
    console.log('  const { rain, html, $ } = RainJS')

  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

buildLibrary()