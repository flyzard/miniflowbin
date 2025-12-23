<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { startScanner, stopScanner, isCameraScanningSupported, type ScanResult } from '../services/barcodeService';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';
  import { t } from '../i18n';

  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    scan: ScanResult;
    close: void;
    error: string;
  }>();

  let scannerElementId = 'barcode-scanner-region';
  let isSupported = false;
  let isStarting = false;
  let errorMessage = '';

  onMount(async () => {
    isSupported = await isCameraScanningSupported();
  });

  $: if (isOpen && isSupported) {
    startScannerAsync();
  } else if (!isOpen) {
    stopScannerAsync();
  }

  async function startScannerAsync() {
    if (isStarting) return;
    isStarting = true;
    errorMessage = '';

    // Wait for DOM to render
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      await startScanner(
        scannerElementId,
        (result) => {
          dispatch('scan', result);
          handleClose();
        },
        (error) => {
          console.warn('[Scanner] Error:', error);
        }
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to start camera';
      dispatch('error', errorMessage);
    } finally {
      isStarting = false;
    }
  }

  async function stopScannerAsync() {
    await stopScanner();
  }

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick() {
    handleClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }

  onDestroy(() => {
    stopScannerAsync();
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content" on:click|stopPropagation role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h2>{$t('barcode.scan')}</h2>
        <button type="button" class="close-btn" on:click={handleClose} aria-label="Close">
          <Icon name="x" size="lg" />
        </button>
      </div>

      <div class="scanner-container">
        {#if !isSupported}
          <div class="error-state">
            <Icon name="alert-triangle" size="xl" />
            <p>{$t('barcode.camera_not_available')}</p>
            <p class="hint">{$t('barcode.manual_hint')}</p>
          </div>
        {:else if errorMessage}
          <div class="error-state">
            <Icon name="alert-triangle" size="xl" />
            <p>{errorMessage}</p>
            <Button variant="secondary" on:click={startScannerAsync}>
              {$t('barcode.retry')}
            </Button>
          </div>
        {:else}
          <div id={scannerElementId} class="scanner-region"></div>
          <p class="hint">{$t('barcode.point_camera')}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }

  .modal-content {
    background: var(--color-bg-card);
    border-radius: var(--radius-card);
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .modal-header h2 {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-semibold);
    margin: 0;
  }

  .close-btn {
    padding: var(--space-xs);
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    min-width: var(--touch-target-min);
    min-height: var(--touch-target-min);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-input);
    transition: background var(--transition-fast);
  }

  .close-btn:hover {
    background: var(--color-bg-input);
  }

  .scanner-container {
    padding: var(--space-md);
  }

  .scanner-region {
    width: 100%;
    aspect-ratio: 1;
    background: var(--color-bg-input);
    border-radius: var(--radius-input);
    overflow: hidden;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-secondary);
  }

  .hint {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    text-align: center;
    margin-top: var(--space-sm);
  }
</style>
