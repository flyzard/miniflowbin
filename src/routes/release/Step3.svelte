<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, InfoCard, Button, PageLayout, Icon } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { currentUser } from '../../lib/auth';
  import { releaseFlow, resetReleaseFlow, effectiveQuantity, isPartialRelease } from '../../lib/stores/releaseFlow';
  import { executeRelease, resolveDestinationPosition } from '../../lib/services/releaseService';
  import { t } from '../../lib/i18n';

  let isSubmitting = false;

  $: qty = effectiveQuantity($releaseFlow);
  $: partial = isPartialRelease($releaseFlow);
  $: batchTotal = $releaseFlow.sourceBatch?.quantity ?? 0;

  // Auto-resolve destination position based on product SKU
  $: if ($releaseFlow.product && $selectedDc && !$releaseFlow.destinationPosition) {
    resolveDestination($releaseFlow.product, $selectedDc.id);
  }

  async function resolveDestination(product: typeof $releaseFlow.product, dcId: string) {
    if (!product) return;
    try {
      const { position } = await resolveDestinationPosition(product, dcId);
      releaseFlow.update(s => ({ ...s, destinationPosition: position }));
    } catch (error) {
      console.error('Failed to resolve destination:', error);
    }
  }

  // Build info rows for display
  $: infoRows = [
    {
      label: $t('form.product'),
      value: $releaseFlow.product ? `${$releaseFlow.product.name} (${$releaseFlow.product.sku})` : '-',
      icon: 'product' as const
    },
    {
      label: $t('form.quantity'),
      value: partial
        ? $t('release.quantity_partial', { quantity: qty, total: batchTotal })
        : $t('release.quantity_full_batch', { quantity: qty }),
      icon: 'quantity' as const
    },
    {
      label: $t('form.batch'),
      value: $releaseFlow.sourceBatch?.batch_number ?? '-',
      icon: 'batch' as const
    }
  ];

  async function handleConfirm() {
    const { sourceBatch, destinationPosition } = $releaseFlow;
    if (!sourceBatch || !destinationPosition || !$selectedDc || !$currentUser) {
      showError($t('error.missing_data'));
      return;
    }

    isSubmitting = true;

    try {
      const result = await executeRelease({
        batchId: sourceBatch.id,
        quantity: qty,
        destinationPositionId: destinationPosition.id,
        userId: $currentUser.id,
        distributionCenterId: $selectedDc.id
      });

      if (result.success) {
        showSuccess($t('release.success', { quantity: result.releasedQuantity ?? qty, name: $releaseFlow.product?.name ?? $releaseFlow.product?.sku ?? '' }));
        resetReleaseFlow();
        push('/');
      } else {
        showError(result.error ?? $t('error.release_failed'));
      }
    } catch (error) {
      console.error('Release error:', error);
      showError($t('error.unexpected'));
    } finally {
      isSubmitting = false;
    }
  }
</script>

<PageLayout title={$t('release.step3.title')}>
  <BackNav slot="nav" href="/release/source" />
  <StepIndicator currentStep={3} totalSteps={3} stepName={$t('release.step3.name')} />

  <div class="info-section">
    <InfoCard rows={infoRows} />
  </div>

  <div class="movement">
    <div class="location from">
      <span class="location-label">{$t('movement.from')}</span>
      <span class="location-value">{$releaseFlow.sourcePosition?.code ?? '-'}</span>
      <span class="location-zone">{$releaseFlow.sourcePosition?.zone ?? ''}</span>
    </div>
    <div class="arrow">
      <Icon name="arrow-right" size="lg" />
    </div>
    <div class="location to">
      <span class="location-label">{$t('movement.to')}</span>
      <span class="location-value">{$releaseFlow.destinationPosition?.code ?? '-'}</span>
      <span class="location-zone">{$releaseFlow.destinationPosition?.zone ?? ''}</span>
    </div>
  </div>

  <div class="actions">
    <Button variant="secondary" on:click={() => push('/release/source')}>
      {$t('common.back')}
    </Button>
    <Button
      loading={isSubmitting}
      disabled={!$releaseFlow.sourceBatch || !$releaseFlow.destinationPosition}
      on:click={handleConfirm}
    >
      {$t('common.confirm')}
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
</style>
