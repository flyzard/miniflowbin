<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, InfoCard, Button, PageLayout } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { currentUser } from '../../lib/stores/auth';
  import { releaseFlow, resetReleaseFlow, effectiveQuantity } from '../../lib/stores/releaseFlow';
  import { executeRelease, resolveDestinationPosition } from '../../lib/services/releaseService';

  let isSubmitting = false;

  $: qty = effectiveQuantity($releaseFlow);

  // Auto-resolve destination position based on product SKU
  $: {
    if ($releaseFlow.product && $selectedDc && !$releaseFlow.destinationPosition) {
      const { position } = resolveDestinationPosition($releaseFlow.product, $selectedDc.id);
      releaseFlow.update(s => ({ ...s, destinationPosition: position }));
    }
  }

  // Build info rows for display
  $: infoRows = [
    {
      label: 'Product',
      value: $releaseFlow.product ? `${$releaseFlow.product.name} (${$releaseFlow.product.sku})` : '-',
      icon: 'product' as const
    },
    {
      label: 'Quantity',
      value: `${qty} (full batch)`,
      icon: 'quantity' as const
    },
    {
      label: 'Batch #',
      value: $releaseFlow.sourceBatch?.batch_number ?? '-',
      icon: 'batch' as const
    }
  ];

  async function handleConfirm() {
    const { sourceBatch, destinationPosition } = $releaseFlow;
    if (!sourceBatch || !destinationPosition || !$selectedDc || !$currentUser) {
      showError('Missing required data');
      return;
    }

    isSubmitting = true;

    try {
      const result = executeRelease({
        batchId: sourceBatch.id,
        quantity: qty,
        destinationPositionId: destinationPosition.id,
        userId: $currentUser.id,
        distributionCenterId: $selectedDc.id
      });

      if (result.success) {
        showSuccess(`Released ${result.releasedQuantity} units of ${$releaseFlow.product?.name}`);
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

<PageLayout title="Confirm Release">
  <BackNav slot="nav" href="/release/source" />
  <StepIndicator currentStep={3} totalSteps={3} stepName="Review and confirm" />

  <div class="info-section">
    <InfoCard rows={infoRows} />
  </div>

  <div class="movement">
    <div class="location from">
      <span class="location-label">From</span>
      <span class="location-value">{$releaseFlow.sourcePosition?.code ?? '-'}</span>
      <span class="location-zone">{$releaseFlow.sourcePosition?.zone ?? ''}</span>
    </div>
    <div class="arrow">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14"/>
        <path d="m12 5 7 7-7 7"/>
      </svg>
    </div>
    <div class="location to">
      <span class="location-label">To</span>
      <span class="location-value">{$releaseFlow.destinationPosition?.code ?? '-'}</span>
      <span class="location-zone">{$releaseFlow.destinationPosition?.zone ?? ''}</span>
    </div>
  </div>

  <div class="actions">
    <Button variant="secondary" on:click={() => push('/release/source')}>
      Back
    </Button>
    <Button
      loading={isSubmitting}
      disabled={!$releaseFlow.sourceBatch || !$releaseFlow.destinationPosition}
      on:click={handleConfirm}
    >
      Confirm
    </Button>
  </div>
</PageLayout>

<style>
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
