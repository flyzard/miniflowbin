<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Header, Icon } from '../lib/components';
  import { resetReceiveFlow } from '../lib/stores/receiveFlow';
  import { resetReleaseFlow } from '../lib/stores/releaseFlow';
  import { t } from '../lib/i18n';

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
        <h1 class="title">{$t('home.title')}</h1>
        <p class="subtitle">{$t('home.subtitle')}</p>
      </div>
    </div>

    <div class="operations">
      <button class="operation-card receive" on:click={goToReceive}>
        <div class="icon-wrapper">
          <Icon name="arrow-down" size="xl" />
        </div>
        <span class="label">{$t('home.receive')}</span>
        <span class="description">{$t('home.receive.description')}</span>
      </button>

      <button class="operation-card release" on:click={goToRelease}>
        <div class="icon-wrapper">
          <Icon name="arrow-up" size="xl" />
        </div>
        <span class="label">{$t('home.release')}</span>
        <span class="description">{$t('home.release.description')}</span>
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .operation-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl) var(--space-lg);
    border-radius: var(--radius-card);
    cursor: pointer;
    transition: all var(--transition-normal);
    text-align: center;
    min-height: 180px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    position: relative;
    overflow: hidden;
  }

  .operation-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(20, 184, 166, 0.08) 0%, transparent 60%);
    opacity: 0;
    transition: opacity var(--transition-normal);
  }

  .operation-card:hover::before {
    opacity: 1;
  }

  .operation-card:hover {
    transform: translateY(-4px);
    border-color: rgba(20, 184, 166, 0.4);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(20, 184, 166, 0.1);
  }

  .operation-card:active {
    transform: translateY(-2px);
  }

  .icon-wrapper {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    margin-bottom: var(--space-md);
    position: relative;
    z-index: 1;
  }

  .receive .icon-wrapper {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-accent-success);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
  }

  .release .icon-wrapper {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
  }

  .label {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-xs);
    position: relative;
    z-index: 1;
  }

  .description {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    position: relative;
    z-index: 1;
  }

  @media (max-width: 400px) {
    .operations {
      grid-template-columns: 1fr;
    }
  }
</style>
