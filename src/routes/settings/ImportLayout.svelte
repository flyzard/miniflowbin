<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { PageLayout, BackNav, Button, RadioGroup, CsvDropZone, ValidationFeedback, ImportResult, LoadingStep } from '../../lib/components';
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
  let isExecuting = false;

  // Orphan strategy options
  const orphanOptions: Array<{ value: OrphanStrategy; label: string; description: string }> = [
    { value: 'keep', label: 'Keep as-is', description: 'Leave positions unchanged' },
    { value: 'mark_inactive', label: 'Mark as inactive', description: 'Soft delete (recommended)' },
    { value: 'delete', label: 'Delete', description: 'Permanently remove positions' }
  ];

  // Reset flow on mount
  resetLayoutImportFlow();

  // Handle file from drop zone
  async function handleFile(event: CustomEvent<File>) {
    const file = event.detail;
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
        const preview = await generatePreview(result.parsed, $selectedDc.id);
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
      const result = await executeImport(
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
      <CsvDropZone
        description="Upload a CSV file with your warehouse layout. Required columns: zone, slot_code, aisle, column, level."
        on:file={handleFile}
      />

      <ValidationFeedback
        errors={$layoutImportFlow.validationResult?.errors ?? []}
        warnings={$layoutImportFlow.validationResult?.warnings ?? []}
      />

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
        {#if $layoutImportFlow.preview?.orphanedEmpty > 0}
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
        {#if $layoutImportFlow.preview?.items?.length > 0}
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
              {#if ($layoutImportFlow.preview?.items?.length ?? 0) > 20}
                <p class="more-items">...and {($layoutImportFlow.preview?.items?.length ?? 0) - 20} more</p>
              {/if}
            </div>
          </div>
        {/if}

        <ValidationFeedback
          errors={[]}
          warnings={$layoutImportFlow.validationResult?.warnings ?? []}
        />
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
    <LoadingStep message="Importing layout..." />

  {:else if $layoutImportFlow.step === 'complete'}
    <!-- COMPLETE STEP -->
    <div class="step-content">
      {#if $layoutImportFlow.result}
        <ImportResult
          success={$layoutImportFlow.result.success}
          errors={$layoutImportFlow.result.errors ?? []}
          on:newImport={handleNewImport}
          on:done={handleDone}
        >
          <div slot="stats">
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
        </ImportResult>
      {/if}
    </div>
  {/if}
</PageLayout>

<style>
  .step-description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
  }

  .step-description strong {
    color: var(--color-text-primary);
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
</style>
