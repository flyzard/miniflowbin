<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, InfoCard, Button } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { currentUser } from '../../lib/stores/auth';
  import {
    receiveFlowState,
    setReceiveBatchNumber,
    resetReceiveFlow
  } from '../../lib/stores/receiveFlow';
  import { executeReceive } from '../../lib/services/receiveService';
  import { generateBatchNumber } from '../../lib/services/batchNumberService';
  import { onMount } from 'svelte';

  let isSubmitting = false;

  // Get flow state
  $: product = $receiveFlowState.product;
  $: quantity = $receiveFlowState.quantity;
  $: position = $receiveFlowState.position;
  $: batchNumber = $receiveFlowState.batchNumber;

  // Generate batch number on mount
  onMount(() => {
    if ($selectedDc && !batchNumber) {
      const newBatchNumber = generateBatchNumber($selectedDc.id);
      setReceiveBatchNumber(newBatchNumber);
    }
  });

  // Build info rows for display
  $: infoRows = [
    {
      label: 'Product',
      value: product ? `${product.name} (${product.sku})` : '-',
      icon: 'product' as const
    },
    {
      label: 'Quantity',
      value: String(quantity),
      icon: 'quantity' as const
    },
    {
      label: 'Position',
      value: position ? `${position.code} - ${position.zone}` : '-',
      icon: 'location' as const
    },
    {
      label: 'Batch #',
      value: batchNumber ?? 'Generating...',
      icon: 'batch' as const,
      highlight: 'success' as const
    }
  ];

  async function handleConfirm() {
    if (!product || !position || !$selectedDc || !$currentUser) {
      showError('Missing required data');
      return;
    }

    isSubmitting = true;

    try {
      const result = executeReceive({
        productId: product.id,
        positionId: position.id,
        quantity,
        userId: $currentUser.id,
        distributionCenterId: $selectedDc.id
      });

      if (result.success) {
        showSuccess(`Received ${quantity} units of ${product.name}`);
        resetReceiveFlow();
        push('/');
      } else {
        showError(result.error ?? 'Failed to receive inventory');
      }
    } catch (error) {
      console.error('Receive error:', error);
      showError('An unexpected error occurred');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<main class="page">
  <BackNav href="/receive" />

  <div class="card">
    <h1>Confirm Receiving</h1>
    <StepIndicator currentStep={2} totalSteps={2} stepName="Review and confirm" />

    <div class="info-section">
      <InfoCard rows={infoRows} />
    </div>

    <div class="actions">
      <Button variant="secondary" on:click={() => push('/receive')}>
        Back
      </Button>
      <Button
        loading={isSubmitting}
        disabled={!product || !position || !batchNumber}
        on:click={handleConfirm}
      >
        Confirm
      </Button>
    </div>
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: var(--space-md);
    background: var(--color-bg-primary);
  }

  .card {
    background: var(--color-bg-card);
    border-radius: var(--radius-card);
    padding: var(--space-lg);
  }

  h1 {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-xs);
  }

  .info-section {
    margin-bottom: var(--space-lg);
  }

  .actions {
    display: flex;
    gap: var(--space-md);
  }

  .actions :global(button) {
    flex: 1;
  }
</style>
