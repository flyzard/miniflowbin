<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { PageLayout, BackNav, Button, RadioGroup } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import {
    layoutImportFlow,
    resetLayoutImportFlow,
    setCsvData,
    setValidationResult,
    setPreview,
    setStep,
    setOrphanStrategy,
    setImportResult,
    canProceedToPreview,
    hasChangesToApply,
    totalAffected
  } from '../../lib/stores/layoutImportFlow';
  import { validateCsv, generatePreview, executeImport } from '../../lib/services/layoutImportService';
  import { generateTemplateCsv, downloadCsv } from '../../lib/services/csvParserService';
  import type { OrphanStrategy } from '../../lib/types';

  // Local state
  let fileInput: HTMLInputElement;
  let isDragging = false;
  let isExecuting = false;

  // Orphan strategy options
  const orphanOptions: Array<{ value: OrphanStrategy; label: string; description: string }> = [
    { value: 'keep', label: 'Keep as-is', description: 'Leave positions unchanged' },
    { value: 'mark_inactive', label: 'Mark as inactive', description: 'Soft delete (recommended)' },
    { value: 'delete', label: 'Delete', description: 'Permanently remove positions' }
  ];

  // Reset flow on mount
  resetLayoutImportFlow();

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
      setCsvData(file.name, content);

      // Validate CSV
      const result = validateCsv(content);
      setValidationResult(result);

      if (result.valid) {
        if (!$selectedDc) {
          showError('No distribution center available. Please refresh the page.');
          return;
        }
        // Generate preview
        const preview = generatePreview(result.parsed, $selectedDc.id);
        setPreview(preview);
        setStep('preview');
      }
    } catch (err) {
      showError('Failed to read file');
    }
  }

  // Download template
  function handleDownloadTemplate() {
    const template = generateTemplateCsv();
    downloadCsv(template, 'layout-template.csv');
  }

  // Execute import
  async function handleExecuteImport() {
    if (!$layoutImportFlow.preview) {
      showError('No layout data to import');
      return;
    }
    if (!$selectedDc) {
      showError('No distribution center selected. Please refresh the page.');
      return;
    }

    isExecuting = true;
    setStep('executing');

    try {
      const result = executeImport(
        $layoutImportFlow.preview,
        $layoutImportFlow.orphanStrategy,
        $selectedDc.id
      );
      setImportResult(result);
      setStep('complete');

      if (result.success) {
        showSuccess('Layout imported successfully');
      } else {
        showError('Import completed with errors');
      }
    } catch (err) {
      showError('Import failed');
      setStep('preview');
    } finally {
      isExecuting = false;
    }
  }

  // Go back to upload
  function handleBackToUpload() {
    resetLayoutImportFlow();
  }

  // Start new import
  function handleNewImport() {
    resetLayoutImportFlow();
  }

  // Go to settings
  function handleDone() {
    push('/settings');
  }

  // Handle orphan strategy change
  function handleOrphanChange(event: CustomEvent<OrphanStrategy>) {
    setOrphanStrategy(event.detail);
  }
</script>

