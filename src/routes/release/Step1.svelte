<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, Button, PageLayout } from '../../lib/components';
  import ProductSearchWithBarcode from '../../lib/components/ProductSearchWithBarcode.svelte';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { releaseFlow, canSelectSource } from '../../lib/stores/releaseFlow';
  import { listProductsWithInventory } from '../../lib/repositories/productRepo';
  import { t } from '../../lib/i18n';
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
  $: selectedProductInventory = productsWithInventory.find(p => p.id === $releaseFlow.product?.id) ?? null;
</script>

<PageLayout title={$t('release.title')}>
  <BackNav slot="nav" href="/" />
  <StepIndicator currentStep={1} totalSteps={3} stepName={$t('release.step1.name')} />

  <div class="form-section">
    <ProductSearchWithBarcode
      label={$t('form.product')}
      placeholder={$t('form.product.placeholder_inventory')}
      searchPlaceholder={$t('form.product.search')}
      products={productsWithInventory}
      value={selectedProductInventory}
      distributionCenterId={dcId}
      required={true}
      on:select={handleProductSelect}
    />
  </div>

  <Button disabled={!canProceed} on:click={handleContinue}>
    {$t('common.continue')}
  </Button>
</PageLayout>

