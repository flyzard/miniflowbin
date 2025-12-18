<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { onMount } from 'svelte';
  import { PinInput } from '../../lib/components';
  import { verifyPin, hasPinSetup } from '../../lib/auth/pinService';
  import {
    isBiometricAvailable,
    isBiometricEnabled,
    authenticateWithBiometric,
    canUseBiometric
  } from '../../lib/auth/biometricService';
  import { getPrimaryAuthUser } from '../../lib/auth/authRepository';
  import { completeLogin } from '../../lib/auth';
  import { authStore, isDataSyncing, dataSyncError } from '../../lib/auth/authStore';
  import { t } from '../../lib/i18n';
  import type { AuthUser } from '../../lib/auth/types';

  let user: AuthUser | null = null;
  let error = '';
  let attemptsRemaining: number | undefined;
  let lockedUntil: Date | undefined;
  let biometricAvailable = false;
  let biometricEnabled = false;
  let loading = false;
  let loggingIn = false;
  let pinInputRef: PinInput;

  onMount(async () => {
    user = await getPrimaryAuthUser();

    if (!user) {
      push('/auth/activate');
      return;
    }

    // Check if PIN is set up
    const hasPin = await hasPinSetup(user.id);
    if (!hasPin) {
      push('/auth/setup-pin');
      return;
    }

    // Check biometric availability
    biometricAvailable = await isBiometricAvailable();
    if (biometricAvailable && user) {
      biometricEnabled = await isBiometricEnabled(user.id);
    }

    // Auto-prompt biometric if available, enabled, and key is in memory
    if (biometricAvailable && biometricEnabled && canUseBiometric()) {
      attemptBiometric();
    }
  });

  async function handlePinComplete(event: CustomEvent<string>) {
    if (!user || loading || loggingIn) return;

    const pin = event.detail;
    error = '';
    loading = true;

    const result = await verifyPin(user.id, pin);

    if (result.success) {
      loggingIn = true;
      await completeLogin(user.id, result.sessionId);
      loading = false;
      loggingIn = false;
      push('/');
    } else {
      loading = false;
      error = result.error;
      attemptsRemaining = result.attemptsRemaining;
      lockedUntil = result.lockedUntil;
      pinInputRef?.clear();
    }
  }

  async function attemptBiometric() {
    if (!user || loading || loggingIn) return;

    loading = true;
    const result = await authenticateWithBiometric(user.id);

    if (result.success) {
      loggingIn = true;
      await completeLogin(user.id, result.sessionId);
      loading = false;
      loggingIn = false;
      push('/');
    } else {
      loading = false;
    }
    // Silently fail for biometric - user can use PIN
  }

  function formatLockoutTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function handleNotMe() {
    const confirmed = confirm($t('auth.login.not_me_confirm'));
    if (confirmed) {
      authStore.reset();
      push('/auth/activate');
    }
  }
</script>

<div class="login-page safe-area-top safe-area-bottom">
  {#if loggingIn}
    <div class="sync-overlay">
      <div class="spinner"></div>
      <p class="sync-status">
        {#if $isDataSyncing}
          {$t('auth.login.syncing')}
        {:else}
          {$t('auth.login.signing_in')}
        {/if}
      </p>
    </div>
  {:else if user}
    <div class="user-info">
      <div class="avatar">
        {user.display_name.charAt(0).toUpperCase()}
      </div>
      <h2>{user.display_name}</h2>
      <p class="text-secondary">{user.email || user.username}</p>
    </div>

    {#if lockedUntil && lockedUntil > new Date()}
      <div class="locked-message">
        <p>{$t('auth.login.locked')}</p>
        <p class="text-secondary">{$t('auth.login.try_again_at', { time: formatLockoutTime(lockedUntil) })}</p>
      </div>
    {:else}
      <p class="instruction">{$t('auth.login.enter_pin')}</p>

      <PinInput
        bind:this={pinInputRef}
        on:complete={handlePinComplete}
        {error}
        disabled={loading}
      />

      {#if attemptsRemaining !== undefined && attemptsRemaining < 5}
        <p class="attempts-warning">
          {attemptsRemaining === 1 ? $t('auth.login.attempts_remaining', { count: attemptsRemaining }) : $t('auth.login.attempts_remaining_plural', { count: attemptsRemaining })}
        </p>
      {/if}

      {#if biometricAvailable && biometricEnabled}
        <button
          class="biometric-button"
          on:click={attemptBiometric}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 6"/>
            <path d="M8 15c0-2.2 1.8-4 4-4"/>
            <path d="M12 3c4.97 0 9 4.03 9 9 0 1.77-.5 3.42-1.38 4.81"/>
          </svg>
          <span>{$t('auth.biometric.use')}</span>
        </button>
      {/if}

      <button class="not-me-link" on:click={handleNotMe}>
        {$t('auth.login.not_me')}
      </button>
    {/if}
  {:else}
    <div class="loading">
      <div class="spinner"></div>
    </div>
  {/if}
</div>

<style>
  .login-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-xl);
    background: var(--color-bg-primary);
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--space-xl);
  }

  .avatar {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--color-bg-input) 0%, var(--color-bg-card) 100%);
    border: 2px solid var(--color-border-subtle);
    border-radius: 50%;
    font-size: 32px;
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
    margin-bottom: var(--space-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .user-info h2 {
    margin-bottom: var(--space-xs);
  }

  .instruction {
    margin-bottom: var(--space-lg);
    color: var(--color-text-secondary);
  }

  .locked-message {
    text-align: center;
    padding: var(--space-xl);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-card);
    margin: var(--space-xl) 0;
  }

  .locked-message p:first-child {
    color: var(--color-accent-error);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-sm);
  }

  .attempts-warning {
    margin-top: var(--space-md);
    color: var(--color-accent-warning);
    font-size: var(--font-size-secondary);
  }

  .biometric-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-xl);
    padding: var(--space-md) var(--space-lg);
    background: transparent;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-button);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .biometric-button:active:not(:disabled) {
    background: var(--color-bg-input);
  }

  .biometric-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .biometric-button svg {
    width: 24px;
    height: 24px;
  }

  .not-me-link {
    margin-top: var(--space-xl);
    padding: var(--space-md);
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .not-me-link:active {
    color: var(--color-text-primary);
  }

  .loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .sync-overlay {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-lg);
  }

  .sync-status {
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
  }
</style>
