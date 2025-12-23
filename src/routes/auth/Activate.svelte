<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Button } from '../../lib/components';
  import { activateDevice, isApiConfigured } from '../../lib/auth/deviceService';
  import { t, locale, setLocale } from '../../lib/i18n';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  // Check if API is configured
  const apiConfigured = isApiConfigured();

  async function handleSubmit() {
    if (!email || !password) {
      error = $t('auth.activate.enter_credentials');
      return;
    }

    loading = true;
    error = '';

    const result = await activateDevice(email, password);

    loading = false;

    if (result.success) {
      // Go to PIN setup
      push('/auth/setup-pin');
    } else {
      error = result.error;
    }
  }
</script>

<div class="activate-page safe-area-top safe-area-bottom">
  <div class="header">
    <h1>{$t('auth.activate.title')}</h1>
    <p class="text-secondary">{$t('auth.activate.subtitle')}</p>
  </div>

  {#if !apiConfigured}
    <div class="warning-message">
      <p>{$t('auth.activate.api_not_configured')}</p>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <div class="field">
      <label for="email">{$t('auth.activate.email')}</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder={$t('auth.activate.email.placeholder')}
        autocomplete="email"
        disabled={loading || !apiConfigured}
        required
      />
    </div>

    <div class="field">
      <label for="password">{$t('auth.activate.password')}</label>
      <input
        id="password"
        type="password"
        bind:value={password}
        placeholder={$t('auth.activate.password.placeholder')}
        autocomplete="current-password"
        disabled={loading || !apiConfigured}
        required
      />
    </div>

    <div class="field">
      <div class="field-label">{$t('auth.activate.language')}</div>
      <div class="language-toggle">
        <button
          type="button"
          class:active={$locale === 'pt'}
          on:click={() => setLocale('pt')}
        >
          Português
        </button>
        <button
          type="button"
          class:active={$locale === 'en'}
          on:click={() => setLocale('en')}
        >
          English
        </button>
      </div>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <Button type="submit" disabled={loading || !apiConfigured} {loading}>
      {loading ? $t('auth.activate.activating') : $t('auth.activate.button')}
    </Button>
  </form>

  <div class="footer">
    <p class="text-secondary">
      {$t('auth.activate.clear_data_warning')}
    </p>
    <p class="text-secondary">
      {$t('auth.activate.no_account')}
    </p>
  </div>
</div>

<style>
  .activate-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
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

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    flex: 1;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .field label,
  .field .field-label {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .field input {
    height: var(--button-height);
    padding: 0 var(--space-md);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
  }

  .field input:focus {
    border-color: var(--color-border-focus);
    outline: none;
  }

  .field input::placeholder {
    color: var(--color-text-secondary);
    opacity: 0.5;
  }

  .field input:disabled {
    opacity: 0.5;
  }

  .error-message {
    padding: var(--space-md);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-accent-error);
    border-radius: var(--radius-button);
    color: var(--color-accent-error);
    text-align: center;
  }

  .warning-message {
    padding: var(--space-md);
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid var(--color-accent-warning);
    border-radius: var(--radius-button);
    color: var(--color-accent-warning);
    text-align: center;
    margin-bottom: var(--space-md);
  }

  .footer {
    margin-top: auto;
    padding-top: var(--space-xl);
    text-align: center;
  }

  .footer p {
    margin-bottom: var(--space-sm);
  }

  .language-toggle {
    display: flex;
    gap: var(--space-sm);
  }

  .language-toggle button {
    flex: 1;
    height: var(--button-height);
    padding: 0 var(--space-md);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .language-toggle button.active {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: #0f172a;
    font-weight: var(--font-weight-semibold);
  }

  .language-toggle button:not(.active):hover {
    border-color: var(--color-accent-primary);
    color: var(--color-text-primary);
  }

  .language-toggle button:not(.active):active {
    background: var(--color-bg-input);
  }
</style>
