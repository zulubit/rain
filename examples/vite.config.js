import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    fs: {
      // Allow serving files from parent directory
      allow: ['..']
    }
  }
});