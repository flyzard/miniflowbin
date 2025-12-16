<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, SearchDropdown, Button, PageLayout } from '../../lib/components';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { releaseFlow, canSelectSource } from '../../lib/stores/releaseFlow';
  import { listProductsWithInventory } from '../../lib/repositories/productRepo';
  import type { Product } from '../../lib/types';

  // Local state for async data
  let productsWithInventory: Product[] = [];
  let isLoading = true;

  // Load data on mount and when DC changes
  $: dcId = $selectedDc?.id ?? '';
  $: if (dcId) loadData(dcId);
  $: canProceed = canSelectSource($releaseFlow);

  async function loadData(distributionCenterId: string) {
    isLoading = true;
    try {
      productsWithInventory = await listProductsWithInventory(distributionCenterId);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleProductSelect(event: CustomEvent<Product | null>) {
    releaseFlow.update(s => ({
      ...s,
      product: event.detail,
      sourceBatch: null,
      sourcePosition: null
    }));
  }

  function handleContinue() {
    if (canProceed) {
      push('/release/source');
    }
  }

  // Get selected product for display
  $: selectedProductInventory = productsWithInventory.find(p => p.id === $releaseFlow.product?.id);
</script>

<PageLayout title="Release Inventory">
  <BackNav slot="nav" href="/" />
  <StepIndicator currentStep={1} totalSteps={3} stepName="Select product" />

  <div class="form">
    <SearchDropdown
      label="Product"
      placeholder="Select a product with inventory..."
      searchPlaceholder="Search by name or SKU..."
      items={productsWithInventory}
      value={selectedProductInventory}
      displayFn={(p) => p.name || p.sku}
      secondaryFn={(p) => [p.name ? p.sku : null, p.color, p.size, `${p.total_quantity} available`].filter(Boolean).join(' • ')}
      required={true}
      on:select={handleProductSelect}
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
