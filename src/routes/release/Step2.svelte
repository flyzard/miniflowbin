<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, PositionCard, Button, EmptyState } from '../../lib/components';
  import {
    releaseFlowState,
    setReleaseSource,
    canSelectDestination
  } from '../../lib/stores/releaseFlow';
  import { getBatchesForProduct } from '../../lib/services/inventoryService';
  import { getPositionById } from '../../lib/repositories/positionRepo';
  import { ReleaseMode } from '../../lib/types';
  import type { BatchWithDetails, StoragePosition } from '../../lib/types';

  // Get product from flow state
  $: product = $releaseFlowState.product;
  $: mode = $releaseFlowState.mode;
  $: requestedQuantity = $releaseFlowState.quantity;
  $: selectedBatch = $releaseFlowState.sourceBatch;
  $: canProceed = $canSelectDestination;

  // Get batches for the selected product (sorted by FIFO - oldest first)
  $: batches = product ? getBatchesForProduct(product.id) : [];

  // Filter batches based on quantity requirements
  $: availableBatches = mode === ReleaseMode.SPECIFIC_QUANTITY && requestedQuantity
    ? batches.filter(b => b.quantity >= requestedQuantity)
    : batches;

  function handleBatchSelect(batch: BatchWithDetails) {
    // Get the position for this batch
    const position = getPositionById(batch.position_id);
    if (position) {
      const storagePosition: StoragePosition = {
        id: position.id,
        code: position.code,
        zone: position.zone,
        zone_type: position.zone_type,
        description: position.description,
        aisle: position.aisle,
        rack: position.rack,
        level: position.level,
        distribution_center_id: position.distribution_center_id,
        is_active: position.is_active,
        created_at: position.created_at,
        updated_at: position.updated_at
      };

      // Convert batch to InventoryBatch for store
      setReleaseSource({
        id: batch.id,
        batch_number: batch.batch_number,
        product_id: batch.product_id,
        position_id: batch.position_id,
        quantity: batch.quantity,
        original_quantity: batch.original_quantity,
        received_at: batch.received_at,
        received_by: batch.received_by,
        expiration_date: batch.expiration_date,
        lot_number: batch.lot_number,
        distribution_center_id: batch.distribution_center_id,
        created_at: batch.created_at,
        updated_at: batch.updated_at
      }, storagePosition);
    }
  }

  function handleContinue() {
    if (canProceed) {
      push('/release/destination');
    }
  }

  // Determine if a batch will be fully released
  function willMoveFullBatch(batch: BatchWithDetails): boolean {
    if (mode === ReleaseMode.FULL_BATCH) return true;
    return requestedQuantity === batch.quantity;
  }
</script>

<main class="page">
  <BackNav href="/release" />

  <div class="card">
    <h1>Select Source Position</h1>
    <StepIndicator currentStep={2} totalSteps={4} stepName="Choose where to pick from" />

    {#if product}
      <p class="product-info">
        Picking: <strong>{product.name}</strong>
        {#if mode === ReleaseMode.SPECIFIC_QUANTITY && requestedQuantity}
          <span class="quantity-badge">{requestedQuantity} units</span>
        {:else}
          <span class="quantity-badge">Full batch</span>
        {/if}
      </p>
    {/if}

    {#if availableBatches.length === 0}
      <EmptyState
        message={mode === ReleaseMode.SPECIFIC_QUANTITY
          ? `No positions have enough quantity (${requestedQuantity} units needed)`
          : "No batches available for this product"}
      />
    {:else}
      <p class="fifo-hint">Oldest batches shown first (FIFO)</p>

      <div class="positions-list">
        {#each availableBatches as batch, index}
          <PositionCard
            positionCode={batch.position_code}
            zone={batch.position_zone}
            batchNumber={batch.batch_number}
            quantity={batch.quantity}
            receivedDate={batch.received_at}
            isOldest={index === 0}
            selected={selectedBatch?.id === batch.id}
            willMoveFullBatch={willMoveFullBatch(batch)}
            on:select={() => handleBatchSelect(batch)}
          />
        {/each}
      </div>
    {/if}

    <Button
      disabled={!canProceed}
      on:click={handleContinue}
    >
      Continue
    </Button>
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: var(--space-md);
    background: var(--color-bg-primary);
  }

  .card {
    background: var(--color-bg-card);
    border-radius: var(--radius-card);
    padding: var(--space-lg);
  }

  h1 {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-xs);
  }

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
