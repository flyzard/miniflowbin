<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, SearchDropdown, QuantityInput, Button } from '../../lib/components';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import {
    receiveFlowState,
    setReceiveProduct,
    setReceiveQuantity,
    setReceivePosition,
    canConfirmReceive
  } from '../../lib/stores/receiveFlow';
  import { searchProducts } from '../../lib/repositories/productRepo';
  import { searchPositions } from '../../lib/repositories/positionRepo';
  import type { Product, StoragePosition } from '../../lib/types';

  // Get products and positions based on selected DC
  $: dcId = $selectedDc?.id ?? '';
  $: products = dcId ? searchProducts('', dcId, 100) : [];
  $: positions = dcId ? searchPositions('', dcId, 100) : [];

  // Current flow state
  $: currentProduct = $receiveFlowState.product;
  $: currentQuantity = $receiveFlowState.quantity;
  $: currentPosition = $receiveFlowState.position;
  $: canProceed = $canConfirmReceive;

  function handleProductSelect(event: CustomEvent<Product | null>) {
    setReceiveProduct(event.detail);
  }

  function handleQuantityChange(event: CustomEvent<number>) {
    setReceiveQuantity(event.detail);
  }

  function handlePositionSelect(event: CustomEvent<StoragePosition | null>) {
    setReceivePosition(event.detail);
  }

  function handleContinue() {
    if (canProceed) {
      push('/receive/confirm');
    }
  }
</script>

<main class="page">
  <BackNav href="/" />

  <div class="card">
    <h1>Receive Inventory</h1>
    <StepIndicator currentStep={1} totalSteps={2} stepName="Enter details" />

    <div class="form">
      <div class="field">
        <SearchDropdown
          label="Product"
          placeholder="Select a product..."
          searchPlaceholder="Search by name or SKU..."
          items={products}
          value={currentProduct}
          displayFn={(p) => p.name}
          secondaryFn={(p) => p.sku}
          required={true}
          on:select={handleProductSelect}
        />
      </div>

      <div class="field">
        <QuantityInput
          label="Quantity"
          value={currentQuantity}
          min={1}
          max={999999}
          required={true}
          on:change={handleQuantityChange}
        />
      </div>

      <div class="field">
        <SearchDropdown
          label="Storage Position"
          placeholder="Select a position..."
          searchPlaceholder="Search by code or zone..."
          items={positions}
          value={currentPosition}
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

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    margin-bottom: var(--space-lg);
  }

  .field {
    /* Field wrapper */
  }
</style>
