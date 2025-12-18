<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { BackNav, StepIndicator, InfoCard, Button, PageLayout } from '../../lib/components';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import { selectedDc } from '../../lib/stores/distributionCenter';
  import { currentUser } from '../../lib/auth';
  import { receiveFlow, resetReceiveFlow } from '../../lib/stores/receiveFlow';
  import { executeReceive, generateBatchNumber } from '../../lib/services/receiveService';
  import { t } from '../../lib/i18n';
  import { onMount } from 'svelte';

  let isSubmitting = false;

  // Generate batch number on mount
  onMount(async () => {
    if ($selectedDc && !$receiveFlow.batchNumber) {
      const newBatchNumber = await generateBatchNumber($selectedDc.id);
      receiveFlow.update(s => ({ ...s, batchNumber: newBatchNumber }));
    }
  });

  // Build info rows for display
  $: infoRows = [
    {
      label: $t('form.product'),
      value: $receiveFlow.product ? `${$receiveFlow.product.name} (${$receiveFlow.product.sku})` : '-',
      icon: 'product' as const
    },
    {
      label: $t('form.quantity'),
      value: String($receiveFlow.quantity),
      icon: 'quantity' as const
    },
    {
      label: $t('form.position.label'),
      value: $receiveFlow.position ? `${$receiveFlow.position.code} - ${$receiveFlow.position.zone}` : '-',
      icon: 'location' as const
    },
    {
      label: $t('form.batch'),
      value: $receiveFlow.batchNumber ?? $t('form.batch.generating'),
      icon: 'batch' as const,
      highlight: 'success' as const
    }
  ];

  async function handleConfirm() {
    const { product, position, quantity } = $receiveFlow;
    if (!product || !position || !$selectedDc || !$currentUser) {
      showError($t('error.missing_data'));
      return;
    }

    isSubmitting = true;

    try {
      const result = await executeReceive({
        productId: product.id,
        positionId: position.id,
        quantity,
        userId: $currentUser.id,
        distributionCenterId: $selectedDc.id
      });

      if (result.success) {
        showSuccess($t('receive.success', { quantity, name: product.name ?? product.sku }));
        resetReceiveFlow();
        push('/');
      } else {
        showError(result.error ?? $t('error.receive_failed'));
      }
    } catch (error) {
      console.error('Receive error:', error);
      showError($t('error.unexpected'));
    } finally {
      isSubmitting = false;
    }
  }
</script>

<PageLayout title={$t('receive.confirm.title')}>
  <BackNav slot="nav" href="/receive" />
  <StepIndicator currentStep={2} totalSteps={2} stepName={$t('receive.step2.name')} />

  <div class="info-section">
    <InfoCard rows={infoRows} />
  </div>

  <div class="actions">
    <Button variant="secondary" on:click={() => push('/receive')}>
      {$t('common.back')}
    </Button>
    <Button
      loading={isSubmitting}
      disabled={!$receiveFlow.product || !$receiveFlow.position || !$receiveFlow.batchNumber}
      on:click={handleConfirm}
    >
      {$t('common.confirm')}
    </Button>
  </div>
</PageLayout>
