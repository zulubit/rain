#!/usr/bin/env node

import { build } from 'esbuild'
import { rmSync } from 'fs'
import { spawn } from 'child_process'

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit' })
    proc.on('close', (code) => {
      code === 0 ? resolve() : reject(new Error(`${command} failed`))
    })
  })
}

async function buildLibrary() {
  console.log('🏗️  Building RainWC...')

  // Clean dist directory
  rmSync('dist', { recursive: true, force: true })

  // Single ESM build - modern and simple
  await build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/index.js',
    bundle: true,
    format: 'esm',
    target: 'es2020',
    platform: 'neutral',
    sourcemap: true,
    minify: true,
    external: []  // Bundle all dependencies
  })

  // Generate TypeScript declarations
  await runCommand('npx', ['tsc'])

  console.log('✅ Build complete!')
  console.log('')
  console.log('📦 Usage:')
  console.log('  npm install rainwc')
  console.log('  import { rain, jsx, $, css } from "rainwc"')
  console.log('')
  console.log('🔧 Vite setup:')
  console.log('  import { rainwc } from "rainwc/plugin"')
  console.log('  plugins: [rainwc()]')
}

buildLibrary().catch(error => {
  console.error('❌ Build failed:', error)
  process.exit(1)
})