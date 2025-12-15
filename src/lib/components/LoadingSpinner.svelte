<script lang="ts">
  export let message: string = 'Loading...';
  export let size: 'small' | 'medium' | 'large' = 'medium';
</script>

<div class="loading-container size-{size}">
  <div class="spinner"></div>
  {#if message}
    <p class="message">{message}</p>
  {/if}
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    gap: var(--space-md);
  }

  .spinner {
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .size-small .spinner {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }

  .size-medium .spinner {
    width: 32px;
    height: 32px;
  }

  .size-large .spinner {
    width: 48px;
    height: 48px;
    border-width: 4px;
  }

  .message {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
