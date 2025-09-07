import { defineConfig } from 'vite'
import rainwc from 'rainwc/plugin'

export default defineConfig({
  plugins: [rainwc()],
  build: {
    lib: {
      entry: 'src/app.jsx',
      name: 'App',
      fileName: 'app',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        dir: 'static'
      }
    }
  }
})