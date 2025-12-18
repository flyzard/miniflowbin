<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Button } from '../../lib/components';
  import { authStatus } from '../../lib/auth/authStore';
  import { deactivateDevice } from '../../lib/auth';
  import { t } from '../../lib/i18n';

  $: status = $authStatus;
  $: isRevoked = status === 'revoked';
  $: isSuspended = status === 'suspended';

  let showDeactivateConfirm = false;
  let loading = false;

  async function handleDeactivate() {
    loading = true;
    await deactivateDevice();
    loading = false;
    push('/auth/activate');
  }
</script>

<div class="locked-page safe-area-top safe-area-bottom">
  <div class="icon" class:revoked={isRevoked} class:suspended={isSuspended}>
    {#if isRevoked}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    {/if}
  </div>

  <h1>
    {#if isRevoked}
      {$t('auth.locked.revoked_title')}
    {:else}
      {$t('auth.locked.suspended_title')}
    {/if}
  </h1>

  <p class="description text-secondary">
    {#if isRevoked}
      {$t('auth.locked.revoked_description')}
    {:else}
      {$t('auth.locked.suspended_description')}
    {/if}
  </p>

  <div class="actions">
    {#if !showDeactivateConfirm}
      <Button variant="secondary" on:click={() => showDeactivateConfirm = true}>
        {$t('auth.locked.deactivate')}
      </Button>
    {:else}
      <div class="confirm-box">
        <p>{$t('auth.locked.deactivate_confirm')}</p>
        <div class="confirm-actions">
          <Button variant="secondary" on:click={() => showDeactivateConfirm = false} fullWidth={false}>
            {$t('common.cancel')}
          </Button>
          <Button on:click={handleDeactivate} {loading} fullWidth={false}>
            {$t('common.confirm')}
          </Button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .locked-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    background: var(--color-bg-primary);
    text-align: center;
  }

  .icon {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-xl);
    color: var(--color-accent-warning);
  }

  .icon.revoked {
    color: var(--color-accent-error);
  }

  .icon svg {
    width: 100%;
    height: 100%;
  }

  h1 {
    margin-bottom: var(--space-md);
  }

  .description {
    max-width: 300px;
    margin-bottom: var(--space-xl);
    line-height: 1.5;
  }

  .actions {
    width: 100%;
    max-width: 300px;
    margin-top: auto;
  }

  .confirm-box {
    padding: var(--space-lg);
    background: var(--color-bg-card);
    border-radius: var(--radius-card);
    border: 1px solid var(--color-border-subtle);
  }

  .confirm-box p {
    margin-bottom: var(--space-md);
    max-width: none;
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-md);
  }

  .confirm-actions :global(.btn) {
    flex: 1;
  }
</style>
