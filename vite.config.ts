import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  optimizeDeps: {
    // Exclude Stencil components from pre-bundling to avoid runtime issues
    exclude: ['jeep-sqlite']
  }
});
