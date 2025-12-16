<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { PageLayout, BackNav, Button } from '../../lib/components';
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
  let fileInput: HTMLInputElement;
  let isDragging = false;
  let isExecuting = false;

  // Reset flow on mount
  resetProductImportFlow();

  // Handle file selection
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      processFile(input.files[0]);
    }
  }

  // Handle drag events
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  }

  // Process uploaded file
  async function processFile(file: File) {
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
      <p class="step-description">
        Upload a CSV file with your products. Required column: sku. Optional: name, description, category, color, size.
      </p>

      <div
        class="drop-zone"
        class:dragging={isDragging}
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        role="button"
        tabindex="0"
        on:click={() => fileInput.click()}
        on:keypress={(e) => e.key === 'Enter' && fileInput.click()}
      >
        <div class="drop-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            <path d="M14 2v6h6"/>
            <path d="M12 18v-6"/>
            <path d="m9 15 3-3 3 3"/>
          </svg>
        </div>
        <span class="drop-text">Drop CSV file here</span>
        <span class="drop-subtext">or click to browse</span>
      </div>

      <input
        bind:this={fileInput}
        type="file"
        accept=".csv"
        class="file-input"
        on:change={handleFileSelect}
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

      <!-- Validation Errors -->
      {#if $productImportFlow.validationResult && !$productImportFlow.validationResult.valid}
        <div class="errors-section">
          <h3 class="errors-title">Validation Errors</h3>
          <ul class="errors-list">
            {#each $productImportFlow.validationResult.errors as error}
              <li class="error-item">
                <span class="error-row">Row {error.row}:</span>
                <span class="error-message">{error.message}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Warnings -->
      {#if $productImportFlow.validationResult?.warnings?.length}
        <div class="warnings-section">
          <h3 class="warnings-title">Warnings</h3>
          <ul class="warnings-list">
            {#each $productImportFlow.validationResult.warnings as warning}
              <li class="warning-item">{warning}</li>
            {/each}
          </ul>
        </div>
      {/if}

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
    <div class="step-content executing">
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Importing products...</p>
      </div>
    </div>

  {:else if $productImportFlow.step === 'complete'}
    <!-- COMPLETE STEP -->
    <div class="step-content">
      {#if $productImportFlow.result}
        <div class="result-section" class:success={$productImportFlow.result.success} class:error={!$productImportFlow.result.success}>
          <div class="result-icon">
            {#if $productImportFlow.result.success}
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            {/if}
          </div>

          <h2 class="result-title">
            {$productImportFlow.result.success ? 'Import Complete' : 'Import Failed'}
          </h2>

          <div class="result-stats">
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

          {#if $productImportFlow.result?.errors?.length > 0}
            <div class="result-errors">
              <h3>Errors:</h3>
              <ul>
                {#each $productImportFlow.result.errors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}

      <div class="actions">
        <Button variant="secondary" on:click={handleNewImport}>
          Import Another
        </Button>
        <Button on:click={handleDone}>
          Done
        </Button>
      </div>
    </div>
  {/if}
</PageLayout>

<style>
  .step-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    margin-top: var(--space-md);
  }

  .step-description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
  }

  /* Drop Zone */
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    border: 2px dashed var(--color-border-subtle);
    border-radius: var(--radius-card);
    background: var(--color-bg-input);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
    min-height: 180px;
  }

  .drop-zone:hover,
  .drop-zone.dragging {
    border-color: var(--color-accent-primary);
    background: rgba(255, 255, 255, 0.02);
  }

  .drop-icon {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-md);
  }

  .drop-text {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .drop-subtext {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }

  .file-input {
    display: none;
  }

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

  /* Errors Section */
  .errors-section {
    padding: var(--space-md);
    background: rgba(255, 100, 100, 0.1);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-input);
  }

  .errors-title {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-error);
    margin-bottom: var(--space-sm);
  }

  .errors-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .error-item {
    padding: var(--space-xs) 0;
    font-size: var(--font-size-secondary);
  }

  .error-row {
    font-weight: var(--font-weight-semibold);
    margin-right: var(--space-xs);
  }

  .error-message {
    color: var(--color-text-secondary);
  }

  /* Warnings Section */
  .warnings-section {
    padding: var(--space-md);
    background: rgba(255, 200, 100, 0.1);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-input);
  }

  .warnings-title {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-warning);
    margin-bottom: var(--space-sm);
  }

  .warnings-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .warning-item {
    padding: var(--space-xs) 0;
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  /* Actions */
  .actions {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  .actions :global(.btn) {
    flex: 1;
  }

  /* Executing */
  .executing {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Result Section */
  .result-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-xl);
    background: var(--color-bg-input);
    border-radius: var(--radius-card);
  }

  .result-section.success .result-icon {
    color: var(--color-success);
  }

  .result-section.error .result-icon {
    color: var(--color-error);
  }

  .result-title {
    font-size: var(--font-size-section);
    margin-top: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .result-stats {
    color: var(--color-text-secondary);
  }

  .result-stats p {
    margin: var(--space-xs) 0;
  }

  .result-errors {
    margin-top: var(--space-md);
    text-align: left;
    width: 100%;
    padding: var(--space-md);
    background: rgba(255, 100, 100, 0.1);
    border-radius: var(--radius-input);
  }

  .result-errors h3 {
    font-size: var(--font-size-body);
    color: var(--color-error);
    margin-bottom: var(--space-sm);
  }

  .result-errors ul {
    list-style: disc;
    padding-left: var(--space-lg);
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }
</style>
