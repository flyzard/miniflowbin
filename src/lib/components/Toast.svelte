<script lang="ts">
  import { toasts, removeToast } from '../stores/ui';
  import type { Toast } from '../stores/ui';
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" role="alert">
      <span class="icon">
        {#if toast.type === 'success'}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        {:else if toast.type === 'error'}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        {:else if toast.type === 'warning'}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        {/if}
      </span>
      <span class="message">{toast.message}</span>
      <button class="close" on:click={() => removeToast(toast.id)} aria-label="Dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
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
