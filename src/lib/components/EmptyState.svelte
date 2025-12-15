<script lang="ts">
  export let message: string = 'No results found';
  export let suggestion: string = '';
</script>

<div class="empty-state">
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
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

  .empty-state svg {
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
