<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { onMount } from 'svelte';
  import { Button, PinInput } from '../../lib/components';
  import { setupPin, validatePinFormat } from '../../lib/auth/pinService';
  import { completeActivation, hasPendingActivation, getPendingActivation } from '../../lib/auth/deviceService';
  import { isBiometricAvailable, registerBiometric } from '../../lib/auth/biometricService';
  import { getPrimaryAuthUser } from '../../lib/auth/authRepository';
  import { completeLogin } from '../../lib/auth';
  import { AUTH_CONSTANTS } from '../../lib/auth/types';
  import { t } from '../../lib/i18n';

  type Step = 'enter' | 'confirm' | 'biometric';

  let step: Step = 'enter';
  let pin = '';
  let confirmPin = '';
  let error = '';
  let loading = false;
  let biometricAvailable = false;
  let userId: string | null = null;
  let pinInputRef: PinInput;

  onMount(async () => {
    biometricAvailable = await isBiometricAvailable();

    // Get user ID from pending activation or existing user
    if (hasPendingActivation()) {
      const pending = getPendingActivation();
      // User should have been created during activation
      const user = await getPrimaryAuthUser();
      if (user) {
        userId = user.id;
      }
    } else {
      const user = await getPrimaryAuthUser();
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      error = $t('auth.pin.user_not_found');
    }
  });

  function handlePinComplete(event: CustomEvent<string>) {
    const enteredPin = event.detail;

    if (step === 'enter') {
      // Validate PIN format
      const validation = validatePinFormat(enteredPin);
      if (!validation.valid) {
        error = validation.error!;
        setTimeout(() => pinInputRef?.clear(), 100);
        return;
      }

      pin = enteredPin;
      step = 'confirm';
      error = '';
      setTimeout(() => pinInputRef?.clear(), 100);
    } else if (step === 'confirm') {
      confirmPin = enteredPin;
      if (pin === confirmPin) {
        savePin();
      } else {
        error = $t('auth.pin.mismatch');
        step = 'enter';
        pin = '';
        confirmPin = '';
        setTimeout(() => pinInputRef?.clear(), 100);
      }
    }
  }

  async function savePin() {
    if (!userId) {
      error = $t('common.user_not_found');
      return;
    }

    loading = true;

    // First, set up the PIN (this derives and stores the encryption key)
    const result = await setupPin(userId, pin);

    if (!result.success) {
      error = result.error || $t('auth.pin.save_failed');
      loading = false;
      step = 'enter';
      pin = '';
      confirmPin = '';
      setTimeout(() => pinInputRef?.clear(), 100);
      return;
    }

    // Now complete the device activation (encrypt tokens with the key from setupPin)
    if (hasPendingActivation()) {
      const activationComplete = await completeActivation();
      if (!activationComplete) {
        error = $t('auth.pin.activation_failed');
        loading = false;
        step = 'enter';
        pin = '';
        confirmPin = '';
        setTimeout(() => pinInputRef?.clear(), 100);
        return;
      }
    }

    loading = false;

    if (biometricAvailable) {
      step = 'biometric';
    } else {
      await finishSetup();
    }
  }

  async function enableBiometric() {
    if (!userId) return;

    loading = true;
    const success = await registerBiometric(userId);
    loading = false;

    if (success) {
      await finishSetup();
    } else {
      error = $t('auth.biometric.failed');
    }
  }

  function skipBiometric() {
    finishSetup();
  }

  async function finishSetup() {
    // Complete login and redirect to home
    if (userId) {
      // Create a session and complete login
      const { createAuthSession } = await import('../../lib/auth/authRepository');
      const sessionId = await createAuthSession(userId, 'activation');
      await completeLogin(userId, sessionId);
    }
    push('/');
  }
</script>

<div class="setup-pin-page safe-area-top safe-area-bottom">
  {#if step === 'enter'}
    <div class="header">
      <h1>{$t('auth.pin.create_title')}</h1>
      <p class="text-secondary">
        {$t('auth.pin.create_subtitle', { min: AUTH_CONSTANTS.MIN_PIN_LENGTH, max: AUTH_CONSTANTS.MAX_PIN_LENGTH })}
      </p>
    </div>

    <PinInput
      bind:this={pinInputRef}
      on:complete={handlePinComplete}
      {error}
      disabled={loading}
    />

  {:else if step === 'confirm'}
    <div class="header">
      <h1>{$t('auth.pin.confirm_title')}</h1>
      <p class="text-secondary">{$t('auth.pin.confirm_subtitle')}</p>
    </div>

    <PinInput
      bind:this={pinInputRef}
      on:complete={handlePinComplete}
      {error}
      disabled={loading}
    />

  {:else if step === 'biometric'}
    <div class="header">
      <h1>{$t('auth.biometric.title')}</h1>
      <p class="text-secondary">{$t('auth.biometric.subtitle')}</p>
    </div>

    <div class="biometric-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 6"/>
        <path d="M8 15c0-2.2 1.8-4 4-4"/>
        <path d="M12 3c4.97 0 9 4.03 9 9 0 1.77-.5 3.42-1.38 4.81"/>
        <path d="M3 12c0-4.97 4.03-9 9-9"/>
        <path d="M17.32 18.32C15.8 19.93 13.99 21 12 21c-4.97 0-9-4.03-9-9"/>
      </svg>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <div class="biometric-actions">
      <Button on:click={enableBiometric} disabled={loading} {loading}>
        {loading ? $t('auth.biometric.setting_up') : $t('auth.biometric.enable')}
      </Button>
      <Button variant="secondary" on:click={skipBiometric} disabled={loading}>
        {$t('auth.biometric.skip')}
      </Button>
    </div>
  {/if}
</div>

<style>
  .setup-pin-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-xl);
    background: var(--color-bg-primary);
  }

  .header {
    text-align: center;
    margin-bottom: var(--space-xl);
  }

  .header h1 {
    margin-bottom: var(--space-sm);
  }

  .biometric-icon {
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: var(--space-xl) 0;
    color: var(--color-accent-primary);
  }

  .biometric-icon svg {
    width: 100%;
    height: 100%;
  }

  .error-message {
    padding: var(--space-md);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-accent-error);
    border-radius: var(--radius-button);
    color: var(--color-accent-error);
    text-align: center;
    margin-bottom: var(--space-md);
    width: 100%;
    max-width: 320px;
  }

  .biometric-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    width: 100%;
    max-width: 320px;
    margin-top: auto;
  }
</style>
