<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import SearchDropdown from './SearchDropdown.svelte';
  import BarcodeScannerModal from './BarcodeScannerModal.svelte';
  import Icon from './Icon.svelte';
  import { createHardwareScannerListener } from '../hooks/useHardwareScanner';
  import { getProductByBarcode } from '../repositories/productRepo';
  import { showError } from '../stores/ui';
  import { t } from '../i18n';
  import type { Product } from '../types';
  import type { ScanResult } from '../services/barcodeService';

  export let products: Product[] = [];
  export let value: Product | null = null;
  export let distributionCenterId: string;
  export let label: string = '';
  export let placeholder: string = '';
  export let searchPlaceholder: string = '';
  export let required: boolean = false;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{ select: Product | null }>();

  let isScannerOpen = false;
  let isLookingUp = false;

  // Hardware scanner setup
  const hardwareScanner = createHardwareScannerListener({
    onScan: handleBarcodeScan,
  });

  onMount(() => {
    hardwareScanner.attach(window);
  });

  onDestroy(() => {
    hardwareScanner.detach(window);
  });

  async function handleBarcodeScan(barcode: string) {
    if (isLookingUp || disabled) return;

    isLookingUp = true;
    try {
      const product = await getProductByBarcode(barcode, distributionCenterId);

      if (product) {
        value = product;
        dispatch('select', product);
      } else {
        showError($t('barcode.not_found', { barcode }));
      }
    } catch (error) {
      console.error('Barcode lookup failed:', error);
      showError($t('barcode.lookup_error'));
    } finally {
      isLookingUp = false;
    }
  }

  function handleCameraScan(event: CustomEvent<ScanResult>) {
    handleBarcodeScan(event.detail.barcode);
  }

  function handleProductSelect(event: CustomEvent<Product | null>) {
    value = event.detail;
    dispatch('select', event.detail);
  }

  function openScanner() {
    if (!disabled) {
      isScannerOpen = true;
    }
  }

  function closeScanner() {
    isScannerOpen = false;
  }
</script>

<div class="product-search-with-barcode" class:disabled>
  <div class="search-row">
    <div class="dropdown-wrapper">
      <SearchDropdown
        {label}
        {placeholder}
        {searchPlaceholder}
        items={products}
        {value}
        displayFn={(p) => p.name || p.sku}
        secondaryFn={(p) => [p.name ? p.sku : null, p.color, p.size].filter(Boolean).join(' - ')}
        {required}
        {disabled}
        on:select={handleProductSelect}
      />
    </div>

    <button
      type="button"
      class="scan-btn"
      {disabled}
      on:click={openScanner}
      aria-label={$t('barcode.scan')}
    >
      <Icon name="barcode" size="lg" />
    </button>
  </div>

  {#if isLookingUp}
    <p class="status-text">{$t('barcode.looking_up')}</p>
  {/if}
</div>

<BarcodeScannerModal
  isOpen={isScannerOpen}
  on:scan={handleCameraScan}
  on:close={closeScanner}
/>

<style>
  .product-search-with-barcode {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .search-row {
    display: flex;
    gap: var(--space-sm);
    align-items: flex-end;
  }

  .dropdown-wrapper {
    flex: 1;
  }

  .scan-btn {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
  }

  .scan-btn:hover:not(:disabled) {
    border-color: var(--color-accent-primary);
    background: var(--color-bg-card);
  }

  .scan-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .disabled .scan-btn {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-text {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin: 0;
  }
</style>