<PageLayout title="Import Layout">
  <BackNav slot="nav" href="/settings" label="Settings" />

  {#if $layoutImportFlow.step === 'upload'}
    <!-- UPLOAD STEP -->
    <div class="step-content">
      <p class="step-description">
        Upload a CSV file with your warehouse layout. Required columns: zone, slot_code, aisle, column, level.
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

      <!-- Validation Errors -->
      {#if $layoutImportFlow.validationResult && !$layoutImportFlow.validationResult.valid}
        <div class="errors-section">
          <h3 class="errors-title">Validation Errors</h3>
          <ul class="errors-list">
            {#each $layoutImportFlow.validationResult.errors as error}
              <li class="error-item">
                <span class="error-row">Row {error.row}:</span>
                <span class="error-message">{error.message}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Warnings -->
      {#if $layoutImportFlow.validationResult?.warnings.length}
        <div class="warnings-section">
          <h3 class="warnings-title">Warnings</h3>
          <ul class="warnings-list">
            {#each $layoutImportFlow.validationResult.warnings as warning}
              <li class="warning-item">{warning}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="actions">
        <Button variant="secondary" on:click={handleDownloadTemplate}>
          Download Template
        </Button>
      </div>
    </div>

  {:else if $layoutImportFlow.step === 'preview'}
    <!-- PREVIEW STEP -->
    <div class="step-content">
      <p class="step-description">
        Review changes before applying. File: <strong>{$layoutImportFlow.fileName}</strong>
      </p>

      <!-- Summary Cards -->
      {#if $layoutImportFlow.preview}
        <div class="summary-cards">
          <div class="summary-card create">
            <span class="summary-value">+{$layoutImportFlow.preview.creates}</span>
            <span class="summary-label">New</span>
          </div>
          <div class="summary-card update">
            <span class="summary-value">~{$layoutImportFlow.preview.updates}</span>
            <span class="summary-label">Update</span>
          </div>
          <div class="summary-card unchanged">
            <span class="summary-value">{$layoutImportFlow.preview.unchanged}</span>
            <span class="summary-label">Same</span>
          </div>
          {#if $layoutImportFlow.preview.orphanedWithInventory > 0}
            <div class="summary-card protected">
              <span class="summary-value">{$layoutImportFlow.preview.orphanedWithInventory}</span>
              <span class="summary-label">Protected</span>
            </div>
          {/if}
        </div>

        <!-- Orphan Strategy -->
        {#if $layoutImportFlow.preview.orphanedEmpty > 0}
          <div class="orphan-section">
            <p class="orphan-info">
              <strong>{$layoutImportFlow.preview.orphanedEmpty}</strong> position(s) not in CSV (no inventory):
            </p>
            <RadioGroup
              options={orphanOptions}
              value={$layoutImportFlow.orphanStrategy}
              name="orphan-strategy"
              on:change={handleOrphanChange}
            />
          </div>
        {/if}

        <!-- Change Details -->
        {#if $layoutImportFlow.preview.items.length > 0}
          <div class="changes-section">
            <h3 class="changes-title">Changes ({$layoutImportFlow.preview.items.length})</h3>
            <div class="changes-list">
              {#each $layoutImportFlow.preview.items.slice(0, 20) as item}
                <div class="change-item" class:create={item.action === 'CREATE'} class:update={item.action === 'UPDATE'} class:orphan={item.action === 'KEEP'}>
                  <div class="change-header">
                    <span class="change-code">{item.position.code}</span>
                    <span class="change-action">{item.action}</span>
                  </div>
                  {#if item.changes?.length}
                    <ul class="change-details">
                      {#each item.changes as change}
                        <li>{change}</li>
                      {/each}
                    </ul>
                  {/if}
                  {#if item.hasInventory}
                    <span class="inventory-badge">Has inventory</span>
                  {/if}
                </div>
              {/each}
              {#if $layoutImportFlow.preview.items.length > 20}
                <p class="more-items">...and {$layoutImportFlow.preview.items.length - 20} more</p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Warnings -->
        {#if $layoutImportFlow.validationResult?.warnings.length}
          <div class="warnings-section">
            <h3 class="warnings-title">Warnings</h3>
            <ul class="warnings-list">
              {#each $layoutImportFlow.validationResult.warnings as warning}
                <li class="warning-item">{warning}</li>
              {/each}
            </ul>
          </div>
        {/if}
      {/if}

      <div class="actions">
        <Button variant="secondary" on:click={handleBackToUpload}>
          Back
        </Button>
        <Button
          on:click={handleExecuteImport}
          disabled={!$hasChangesToApply}
          loading={isExecuting}
        >
          Apply Changes ({$totalAffected})
        </Button>
      </div>
    </div>

  {:else if $layoutImportFlow.step === 'executing'}
    <!-- EXECUTING STEP -->
    <div class="step-content executing">
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Importing layout...</p>
      </div>
    </div>

  {:else if $layoutImportFlow.step === 'complete'}
    <!-- COMPLETE STEP -->
    <div class="step-content">
      {#if $layoutImportFlow.result}
        <div class="result-section" class:success={$layoutImportFlow.result.success} class:error={!$layoutImportFlow.result.success}>
          <div class="result-icon">
            {#if $layoutImportFlow.result.success}
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
            {$layoutImportFlow.result.success ? 'Import Complete' : 'Import Failed'}
          </h2>

          <div class="result-stats">
            {#if $layoutImportFlow.result.created > 0}
              <p>{$layoutImportFlow.result.created} position(s) created</p>
            {/if}
            {#if $layoutImportFlow.result.updated > 0}
              <p>{$layoutImportFlow.result.updated} position(s) updated</p>
            {/if}
            {#if $layoutImportFlow.result.markedInactive > 0}
              <p>{$layoutImportFlow.result.markedInactive} position(s) marked inactive</p>
            {/if}
            {#if $layoutImportFlow.result.deleted > 0}
              <p>{$layoutImportFlow.result.deleted} position(s) deleted</p>
            {/if}
          </div>

          {#if $layoutImportFlow.result.errors.length > 0}
            <div class="result-errors">
              <h3>Errors:</h3>
              <ul>
                {#each $layoutImportFlow.result.errors as error}
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

  .step-description strong {
    color: var(--color-text-primary);
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

  /* Summary Cards */
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: var(--space-sm);
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-md);
    border-radius: var(--radius-input);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
  }

  .summary-card.create {
    border-color: var(--color-success);
  }

  .summary-card.update {
    border-color: var(--color-warning);
  }

  .summary-card.protected {
    border-color: var(--color-accent-primary);
  }

  .summary-value {
    font-size: var(--font-size-title);
    font-weight: var(--font-weight-bold);
  }

  .summary-card.create .summary-value {
    color: var(--color-success);
  }

  .summary-card.update .summary-value {
    color: var(--color-warning);
  }

  .summary-label {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  /* Orphan Section */
  .orphan-section {
    padding: var(--space-md);
    background: var(--color-bg-input);
    border-radius: var(--radius-input);
  }

  .orphan-info {
    margin-bottom: var(--space-md);
    color: var(--color-text-secondary);
  }

  /* Changes Section */
  .changes-section {
    background: var(--color-bg-input);
    border-radius: var(--radius-input);
    padding: var(--space-md);
  }

  .changes-title {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-md);
  }

  .changes-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    max-height: 300px;
    overflow-y: auto;
  }

  .change-item {
    padding: var(--space-sm);
    background: var(--color-bg-card);
    border-radius: var(--radius-button);
    border-left: 3px solid var(--color-border-subtle);
  }

  .change-item.create {
    border-left-color: var(--color-success);
  }

  .change-item.update {
    border-left-color: var(--color-warning);
  }

  .change-item.orphan {
    border-left-color: var(--color-text-secondary);
  }

  .change-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .change-code {
    font-weight: var(--font-weight-semibold);
    font-family: monospace;
  }

  .change-action {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .change-details {
    margin-top: var(--space-xs);
    padding-left: var(--space-md);
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .inventory-badge {
    display: inline-block;
    margin-top: var(--space-xs);
    padding: 2px 8px;
    font-size: var(--font-size-secondary);
    background: var(--color-accent-primary);
    color: var(--color-bg-primary);
    border-radius: var(--radius-button);
  }

  .more-items {
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
    padding: var(--space-sm);
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
