<script lang="ts">
  import { push } from 'svelte-spa-router';

  export let href: string = '/';
  export let label: string = 'Back';

  function handleClick() {
    push(href);
  }
</script>

<button class="back-nav" on:click={handleClick}>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
  <span>{label}</span>
</button>

<style>
  .back-nav {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
    transition: color var(--transition-fast);
    min-height: var(--touch-target-min);
  }

  .back-nav:hover {
    color: var(--color-text-primary);
  }

  .back-nav svg {
    flex-shrink: 0;
  }
</style>
