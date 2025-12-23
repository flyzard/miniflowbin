<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, SearchDropdown, QuantityInput, Button, PageLayout, PositionSelector } from '../../lib/components';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { receiveFlow, canConfirmReceive } from '../../lib/stores/receiveFlow';
  import { searchProducts } from '../../lib/repositories/productRepo';
  import { listReceivablePositions } from '../../lib/repositories/positionRepo';
  import { t } from '../../lib/i18n';
  import type { Product, StoragePosition } from '../../lib/types';

  // Local state for async data
  let products: Product[] = [];
  let positions: StoragePosition[] = [];
  let isLoading = true;

  // Load data on mount and when DC changes
  $: dcId = $selectedDc?.id ?? '';
  $: if (dcId) loadData(dcId);
  $: canProceed = canConfirmReceive($receiveFlow);

  async function loadData(distributionCenterId: string) {
    isLoading = true;
    try {
      [products, positions] = await Promise.all([
        searchProducts('', distributionCenterId, 100),
        listReceivablePositions(distributionCenterId)
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      isLoading = false;
    }
  }

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

<PageLayout title={$t('receive.title')}>
  <BackNav slot="nav" href="/" />
  <StepIndicator currentStep={1} totalSteps={2} stepName={$t('receive.step1.name')} />

  <div class="form-section">
    <SearchDropdown
      label={$t('form.product')}
      placeholder={$t('form.product.placeholder')}
      searchPlaceholder={$t('form.product.search')}
      items={products}
      value={$receiveFlow.product}
      displayFn={(p) => p.name || p.sku}
      secondaryFn={(p) => [p.name ? p.sku : null, p.color, p.size].filter(Boolean).join(' • ')}
      required={true}
      on:select={handleProductSelect}
    />

    <QuantityInput
      label={$t('form.quantity')}
      value={$receiveFlow.quantity}
      min={1}
      max={999999}
      required={true}
      on:change={handleQuantityChange}
    />

    <PositionSelector
      label={$t('form.position')}
      positions={positions}
      value={$receiveFlow.position}
      required={true}
      on:select={handlePositionSelect}
    />
  </div>

  <Button disabled={!canProceed} on:click={handleContinue}>
    {$t('common.continue')}
  </Button>
</PageLayout>

