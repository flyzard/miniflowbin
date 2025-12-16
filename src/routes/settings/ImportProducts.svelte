<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { PageLayout, BackNav, Button, CsvDropZone, ValidationFeedback, ImportResult, LoadingStep } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import {
    productImportFlow,
    resetProductImportFlow,
    setProductCsvData,
    setProductValidationResult,
    setProductImportStep,
    setProductImportResult,
    canProceedToImport,
    totalProductsToImport
  } from '../../lib/stores/productImportFlow';
  import { validateProductCsv, executeProductImport } from '../../lib/services/productImportService';
  import { generateProductTemplateCsv, downloadCsv } from '../../lib/services/csvParserService';

  // Local state
  let isExecuting = false;

  // Reset flow on mount
  resetProductImportFlow();

  // Handle file from drop zone
  async function handleFile(event: CustomEvent<File>) {
    const file = event.detail;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showError('Please select a CSV file');
      return;
    }

    try {
      const content = await file.text();
      setProductCsvData(file.name, content);

      // Validate CSV
      const result = validateProductCsv(content);
      setProductValidationResult(result);
    } catch (err) {
      showError('Failed to read file');
    }
  }

  // Download template
  function handleDownloadTemplate() {
    const template = generateProductTemplateCsv();
    downloadCsv(template, 'products-template.csv');
  }

  // Execute import
  async function handleExecuteImport() {
    if (!$productImportFlow.validationResult?.parsed) {
      showError('No products to import');
      return;
    }
    if (!$selectedDc) {
      showError('No distribution center selected. Please refresh the page.');
      return;
    }

    isExecuting = true;
    setProductImportStep('executing');

    try {
      const result = await executeProductImport(
        $productImportFlow.validationResult.parsed,
        $selectedDc.id
      );
      setProductImportResult(result);
      setProductImportStep('complete');

      if (result.success) {
        showSuccess(`Imported ${result.created + result.updated} product(s)`);
      } else {
        showError('Import completed with errors');
      }
    } catch (err) {
      showError('Import failed');
      setProductImportStep('upload');
    } finally {
      isExecuting = false;
    }
  }

  // Start new import
  function handleNewImport() {
    resetProductImportFlow();
  }

  // Go to settings
  function handleDone() {
    push('/settings');
  }
</script>

<PageLayout title="Import Products">
  <BackNav slot="nav" href="/settings" label="Settings" />

  {#if $productImportFlow.step === 'upload'}
    <!-- UPLOAD STEP -->
    <div class="step-content">
      <CsvDropZone
        description="Upload a CSV file with your products. Required column: sku. Optional: name, description, category, color, size."
        on:file={handleFile}
      />

      <!-- File info -->
      {#if $productImportFlow.fileName}
        <div class="file-info">
          <span class="file-name">{$productImportFlow.fileName}</span>
          {#if $productImportFlow.validationResult?.valid}
            <span class="file-status valid">{$totalProductsToImport} product(s) ready</span>
          {/if}
        </div>
      {/if}

      <ValidationFeedback
        errors={$productImportFlow.validationResult?.errors ?? []}
        warnings={$productImportFlow.validationResult?.warnings ?? []}
      />

      <div class="actions">
        <Button variant="secondary" on:click={handleDownloadTemplate}>
          Download Template
        </Button>
        {#if $canProceedToImport}
          <Button on:click={handleExecuteImport} loading={isExecuting}>
            Import {$totalProductsToImport} Product(s)
          </Button>
        {/if}
      </div>
    </div>

  {:else if $productImportFlow.step === 'executing'}
    <!-- EXECUTING STEP -->
    <LoadingStep message="Importing products..." />

  {:else if $productImportFlow.step === 'complete'}
    <!-- COMPLETE STEP -->
    <div class="step-content">
      {#if $productImportFlow.result}
        <ImportResult
          success={$productImportFlow.result.success}
          errors={$productImportFlow.result.errors ?? []}
          on:newImport={handleNewImport}
          on:done={handleDone}
        >
          <div slot="stats">
            {#if $productImportFlow.result.created > 0}
              <p>{$productImportFlow.result.created} product(s) created</p>
            {/if}
            {#if $productImportFlow.result.updated > 0}
              <p>{$productImportFlow.result.updated} product(s) updated</p>
            {/if}
            {#if $productImportFlow.result.skipped > 0}
              <p>{$productImportFlow.result.skipped} product(s) skipped</p>
            {/if}
          </div>
        </ImportResult>
      {/if}
    </div>
  {/if}
</PageLayout>

<style>
  /* File Info */
  .file-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background: var(--color-bg-input);
    border-radius: var(--radius-input);
    border: 1px solid var(--color-border-subtle);
  }

  .file-name {
    font-weight: var(--font-weight-semibold);
  }

  .file-status {
    font-size: var(--font-size-secondary);
  }

  .file-status.valid {
    color: var(--color-success);
  }
</style>
