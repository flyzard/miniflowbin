<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, SearchDropdown, Button } from '../../lib/components';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import {
    releaseFlowState,
    setReleaseDestination,
    canConfirmRelease
  } from '../../lib/stores/releaseFlow';
  import { searchPositions } from '../../lib/repositories/positionRepo';
  import { ReleaseMode } from '../../lib/types';
  import type { StoragePosition } from '../../lib/types';

  // Get flow state
  $: product = $releaseFlowState.product;
  $: mode = $releaseFlowState.mode;
  $: quantity = $releaseFlowState.quantity;
  $: sourceBatch = $releaseFlowState.sourceBatch;
  $: sourcePosition = $releaseFlowState.sourcePosition;
  $: destinationPosition = $releaseFlowState.destinationPosition;
  $: canProceed = $canConfirmRelease;

  // Get positions for the selected DC (excluding source position)
  $: dcId = $selectedDc?.id ?? '';
  $: allPositions = dcId ? searchPositions('', dcId, 100) : [];
  $: availablePositions = allPositions.filter(p => p.id !== sourcePosition?.id);

  // Calculate effective quantity
  $: effectiveQuantity = mode === ReleaseMode.FULL_BATCH
    ? sourceBatch?.quantity ?? 0
    : quantity ?? 0;

  function handlePositionSelect(event: CustomEvent<StoragePosition | null>) {
    setReleaseDestination(event.detail);
  }

  function handleContinue() {
    if (canProceed) {
      push('/release/confirm');
    }
  }
</script>

<main class="page">
  <BackNav href="/release/source" />

  <div class="card">
    <h1>Select Destination</h1>
    <StepIndicator currentStep={3} totalSteps={4} stepName="Where to release" />

    <div class="summary">
      <div class="summary-row">
        <span class="label">Product</span>
        <span class="value">{product?.name ?? '-'}</span>
      </div>
      <div class="summary-row">
        <span class="label">Quantity</span>
        <span class="value">{effectiveQuantity} units</span>
      </div>
      <div class="summary-row">
        <span class="label">From</span>
        <span class="value from">{sourcePosition?.code ?? '-'}</span>
      </div>
    </div>

    <div class="form">
      <div class="field">
        <SearchDropdown
          label="Destination Position"
          placeholder="Select destination..."
          searchPlaceholder="Search by code or zone..."
          items={availablePositions}
          value={destinationPosition}
          displayFn={(p) => p.code}
          secondaryFn={(p) => p.zone}
          required={true}
          on:select={handlePositionSelect}
        />
      </div>
    </div>

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

  .field {
    /* Field wrapper */
  }
</style>
