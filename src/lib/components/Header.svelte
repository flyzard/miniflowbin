<script lang="ts">
  import { selectedDc } from '../stores/distributionCenter';
  import { authStore, isAuthenticated } from '../auth/authStore';

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
