<script lang="ts">
  import Icon from './Icon.svelte';

  export let message: string = 'No results found';
  export let suggestion: string = '';
</script>

<div class="empty-state">
  <span class="icon">
    <Icon name="search" size="2xl" strokeWidth={1.5} />
  </span>
  <p class="message">{message}</p>
  {#if suggestion}
    <p class="suggestion">{suggestion}</p>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-secondary);
  }

  .icon {
    margin-bottom: var(--space-md);
    opacity: 0.5;
  }

  .message {
    font-size: var(--font-size-body);
    margin-bottom: var(--space-xs);
  }

  .suggestion {
    font-size: var(--font-size-secondary);
    opacity: 0.7;
  }
</style>
