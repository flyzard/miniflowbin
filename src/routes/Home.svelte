<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Header, Icon } from '../lib/components';
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
</script>

<div class="home">
  <Header />

  <main class="content">
    <div class="title-row">
      <div>
        <h1 class="title">Product Restock</h1>
        <p class="subtitle">Select an operation</p>
      </div>
    </div>

    <div class="operations">
      <button class="operation-card receive" on:click={goToReceive}>
        <div class="icon">
          <Icon name="arrow-down" size="xl" />
        </div>
        <span class="label">Receive</span>
        <span class="description">Add inventory to storage</span>
      </button>

      <button class="operation-card release" on:click={goToRelease}>
        <div class="icon">
          <Icon name="arrow-up" size="xl" />
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
    margin-bottom: var(--space-xl);
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
    background: linear-gradient(135deg, var(--color-bg-card) 0%, rgba(34, 197, 94, 0.08) 100%);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .operation-card.receive:hover {
    border-color: rgba(34, 197, 94, 0.5);
  }

  .operation-card.release {
    background: linear-gradient(135deg, var(--color-bg-input) 0%, rgba(59, 130, 246, 0.08) 100%);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .operation-card.release:hover {
    border-color: rgba(59, 130, 246, 0.5);
  }

  .icon {
    margin-bottom: var(--space-md);
  }

  .receive .icon {
    color: var(--color-accent-success);
  }

  .release .icon {
    color: #3B82F6;
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
