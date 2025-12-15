import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Disable runes mode for svelte-spa-router compatibility
    runes: false
  }
};
