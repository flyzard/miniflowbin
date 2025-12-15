<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Header } from '../lib/components';
  import { resetReceiveFlow } from '../lib/stores/receiveFlow';
  import { resetReleaseFlow } from '../lib/stores/releaseFlow';

  function goToReceive() {
    resetReceiveFlow();
    push('/receive');
  }

  function goToRelease() {
    resetReleaseFlow();
    push('/release');
  }

  function goToSettings() {
    push('/settings');
  }
</script>

<div class="home">
  <Header />

  <main class="content">
    <div class="title-row">
      <div>
        <h1 class="title">Product Restock</h1>
        <p class="subtitle">Select an operation</p>
      </div>
      <button class="settings-button" on:click={goToSettings} aria-label="Settings">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>

    <div class="operations">
      <button class="operation-card receive" on:click={goToReceive}>
        <div class="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14"/>
            <path d="m19 12-7 7-7-7"/>
          </svg>
        </div>
        <span class="label">Receive</span>
        <span class="description">Add inventory to storage</span>
      </button>

      <button class="operation-card release" on:click={goToRelease}>
        <div class="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5"/>
            <path d="m5 12 7-7 7 7"/>
          </svg>
        </div>
        <span class="label">Release</span>
        <span class="description">Move inventory out</span>
      </button>
    </div>
  </main>
</div>

<style>
  .home {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-primary);
  }

  .content {
    flex: 1;
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
  }

  .title {
    font-size: var(--font-size-title);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-xs);
  }

  .subtitle {
    font-size: var(--font-size-body);
    color: var(--color-text-secondary);
  }

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-xl);
  }

  .settings-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    border-radius: var(--radius-button);
    color: var(--color-text-secondary);
    transition: color var(--transition-fast), background var(--transition-fast);
  }

  .settings-button:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-input);
  }

  .operations {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .operation-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    border-radius: var(--radius-card);
    cursor: pointer;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    text-align: center;
    min-height: 160px;
  }

  .operation-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card);
  }

  .operation-card:active {
    transform: translateY(0);
  }

  .operation-card.receive {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
  }

  .operation-card.release {
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
  }

  .icon {
    margin-bottom: var(--space-md);
    color: var(--color-text-primary);
  }

  .label {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-xs);
  }

  .description {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }
</style>
