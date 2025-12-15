<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, SearchDropdown, Button, PageLayout } from '../../lib/components';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { releaseFlow, canConfirmRelease, effectiveQuantity } from '../../lib/stores/releaseFlow';
  import { searchPositions } from '../../lib/repositories/positionRepo';
  import type { StoragePosition } from '../../lib/types';

  $: canProceed = canConfirmRelease($releaseFlow);
  $: qty = effectiveQuantity($releaseFlow);

  // Get positions for the selected DC (excluding source position)
  $: dcId = $selectedDc?.id ?? '';
  $: allPositions = dcId ? searchPositions('', dcId, 100) : [];
  $: availablePositions = allPositions.filter(p => p.id !== $releaseFlow.sourcePosition?.id);

  function handlePositionSelect(event: CustomEvent<StoragePosition | null>) {
    releaseFlow.update(s => ({ ...s, destinationPosition: event.detail }));
  }

  function handleContinue() {
    if (canProceed) {
      push('/release/confirm');
    }
  }
</script>

<PageLayout title="Select Destination">
  <BackNav slot="nav" href="/release/source" />
  <StepIndicator currentStep={3} totalSteps={4} stepName="Where to release" />

  <div class="summary">
    <div class="summary-row">
      <span class="label">Product</span>
      <span class="value">{$releaseFlow.product?.name ?? '-'}</span>
    </div>
    <div class="summary-row">
      <span class="label">Quantity</span>
      <span class="value">{qty} units</span>
    </div>
    <div class="summary-row">
      <span class="label">From</span>
      <span class="value from">{$releaseFlow.sourcePosition?.code ?? '-'}</span>
    </div>
  </div>

  <div class="form">
    <SearchDropdown
      label="Destination Position"
      placeholder="Select destination..."
      searchPlaceholder="Search by code or zone..."
      items={availablePositions}
      value={$releaseFlow.destinationPosition}
      displayFn={(p) => p.code}
      secondaryFn={(p) => p.zone}
      required={true}
      on:select={handlePositionSelect}
    />
  </div>

  <Button disabled={!canProceed} on:click={handleContinue}>
    Continue
  </Button>
</PageLayout>

<style>
  .summary {
    background: var(--color-bg-input);
    border-radius: var(--radius-input);
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-xs) 0;
  }

  .summary-row:not(:last-child) {
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
  }

  .value {
    font-weight: var(--font-weight-semibold);
  }

  .value.from {
    color: var(--color-accent-warning);
  }

  .form {
    margin-bottom: var(--space-lg);
  }
</style>
