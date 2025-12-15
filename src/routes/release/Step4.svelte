<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, InfoCard, Button } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { currentUser } from '../../lib/stores/auth';
  import {
    releaseFlowState,
    resetReleaseFlow
  } from '../../lib/stores/releaseFlow';
  import { executeRelease } from '../../lib/services/releaseService';
  import { ReleaseMode } from '../../lib/types';

  let isSubmitting = false;

  // Get flow state
  $: product = $releaseFlowState.product;
  $: mode = $releaseFlowState.mode;
  $: quantity = $releaseFlowState.quantity;
  $: sourceBatch = $releaseFlowState.sourceBatch;
  $: sourcePosition = $releaseFlowState.sourcePosition;
  $: destinationPosition = $releaseFlowState.destinationPosition;

  // Calculate effective quantity
  $: effectiveQuantity = mode === ReleaseMode.FULL_BATCH
    ? sourceBatch?.quantity ?? 0
    : quantity ?? 0;

  // Build info rows for display
  $: infoRows = [
    {
      label: 'Product',
      value: product ? `${product.name} (${product.sku})` : '-',
      icon: 'product' as const
    },
    {
      label: 'Quantity',
      value: mode === ReleaseMode.FULL_BATCH
        ? `${effectiveQuantity} (full batch)`
        : String(effectiveQuantity),
      icon: 'quantity' as const
    },
    {
      label: 'Batch #',
      value: sourceBatch?.batch_number ?? '-',
      icon: 'batch' as const
    }
  ];

  async function handleConfirm() {
    if (!sourceBatch || !destinationPosition || !$selectedDc || !$currentUser) {
      showError('Missing required data');
      return;
    }

    isSubmitting = true;

    try {
      const result = executeRelease({
        batchId: sourceBatch.id,
        quantity: effectiveQuantity,
        destinationPositionId: destinationPosition.id,
        userId: $currentUser.id,
        distributionCenterId: $selectedDc.id,
        releaseMode: mode
      });

      if (result.success) {
        showSuccess(`Released ${result.releasedQuantity} units of ${product?.name}`);
        resetReleaseFlow();
        push('/');
      } else {
        showError(result.error ?? 'Failed to release inventory');
      }
    } catch (error) {
      console.error('Release error:', error);
      showError('An unexpected error occurred');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<main class="page">
  <BackNav href="/release/destination" />

  <div class="card">
    <h1>Confirm Release</h1>
    <StepIndicator currentStep={4} totalSteps={4} stepName="Review and confirm" />

    <div class="info-section">
      <InfoCard rows={infoRows} />
    </div>

    <div class="movement">
      <div class="location from">
        <span class="location-label">From</span>
        <span class="location-value">{sourcePosition?.code ?? '-'}</span>
        <span class="location-zone">{sourcePosition?.zone ?? ''}</span>
      </div>
      <div class="arrow">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"/>
          <path d="m12 5 7 7-7 7"/>
        </svg>
      </div>
      <div class="location to">
        <span class="location-label">To</span>
        <span class="location-value">{destinationPosition?.code ?? '-'}</span>
        <span class="location-zone">{destinationPosition?.zone ?? ''}</span>
      </div>
    </div>

    <div class="actions">
      <Button variant="secondary" on:click={() => push('/release/destination')}>
        Back
      </Button>
      <Button
        loading={isSubmitting}
        disabled={!sourceBatch || !destinationPosition}
        on:click={handleConfirm}
      >
        Confirm
      </Button>
    </div>
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

  .info-section {
    margin-bottom: var(--space-md);
  }

  .movement {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    background: var(--color-bg-input);
    border-radius: var(--radius-input);
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .location {
    flex: 1;
    text-align: center;
    padding: var(--space-md);
    background: var(--color-bg-card);
    border-radius: var(--radius-input);
    border: 1px solid transparent;
  }

  .location.from {
    border-color: var(--color-accent-warning);
  }

  .location.to {
    border-color: var(--color-accent-success);
  }

  .location-label {
    display: block;
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .location-value {
    display: block;
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-xs);
  }

  .location.from .location-value {
    color: var(--color-accent-warning);
  }

  .location.to .location-value {
    color: var(--color-accent-success);
  }

  .location-zone {
    display: block;
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
  }

  .arrow {
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-md);
  }

  .actions :global(button) {
    flex: 1;
  }
</style>
