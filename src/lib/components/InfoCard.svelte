<script lang="ts">
  export let rows: Array<{
    label: string;
    value: string;
    icon?: 'product' | 'quantity' | 'location' | 'batch' | 'user' | 'date';
    highlight?: 'success' | 'warning' | 'error';
  }> = [];
</script>

<div class="info-card">
  {#each rows as row}
    <div class="info-row">
      <span class="info-icon">
        {#if row.icon === 'product'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m7.5 4.27 9 5.15"/>
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5"/>
            <path d="M12 22V12"/>
          </svg>
        {:else if row.icon === 'quantity'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
          </svg>
        {:else if row.icon === 'location'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        {:else if row.icon === 'batch'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7V4h16v3"/>
            <path d="M9 20h6"/>
            <path d="M12 4v16"/>
          </svg>
        {:else if row.icon === 'user'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        {:else if row.icon === 'date'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
        {/if}
      </span>
      <span class="info-label">{row.label}</span>
      <span
        class="info-value"
        class:highlight-success={row.highlight === 'success'}
        class:highlight-warning={row.highlight === 'warning'}
        class:highlight-error={row.highlight === 'error'}
      >
        {row.value}
      </span>
    </div>
  {/each}
</div>

<style>
  .info-card {
    background: var(--color-bg-input);
    border-radius: var(--radius-input);
    padding: var(--space-md);
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-icon {
    flex-shrink: 0;
    color: var(--color-text-secondary);
    display: flex;
  }

  .info-label {
    flex: 1;
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
  }

  .info-value {
    font-weight: var(--font-weight-semibold);
    text-align: right;
  }

  .highlight-success {
    color: var(--color-accent-success);
  }

  .highlight-warning {
    color: var(--color-accent-warning);
  }

  .highlight-error {
    color: var(--color-accent-error);
  }
</style>
