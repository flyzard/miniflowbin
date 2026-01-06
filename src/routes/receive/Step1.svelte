<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, QuantityInput, Button, PageLayout, PositionSelector } from '../../lib/components';
  import ProductSearchWithBarcode from '../../lib/components/ProductSearchWithBarcode.svelte';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { receiveFlow, canConfirmReceive } from '../../lib/stores/receiveFlow';
  import { searchProducts } from '../../lib/repositories/productRepo';
  import { listReceivablePositions } from '../../lib/repositories/positionRepo';
  import { getTodayDate } from '../../lib/utils/date';
  import { t } from '../../lib/i18n';
  import type { Product, StoragePosition } from '../../lib/types';

  // Local state for async data
  let products: Product[] = [];
  let positions: StoragePosition[] = [];
  let isLoading = true;

  // Initialize receivedAt to today if not set
  onMount(() => {
    if (!$receiveFlow.receivedAt) {
      receiveFlow.update(s => ({ ...s, receivedAt: getTodayDate() }));
    }
  });

  // Load data on mount and when DC changes
  $: dcId = $selectedDc?.id ?? '';
  $: if (dcId) loadData(dcId);
  $: canProceed = canConfirmReceive($receiveFlow);
  $: todayDate = getTodayDate();

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

  function handleDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    receiveFlow.update(s => ({ ...s, receivedAt: target.value, batchNumber: null }));
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
    <ProductSearchWithBarcode
      label={$t('form.product')}
      placeholder={$t('form.product.placeholder')}
      searchPlaceholder={$t('form.product.search')}
      products={products}
      value={$receiveFlow.product}
      distributionCenterId={dcId}
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

    <div class="form-group">
      <label for="receive-date">{$t('form.receiveDate')}</label>
      <input
        type="date"
        id="receive-date"
        class="date-input"
        value={$receiveFlow.receivedAt ?? todayDate}
        max={todayDate}
        required
        on:change={handleDateChange}
      />
    </div>
  </div>

  <Button disabled={!canProceed} on:click={handleContinue}>
    {$t('common.continue')}
  </Button>
</PageLayout>

<style>
  .form-group {
    width: 100%;
  }

  .form-group label {
    display: block;
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .date-input {
    width: 100%;
    padding: var(--space-md);
    font-size: var(--font-size-primary);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    color: var(--color-text-primary);
  }

  .date-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }
</style>
