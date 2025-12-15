<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, SearchDropdown, RadioGroup, QuantityInput, Button } from '../../lib/components';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import {
    releaseFlowState,
    setReleaseProduct,
    setReleaseMode,
    setReleaseQuantity,
    canSelectSource
  } from '../../lib/stores/releaseFlow';
  import { getProductsWithInventory } from '../../lib/services/inventoryService';
  import { ReleaseMode } from '../../lib/types';
  import type { Product, ProductWithInventory } from '../../lib/types';

  // Get products with inventory based on selected DC
  $: dcId = $selectedDc?.id ?? '';
  $: productsWithInventory = dcId ? getProductsWithInventory(dcId) : [];

  // Current flow state
  $: currentProduct = $releaseFlowState.product;
  $: currentMode = $releaseFlowState.mode;
  $: currentQuantity = $releaseFlowState.quantity;
  $: canProceed = $canSelectSource;

  // Release mode options
  const releaseModeOptions = [
    {
      value: ReleaseMode.FULL_BATCH,
      label: 'Full Batch',
      description: 'Release the entire batch from the selected position'
    },
    {
      value: ReleaseMode.SPECIFIC_QUANTITY,
      label: 'Specific Quantity',
      description: 'Release a specific number of units'
    }
  ];

  function handleProductSelect(event: CustomEvent<ProductWithInventory | null>) {
    if (event.detail) {
      // Convert ProductWithInventory to Product for the store
      const product: Product = {
        id: event.detail.id,
        sku: event.detail.sku,
        name: event.detail.name,
        description: event.detail.description,
        category: event.detail.category,
        unit_of_measure: event.detail.unit_of_measure,
        distribution_center_id: event.detail.distribution_center_id,
        is_active: event.detail.is_active,
        created_at: event.detail.created_at,
        updated_at: event.detail.updated_at
      };
      setReleaseProduct(product);
    } else {
      setReleaseProduct(null);
    }
  }

  function handleModeChange(event: CustomEvent<ReleaseMode>) {
    setReleaseMode(event.detail);
  }

  function handleQuantityChange(event: CustomEvent<number>) {
    setReleaseQuantity(event.detail);
  }

  function handleContinue() {
    if (canProceed) {
      push('/release/source');
    }
  }

  // Get available quantity for selected product
  $: selectedProductInventory = productsWithInventory.find(p => p.id === currentProduct?.id);
  $: availableQuantity = selectedProductInventory?.total_quantity ?? 0;
</script>

<main class="page">
  <BackNav href="/" />

  <div class="card">
    <h1>Release Inventory</h1>
    <StepIndicator currentStep={1} totalSteps={4} stepName="Select product and quantity" />

    <div class="form">
      <div class="field">
        <SearchDropdown
          label="Product"
          placeholder="Select a product with inventory..."
          searchPlaceholder="Search by name or SKU..."
          items={productsWithInventory}
          value={selectedProductInventory}
          displayFn={(p) => p.name}
          secondaryFn={(p) => `${p.sku} • ${p.total_quantity} available`}
          required={true}
          on:select={handleProductSelect}
        />
      </div>

      {#if currentProduct}
        <div class="field">
          <RadioGroup
            label="Release Mode"
            name="release-mode"
            options={releaseModeOptions}
            value={currentMode}
            on:change={handleModeChange}
          />
        </div>

        {#if currentMode === ReleaseMode.SPECIFIC_QUANTITY}
          <div class="field">
            <QuantityInput
              label="Quantity"
              value={currentQuantity ?? 1}
              min={1}
              max={availableQuantity}
              required={true}
              on:change={handleQuantityChange}
            />
            <p class="hint">Available: {availableQuantity} units</p>
          </div>
        {/if}
      {/if}
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

  .hint {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }
</style>
