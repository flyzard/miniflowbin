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
    padding: var(--space-sm) var(--space-md);
    margin-left: calc(-1 * var(--space-md));
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
    border-radius: var(--radius-button);
    transition: all var(--transition-fast);
    min-height: var(--touch-target-min);
  }

  .back-nav:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-input);
  }

  .back-nav:active {
    transform: scale(0.98);
  }
</style>
