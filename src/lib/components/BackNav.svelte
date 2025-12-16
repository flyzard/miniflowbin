<script lang="ts">
  import { push } from 'svelte-spa-router';
  import Icon from './Icon.svelte';

  export let href: string = '/';
  export let label: string = 'Back';

  function handleClick() {
    push(href);
  }
</script>

<button class="back-nav" on:click={handleClick}>
  <Icon name="chevron-left" size="md" />
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
</style>
