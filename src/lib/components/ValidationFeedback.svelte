<script lang="ts">
  import type { ValidationError } from '../types';

  /** Validation errors to display */
  export let errors: ValidationError[] = [];
  /** Warnings to display */
  export let warnings: string[] = [];
</script>

{#if errors.length > 0}
  <div class="errors-section">
    <h3 class="errors-title">Validation Errors</h3>
    <ul class="errors-list">
      {#each errors as error}
        <li class="error-item">
          <span class="error-row">Row {error.row}:</span>
          <span class="error-message">{error.message}</span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if warnings.length > 0}
  <div class="warnings-section">
    <h3 class="warnings-title">Warnings</h3>
    <ul class="warnings-list">
      {#each warnings as warning}
        <li class="warning-item">{warning}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .errors-section {
    padding: var(--space-md);
    background: rgba(255, 100, 100, 0.1);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-input);
  }

  .errors-title {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-error);
    margin-bottom: var(--space-sm);
  }

  .errors-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .error-item {
    padding: var(--space-xs) 0;
    font-size: var(--font-size-secondary);
  }

  .error-row {
    font-weight: var(--font-weight-semibold);
    margin-right: var(--space-xs);
  }

  .error-message {
    color: var(--color-text-secondary);
  }

  .warnings-section {
    padding: var(--space-md);
    background: rgba(255, 200, 100, 0.1);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-input);
  }

  .warnings-title {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-warning);
    margin-bottom: var(--space-sm);
  }

  .warnings-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .warning-item {
    padding: var(--space-xs) 0;
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }
</style>
