<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, InfoCard, Button, PageLayout } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { currentUser } from '../../lib/stores/auth';
  import { receiveFlow, resetReceiveFlow } from '../../lib/stores/receiveFlow';
  import { executeReceive } from '../../lib/services/receiveService';
  import { generateBatchNumber } from '../../lib/services/batchNumberService';
  import { onMount } from 'svelte';

  let isSubmitting = false;

  // Generate batch number on mount
  onMount(() => {
    if ($selectedDc && !$receiveFlow.batchNumber) {
      const newBatchNumber = generateBatchNumber($selectedDc.id);
      receiveFlow.update(s => ({ ...s, batchNumber: newBatchNumber }));
    }
  });

  // Build info rows for display
  $: infoRows = [
    {
      label: 'Product',
      value: $receiveFlow.product ? `${$receiveFlow.product.name} (${$receiveFlow.product.sku})` : '-',
      icon: 'product' as const
    },
    {
      label: 'Quantity',
      value: String($receiveFlow.quantity),
      icon: 'quantity' as const
    },
    {
      label: 'Position',
      value: $receiveFlow.position ? `${$receiveFlow.position.code} - ${$receiveFlow.position.zone}` : '-',
      icon: 'location' as const
    },
    {
      label: 'Batch #',
      value: $receiveFlow.batchNumber ?? 'Generating...',
      icon: 'batch' as const,
      highlight: 'success' as const
    }
  ];

  async function handleConfirm() {
    const { product, position, quantity } = $receiveFlow;
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

<PageLayout title="Confirm Receiving">
  <BackNav slot="nav" href="/receive" />
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
      disabled={!$receiveFlow.product || !$receiveFlow.position || !$receiveFlow.batchNumber}
      on:click={handleConfirm}
    >
      Confirm
    </Button>
  </div>
</PageLayout>

<style>
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
