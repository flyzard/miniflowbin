<script lang="ts">
  import Icon from './Icon.svelte';

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
          <Icon name="package" size="sm" />
        {:else if row.icon === 'quantity'}
          <Icon name="plus" size="sm" />
        {:else if row.icon === 'location'}
          <Icon name="map-pin" size="sm" />
        {:else if row.icon === 'batch'}
          <Icon name="hash" size="sm" />
        {:else if row.icon === 'user'}
          <Icon name="user" size="sm" />
        {:else if row.icon === 'date'}
          <Icon name="calendar" size="sm" />
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
