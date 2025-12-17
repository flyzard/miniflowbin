<script lang="ts">
  import { selectedDc } from '../stores/distributionCenter';
  import {
    authStore,
    isAuthenticated,
    hasPendingTransactions,
    pendingTransactionCount,
    isUploadingSyncing
  } from '../auth/authStore';
  import { uploadPendingTransactions } from '../services/dataSyncService';
  import * as transactionRepo from '../repositories/transactionRepo';
  import * as settingsRepo from '../repositories/settingsRepo';

  let syncing = false;

  async function handleSync() {
    if (syncing || $isUploadingSyncing) return;

    syncing = true;
    authStore.setUploadSyncing(true);

    try {
      const dcId = await settingsRepo.getSelectedDcId();
      if (dcId) {
        const result = await uploadPendingTransactions(dcId);
        if (result.success) {
          authStore.setLastUploadSync(new Date());
          authStore.setUploadSyncError(null);
          // Refresh pending count
          const count = await transactionRepo.getPendingTransactionCount(dcId);
          authStore.setPendingTransactionCount(count);
        } else {
          authStore.setUploadSyncError(result.error);
        }
      }
    } finally {
      syncing = false;
      authStore.setUploadSyncing(false);
    }
  }

  function handleLogout() {
    authStore.logout();
  }
</script>

<header class="header">
  <div class="logo">FlowBin</div>
  <div class="header-right">
    {#if $selectedDc}
      <span class="dc-name">{$selectedDc.name}</span>
      <span class="dc-code">{$selectedDc.code}</span>
    {:else}
      <span class="dc-name">No DC Selected</span>
    {/if}
    {#if $isAuthenticated}
      <!-- Sync Up Button (only shown when pending transactions exist) -->
      {#if $hasPendingTransactions}
        <button
          class="sync-btn"
          on:click={handleSync}
          disabled={syncing || $isUploadingSyncing}
          aria-label="Sync pending transactions"
        >
          {#if syncing || $isUploadingSyncing}
            <div class="sync-spinner"></div>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 4v5h5"/>
              <path d="M20 20v-5h-5"/>
              <path d="M20.5 9A9 9 0 0 0 5.6 5.6L4 4"/>
              <path d="M3.5 15a9 9 0 0 0 14.9 3.4L20 20"/>
            </svg>
            <span class="badge">{$pendingTransactionCount}</span>
          {/if}
        </button>
      {/if}

      <button class="logout-btn" on:click={handleLogout} aria-label="Logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16,17 21,12 16,7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    {/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .logo {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    text-align: right;
  }

  .dc-name {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .dc-code {
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
    background: var(--color-bg-input);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-button);
  }

  .sync-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    margin-left: var(--space-sm);
    background: var(--color-accent-primary);
    border: none;
    border-radius: var(--radius-button);
    color: var(--color-bg-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .sync-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sync-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .sync-btn svg {
    width: 22px;
    height: 22px;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: var(--color-accent-error);
    border-radius: 9px;
    font-size: 11px;
    font-weight: var(--font-weight-bold);
    line-height: 18px;
    text-align: center;
    color: white;
  }

  .sync-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-top-color: var(--color-bg-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .logout-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    margin-left: var(--space-sm);
    background: transparent;
    border: none;
    border-radius: var(--radius-button);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .logout-btn:active {
    background: var(--color-bg-input);
    color: var(--color-text-primary);
  }

  .logout-btn svg {
    width: 24px;
    height: 24px;
  }
</style>
