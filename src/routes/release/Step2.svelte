<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, PositionCard, Button, EmptyState, PageLayout } from '../../lib/components';
  import { releaseFlow, canSelectDestination } from '../../lib/stores/releaseFlow';
  import { listBatchesWithDetails } from '../../lib/repositories/batchRepo';
  import { getPositionById } from '../../lib/repositories/positionRepo';
  import { t } from '../../lib/i18n';
  import type { InventoryBatch, StoragePosition } from '../../lib/types';

  // Local state for async data
  let batches: InventoryBatch[] = [];
  let isLoading = true;
  let autoSelectDone = false;

  $: canProceed = canSelectDestination($releaseFlow);

  // Load batches when product changes
  $: if ($releaseFlow.product) {
    loadBatches($releaseFlow.product.id);
  }

  async function loadBatches(productId: string) {
    isLoading = true;
    autoSelectDone = false;
    try {
      batches = await listBatchesWithDetails(productId);
      // Auto-select oldest batch (FIFO) when available and none selected
      const firstBatch = batches[0];
      if (firstBatch && !$releaseFlow.sourceBatch && !autoSelectDone) {
        autoSelectDone = true;
        await handleBatchSelect(firstBatch);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      isLoading = false;
    }
  }

  async function handleBatchSelect(batch: InventoryBatch) {
    const position = await getPositionById(batch.position_id);
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

<PageLayout title={$t('release.step2.title')}>
  <BackNav slot="nav" href="/release" />
  <StepIndicator currentStep={2} totalSteps={3} stepName={$t('release.step2.name')} />

  {#if $releaseFlow.product}
    <p class="product-info">
      {$t('release.picking')} <strong>{$releaseFlow.product.name}</strong>
      <span class="quantity-badge">{$t('release.full_batch')}</span>
    </p>
  {/if}

  {#if batches.length === 0}
    <EmptyState message={$t('release.no_batches')} />
  {:else}
    <p class="fifo-hint">{$t('release.fifo_hint')}</p>

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
    {$t('common.continue')}
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
