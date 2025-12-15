<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, SearchDropdown, QuantityInput, Button, PageLayout } from '../../lib/components';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { receiveFlow, canConfirmReceive } from '../../lib/stores/receiveFlow';
  import { searchProducts } from '../../lib/repositories/productRepo';
  import { searchPositions } from '../../lib/repositories/positionRepo';
  import type { Product, StoragePosition } from '../../lib/types';

  // Get products and positions based on selected DC
  $: dcId = $selectedDc?.id ?? '';
  $: products = dcId ? searchProducts('', dcId, 100) : [];
  $: positions = dcId ? searchPositions('', dcId, 100) : [];
  $: canProceed = canConfirmReceive($receiveFlow);

  function handleProductSelect(event: CustomEvent<Product | null>) {
    receiveFlow.update(s => ({ ...s, product: event.detail }));
  }

  function handleQuantityChange(event: CustomEvent<number>) {
    receiveFlow.update(s => ({ ...s, quantity: Math.max(1, Math.floor(event.detail)) }));
  }

  function handlePositionSelect(event: CustomEvent<StoragePosition | null>) {
    receiveFlow.update(s => ({ ...s, position: event.detail }));
  }

  function handleContinue() {
    if (canProceed) {
      push('/receive/confirm');
    }
  }
</script>

<PageLayout title="Receive Inventory">
  <BackNav slot="nav" href="/" />
  <StepIndicator currentStep={1} totalSteps={2} stepName="Enter details" />

  <div class="form">
    <SearchDropdown
      label="Product"
      placeholder="Select a product..."
      searchPlaceholder="Search by name or SKU..."
      items={products}
      value={$receiveFlow.product}
      displayFn={(p) => p.name}
      secondaryFn={(p) => p.sku}
      required={true}
      on:select={handleProductSelect}
    />

    <QuantityInput
      label="Quantity"
      value={$receiveFlow.quantity}
      min={1}
      max={999999}
      required={true}
      on:change={handleQuantityChange}
    />

    <SearchDropdown
      label="Storage Position"
      placeholder="Select a position..."
      searchPlaceholder="Search by code or zone..."
      items={positions}
      value={$receiveFlow.position}
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
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    margin-bottom: var(--space-lg);
  }
</style>
