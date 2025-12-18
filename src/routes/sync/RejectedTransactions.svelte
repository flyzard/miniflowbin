<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { BackNav, Button, EmptyState, LoadingSpinner, PageLayout } from '../../lib/components';
  import { t } from '../../lib/i18n';
  import { authStore, rejectedTransactionCount } from '../../lib/auth/authStore';
  import * as transactionRepo from '../../lib/repositories/transactionRepo';
  import * as productRepo from '../../lib/repositories/productRepo';
  import * as settingsRepo from '../../lib/repositories/settingsRepo';
  import { uploadPendingTransactions } from '../../lib/services/dataSyncService';
  import { showSuccess, showError } from '../../lib/stores/ui';
  import type { Transaction, Product } from '../../lib/types';

  interface RejectedTransaction extends Transaction {
    product?: Product;
  }

  let transactions: RejectedTransaction[] = [];
  let loading = true;
  let retrying = false;
  let retryingId: string | null = null;

  onMount(async () => {
    await loadTransactions();
  });

  async function loadTransactions() {
    loading = true;
    const dcId = await settingsRepo.getSelectedDcId();
    if (dcId) {
      const rejected = await transactionRepo.getRejectedTransactions(dcId);

      // Enrich with product info
      transactions = await Promise.all(
        rejected.map(async (txn) => {
          const product = await productRepo.getProductById(txn.product_id);
          return { ...txn, product: product ?? undefined };
        })
      );
    }
    loading = false;
  }

  async function refreshCounts() {
    const dcId = await settingsRepo.getSelectedDcId();
    if (dcId) {
      const pendingCount = await transactionRepo.getPendingTransactionCount(dcId);
      const rejectedCount = await transactionRepo.getRejectedTransactionCount(dcId);
      authStore.setPendingTransactionCount(pendingCount);
      authStore.setRejectedTransactionCount(rejectedCount);
    }
  }

  async function handleRetryAll() {
    if (retrying) return;
    retrying = true;

    try {
      const dcId = await settingsRepo.getSelectedDcId();
      if (dcId) {
        // Reset all rejected to pending
        await transactionRepo.resetAllRejectedToPending(dcId);

        // Trigger upload
        const result = await uploadPendingTransactions(dcId);

        // Refresh counts
        await refreshCounts();

        if (result.success && (!result.rejectedCount || result.rejectedCount === 0)) {
          showSuccess($t('sync.success'));
          push('/');
        } else if (result.success) {
          showError($t('sync.partial', { synced: result.syncedCount, rejected: result.rejectedCount }));
          await loadTransactions();
        } else {
          showError(result.error ?? 'Unknown error');
          await loadTransactions();
        }
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      retrying = false;
    }
  }

  async function handleRetrySingle(txnId: string) {
    if (retryingId) return;
    retryingId = txnId;

    try {
      // Reset this transaction to pending
      await transactionRepo.resetTransactionToPending(txnId);

      const dcId = await settingsRepo.getSelectedDcId();
      if (dcId) {
        // Trigger upload
        const result = await uploadPendingTransactions(dcId);

        // Refresh counts
        await refreshCounts();

        // Check if this transaction was successful
        const txn = await transactionRepo.getTransactionById(txnId);
        if (txn?.sync_status === 'synced') {
          showSuccess($t('sync.success'));
        } else if (txn?.sync_status === 'rejected') {
          showError(txn.sync_error ?? 'Transaction rejected');
        }

        await loadTransactions();

        // If no more rejected, go home
        if ($rejectedTransactionCount === 0) {
          push('/');
        }
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      retryingId = null;
    }
  }

  function formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<PageLayout title={$t('sync.rejected.title')}>
  <BackNav slot="nav" href="/" />

  {#if loading}
    <div class="loading-center">
      <LoadingSpinner />
    </div>
  {:else if transactions.length === 0}
    <EmptyState message={$t('sync.rejected.empty')} />
  {:else}
    <p class="subtitle">{$t('sync.rejected.subtitle')}</p>

    <div class="transaction-list">
      {#each transactions as txn (txn.id)}
        <div class="transaction-card">
          <div class="txn-header">
            <span class="txn-type" class:receive={txn.type === 'RECEIVE'} class:release={txn.type === 'RELEASE'}>
              {$t(`sync.rejected.type.${txn.type}`)}
            </span>
            <span class="txn-date">{formatDate(txn.timestamp)}</span>
          </div>

          <div class="txn-product">
            {txn.product?.name ?? txn.product?.sku ?? 'Unknown Product'}
          </div>

          <div class="txn-quantity">
            {txn.quantity} units
          </div>

          {#if txn.sync_error}
            <div class="txn-error">
              <span class="error-label">{$t('sync.rejected.reason', { error: txn.sync_error })}</span>
            </div>
          {/if}

          <button
            class="retry-single-btn"
            on:click={() => handleRetrySingle(txn.id)}
            disabled={retryingId === txn.id}
          >
            {retryingId === txn.id ? $t('sync.rejected.retrying') : $t('sync.rejected.retry')}
          </button>
        </div>
      {/each}
    </div>

    <div class="actions">
      <Button
        variant="primary"
        on:click={handleRetryAll}
        disabled={retrying}
        loading={retrying}
      >
        {$t('sync.rejected.retry_all')}
      </Button>
    </div>
  {/if}
</PageLayout>

<style>
  .loading-center {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
    margin-bottom: var(--space-lg);
  }

  .transaction-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .transaction-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-card);
    padding: var(--space-md);
  }

  .txn-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }

  .txn-type {
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-button);
  }

  .txn-type.receive {
    background: rgba(20, 184, 166, 0.15);
    color: var(--color-accent-primary);
  }

  .txn-type.release {
    background: rgba(99, 102, 241, 0.15);
    color: #6366f1;
  }

  .txn-date {
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
  }

  .txn-product {
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-xs);
  }

  .txn-quantity {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-sm);
  }

  .txn-error {
    padding: var(--space-sm);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-button);
    margin-bottom: var(--space-sm);
  }

  .error-label {
    font-size: var(--font-size-secondary);
    color: var(--color-accent-error);
  }

  .retry-single-btn {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    min-height: 44px;
    background: var(--color-bg-input);
    border-radius: var(--radius-button);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
    transition: background var(--transition-fast);
  }

  .retry-single-btn:hover:not(:disabled) {
    background: var(--color-border-subtle);
  }

  .retry-single-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .actions {
    margin-top: auto;
    padding-top: var(--space-lg);
  }
</style>
