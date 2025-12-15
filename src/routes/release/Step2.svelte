<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, PositionCard, Button, EmptyState, PageLayout } from '../../lib/components';
  import { releaseFlow, canSelectDestination } from '../../lib/stores/releaseFlow';
  import { listBatchesWithDetails } from '../../lib/repositories/batchRepo';
  import { getPositionById } from '../../lib/repositories/positionRepo';
  import type { InventoryBatch } from '../../lib/types';

  $: canProceed = canSelectDestination($releaseFlow);

  // Get batches for the selected product (sorted by FIFO - oldest first)
  $: batches = $releaseFlow.product ? listBatchesWithDetails($releaseFlow.product.id) : [];

  // Auto-select oldest batch (FIFO) when available and none selected
  $: {
    const oldestBatch = batches[0];
    if (oldestBatch && !$releaseFlow.sourceBatch) {
      handleBatchSelect(oldestBatch);
    }
  }

  function handleBatchSelect(batch: InventoryBatch) {
    const position = getPositionById(batch.position_id);
    if (position) {
      releaseFlow.update(s => ({
        ...s,
        sourceBatch: batch,
        sourcePosition: position
      }));
    }
  }

  function handleContinue() {
    if (canProceed) {
      push('/release/confirm');
    }
  }
</script>

<PageLayout title="Select Source Position">
  <BackNav slot="nav" href="/release" />
  <StepIndicator currentStep={2} totalSteps={3} stepName="Choose where to pick from" />

  {#if $releaseFlow.product}
    <p class="product-info">
      Picking: <strong>{$releaseFlow.product.name}</strong>
      <span class="quantity-badge">Full batch</span>
    </p>
  {/if}

  {#if batches.length === 0}
    <EmptyState message="No batches available for this product" />
  {:else}
    <p class="fifo-hint">Oldest batches shown first (FIFO)</p>

    <div class="positions-list">
      {#each batches as batch, index}
        <PositionCard
          positionCode={batch.position_code ?? ''}
          zone={batch.position_zone ?? ''}
          batchNumber={batch.batch_number}
          quantity={batch.quantity}
          receivedDate={batch.received_at}
          isOldest={index === 0}
          selected={$releaseFlow.sourceBatch?.id === batch.id}
          willMoveFullBatch={true}
          on:select={() => handleBatchSelect(batch)}
        />
      {/each}
    </div>
  {/if}

  <Button disabled={!canProceed} on:click={handleContinue}>
    Continue
  </Button>
</PageLayout>

<style>
  .product-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    font-size: var(--font-size-body);
    color: var(--color-text-secondary);
  }

  .product-info strong {
    color: var(--color-text-primary);
  }

  .quantity-badge {
    font-size: var(--font-size-caption);
    background: var(--color-bg-input);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-button);
  }

  .fifo-hint {
    font-size: var(--font-size-caption);
    color: var(--color-accent-warning);
    margin-bottom: var(--space-md);
  }

  .positions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }
</style>
