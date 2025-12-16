<script lang="ts">
  import { toasts, removeToast } from '../stores/ui';
  import type { Toast } from '../stores/ui';
  import Icon from './Icon.svelte';
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" role="alert">
      <span class="icon">
        {#if toast.type === 'success'}
          <Icon name="check-circle" size="md" />
        {:else if toast.type === 'error'}
          <Icon name="x-circle" size="md" />
        {:else if toast.type === 'warning'}
          <Icon name="alert-triangle" size="md" />
        {:else}
          <Icon name="info-circle" size="md" />
        {/if}
      </span>
      <span class="message">{toast.message}</span>
      <button class="close" on:click={() => removeToast(toast.id)} aria-label="Dismiss">
        <Icon name="x" size="xs" />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: var(--space-md);
    left: var(--space-md);
    right: var(--space-md);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-radius: var(--radius-card);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    box-shadow: var(--shadow-dropdown);
    pointer-events: auto;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .toast-success {
    border-color: var(--color-accent-success);
  }

  .toast-success .icon {
    color: var(--color-accent-success);
  }

  .toast-error {
    border-color: var(--color-accent-error);
  }

  .toast-error .icon {
    color: var(--color-accent-error);
  }

  .toast-warning {
    border-color: var(--color-accent-warning);
  }

  .toast-warning .icon {
    color: var(--color-accent-warning);
  }

  .toast-info .icon {
    color: var(--color-text-secondary);
  }

  .icon {
    flex-shrink: 0;
    display: flex;
  }

  .message {
    flex: 1;
    font-size: var(--font-size-secondary);
  }

  .close {
    flex-shrink: 0;
    padding: var(--space-xs);
    color: var(--color-text-secondary);
    opacity: 0.7;
    transition: opacity var(--transition-fast);
  }

  .close:hover {
    opacity: 1;
  }
</style>
