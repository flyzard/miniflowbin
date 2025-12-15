<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { PageLayout, BackNav, Button } from '../../lib/components';
  import { factoryReset } from '../../lib/services/resetService';
  import { showSuccess } from '../../lib/stores/ui';

  // Modal state
  let showResetModal = false;
  let confirmText = '';
  let isResetting = false;

  $: canReset = confirmText === 'RESET';

  function goToImportLayout() {
    push('/settings/import-layout');
  }

  function goToImportProducts() {
    push('/settings/import-products');
  }

  function openResetModal() {
    showResetModal = true;
    confirmText = '';
  }

  function closeResetModal() {
    showResetModal = false;
    confirmText = '';
  }

  function handleReset() {
    if (!canReset) return;

    isResetting = true;

    try {
      factoryReset();
      showSuccess('Factory reset complete. Reloading...');

      // Reload the page after a short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Factory reset failed:', error);
      isResetting = false;
    }
  }
</script>

<PageLayout title="Settings">
  <BackNav slot="nav" href="/" label="Home" />

  <div class="settings-list">
    <button class="settings-item" on:click={goToImportLayout}>
      <div class="item-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path d="M14 2v6h6"/>
          <path d="M12 18v-6"/>
          <path d="m9 15 3-3 3 3"/>
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Import Layout</span>
        <span class="item-description">Import storage positions from CSV</span>
      </div>
      <div class="item-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    </button>

    <button class="settings-item" on:click={goToImportProducts}>
      <div class="item-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m7.5 4.27 9 5.15"/>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          <path d="m3.3 7 8.7 5 8.7-5"/>
          <path d="M12 22V12"/>
        </svg>
      </div>
      <div class="item-content">
        <span class="item-label">Import Products</span>
        <span class="item-description">Import products from CSV</span>
      </div>
      <div class="item-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    </button>
  </div>

  <!-- Danger Zone -->
  <div class="danger-zone">
    <h2 class="danger-title">Danger Zone</h2>
    <div class="danger-content">
      <div class="danger-item">
        <div class="danger-info">
          <span class="danger-label">Factory Reset</span>
          <span class="danger-description">Delete all data and return to initial state</span>
        </div>
        <button class="danger-button" on:click={openResetModal}>
          Reset
        </button>
      </div>
    </div>
  </div>
</PageLayout>

<!-- Reset Confirmation Modal -->
{#if showResetModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay" on:click={closeResetModal} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title" class="modal-title">Factory Reset</h2>

      <div class="modal-warning">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
        </svg>
        <span>This action cannot be undone</span>
      </div>

      <p class="modal-text">This will permanently delete:</p>
      <ul class="modal-list">
        <li>All storage positions</li>
        <li>All products</li>
        <li>All inventory batches</li>
        <li>All transaction history</li>
        <li>All users</li>
        <li>Distribution center</li>
      </ul>

      <div class="confirm-input-group">
        <label for="confirm-input" class="confirm-label">
          Type <strong>RESET</strong> to confirm:
        </label>
        <input
          id="confirm-input"
          type="text"
          class="confirm-input"
          bind:value={confirmText}
          placeholder="Type RESET"
          autocomplete="off"
          disabled={isResetting}
        />
      </div>

      <div class="modal-actions">
        <Button variant="secondary" on:click={closeResetModal} disabled={isResetting}>
          Cancel
        </Button>
        <button
          class="reset-button"
          on:click={handleReset}
          disabled={!canReset || isResetting}
        >
          {isResetting ? 'Resetting...' : 'Reset Everything'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }

  .settings-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast);
    text-align: left;
    min-height: var(--touch-target-min);
  }

  .settings-item:hover {
    background: var(--color-bg-primary);
    border-color: var(--color-accent-primary);
  }

  .item-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-card);
    border-radius: var(--radius-button);
    color: var(--color-text-secondary);
  }

  .item-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .item-label {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .item-description {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .item-arrow {
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }

  /* Danger Zone */
  .danger-zone {
    margin-top: var(--space-xl);
    padding: var(--space-md);
    background: rgba(255, 100, 100, 0.05);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-card);
  }

  .danger-title {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-error);
    margin-bottom: var(--space-md);
  }

  .danger-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .danger-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .danger-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .danger-label {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .danger-description {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .danger-button {
    flex-shrink: 0;
    padding: var(--space-sm) var(--space-lg);
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-button);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
    min-height: var(--touch-target-min);
  }

  .danger-button:hover {
    background: var(--color-error);
    color: white;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    z-index: 100;
  }

  .modal {
    background: var(--color-bg-card);
    border-radius: var(--radius-card);
    padding: var(--space-lg);
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-title {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-bold);
    color: var(--color-error);
    margin-bottom: var(--space-md);
  }

  .modal-warning {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: rgba(255, 100, 100, 0.1);
    border-radius: var(--radius-button);
    color: var(--color-error);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-md);
  }

  .modal-text {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-sm);
  }

  .modal-list {
    list-style: disc;
    padding-left: var(--space-lg);
    margin-bottom: var(--space-lg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
  }

  .modal-list li {
    padding: var(--space-xs) 0;
  }

  .confirm-input-group {
    margin-bottom: var(--space-lg);
  }

  .confirm-label {
    display: block;
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-sm);
  }

  .confirm-label strong {
    color: var(--color-text-primary);
    font-family: monospace;
  }

  .confirm-input {
    width: 100%;
    padding: var(--space-md);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-family: monospace;
  }

  .confirm-input:focus {
    outline: none;
    border-color: var(--color-error);
  }

  .confirm-input::placeholder {
    color: var(--color-text-secondary);
    opacity: 0.5;
  }

  .modal-actions {
    display: flex;
    gap: var(--space-md);
  }

  .modal-actions :global(.btn) {
    flex: 1;
  }

  .reset-button {
    flex: 1;
    height: var(--button-height);
    padding: 0 var(--space-lg);
    background: var(--color-error);
    color: white;
    border: none;
    border-radius: var(--radius-button);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .reset-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .reset-button:not(:disabled):hover {
    opacity: 0.9;
  }
</style>
