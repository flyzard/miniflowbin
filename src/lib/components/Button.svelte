<script lang="ts">
  export let variant: 'primary' | 'secondary' = 'primary';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let type: 'button' | 'submit' = 'button';
  export let fullWidth: boolean = true;
</script>

<button
  {type}
  class="btn btn-{variant}"
  class:full-width={fullWidth}
  class:loading
  disabled={disabled || loading}
  on:click
>
  {#if loading}
    <span class="spinner"></span>
  {/if}
  <span class="content" class:hidden={loading}>
    <slot />
  </span>
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    height: var(--button-height);
    padding: 0 var(--space-lg);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-button);
    transition: all var(--transition-fast);
    cursor: pointer;
    position: relative;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .full-width {
    width: 100%;
  }

  .btn-primary {
    background: var(--color-accent-primary);
    color: var(--color-bg-primary);
    border: none;
  }

  .btn-primary:not(:disabled):hover {
    opacity: 0.9;
  }

  .btn-primary:not(:disabled):active {
    transform: scale(0.98);
  }

  .btn-secondary {
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-subtle);
  }

  .btn-secondary:not(:disabled):hover {
    background: var(--color-bg-input);
  }

  .btn-secondary:not(:disabled):active {
    transform: scale(0.98);
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .content.hidden {
    visibility: hidden;
  }

  .loading .spinner {
    position: absolute;
  }
</style>
