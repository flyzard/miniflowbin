<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from './Button.svelte';

  /** Whether the import was successful */
  export let success: boolean;
  /** Title to display (defaults based on success) */
  export let title: string = '';
  /** Import errors to display */
  export let errors: string[] = [];

  const dispatch = createEventDispatcher<{ newImport: void; done: void }>();

  $: displayTitle = title || (success ? 'Import Complete' : 'Import Failed');
</script>

<div class="result-section" class:success class:error={!success}>
  <div class="result-icon">
    {#if success}
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    {/if}
  </div>

  <h2 class="result-title">{displayTitle}</h2>

  <div class="result-stats">
    <slot name="stats" />
  </div>

  {#if errors.length > 0}
    <div class="result-errors">
      <h3>Errors:</h3>
      <ul>
        {#each errors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<div class="actions">
  <Button variant="secondary" on:click={() => dispatch('newImport')}>
    Import Another
  </Button>
  <Button on:click={() => dispatch('done')}>
    Done
  </Button>
</div>

<style>
  .result-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-xl);
    background: var(--color-bg-input);
    border-radius: var(--radius-card);
  }

  .result-section.success .result-icon {
    color: var(--color-success);
  }

  .result-section.error .result-icon {
    color: var(--color-error);
  }

  .result-title {
    font-size: var(--font-size-section);
    margin-top: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .result-stats {
    color: var(--color-text-secondary);
  }

  .result-stats :global(p) {
    margin: var(--space-xs) 0;
  }

  .result-errors {
    margin-top: var(--space-md);
    text-align: left;
    width: 100%;
    padding: var(--space-md);
    background: rgba(255, 100, 100, 0.1);
    border-radius: var(--radius-input);
  }

  .result-errors h3 {
    font-size: var(--font-size-body);
    color: var(--color-error);
    margin-bottom: var(--space-sm);
  }

  .result-errors ul {
    list-style: disc;
    padding-left: var(--space-lg);
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .actions {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-lg);
  }

  .actions :global(.btn) {
    flex: 1;
  }
</style>
