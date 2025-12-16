<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';

  export let positionCode: string;
  export let zone: string = '';
  export let batchNumber: string = '';
  export let quantity: number;
  export let receivedDate: string = '';
  export let isOldest: boolean = false;
  export let selected: boolean = false;
  export let willMoveFullBatch: boolean = false;

  const dispatch = createEventDispatcher<{ select: void }>();

  function formatDate(isoDate: string): string {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  }
</script>

<button
  type="button"
  class="position-card"
  class:selected
  on:click={() => dispatch('select')}
>
  <div class="header">
    <span class="position-code">
      <span class="position-icon"><Icon name="map-pin" size="xs" /></span>
      {positionCode}
    </span>
    <span class="quantity">{quantity} units</span>
  </div>

  {#if batchNumber || receivedDate}
    <div class="details">
      {#if batchNumber}
        <span class="batch">{batchNumber}</span>
      {/if}
      {#if receivedDate}
        <span class="date">Received: {formatDate(receivedDate)}</span>
      {/if}
    </div>
  {/if}

  {#if zone}
    <div class="zone">{zone}</div>
  {/if}

  <div class="badges">
    {#if isOldest}
      <span class="badge badge-fifo">Oldest (FIFO)</span>
    {/if}
    {#if willMoveFullBatch}
      <span class="badge badge-full">Will move entire batch</span>
    {/if}
  </div>

  {#if selected}
    <div class="selected-indicator">
      <Icon name="check" size="md" />
    </div>
  {/if}
</button>

<style>
  .position-card {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-input);
    border: 2px solid transparent;
    border-radius: var(--radius-input);
    text-align: left;
    transition: border-color var(--transition-fast), background var(--transition-fast);
  }

  .position-card:hover {
    border-color: var(--color-border-subtle);
  }

  .position-card.selected {
    border-color: var(--color-accent-success);
    background: rgba(34, 197, 94, 0.05);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .position-code {
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-body);
  }

  .position-icon {
    color: var(--color-text-secondary);
  }

  .quantity {
    color: var(--color-accent-success);
    font-weight: var(--font-weight-semibold);
  }

  .details {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .zone {
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .badge {
    display: inline-block;
    font-size: var(--font-size-caption);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-button);
  }

  .badge-fifo {
    color: var(--color-accent-warning);
    background: rgba(245, 158, 11, 0.1);
  }

  .badge-full {
    color: var(--color-text-secondary);
    background: var(--color-bg-card);
  }

  .selected-indicator {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    color: var(--color-accent-success);
  }
</style>
