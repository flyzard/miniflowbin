<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Button } from '../../lib/components';
  import { activateDevice, isApiConfigured } from '../../lib/auth/deviceService';

  let email = '';
  let password = '';
  let deviceName = '';
  let loading = false;
  let error = '';

  // Check if API is configured
  const apiConfigured = isApiConfigured();

  async function handleSubmit() {
    if (!email || !password) {
      error = 'Please enter email and password';
      return;
    }

    loading = true;
    error = '';

    const result = await activateDevice(email, password, deviceName || undefined);

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
    <h1>Activate Device</h1>
    <p class="text-secondary">Sign in with your FlowBin account</p>
  </div>

  {#if !apiConfigured}
    <div class="warning-message">
      <p>API not configured. Please set VITE_FLOWBIN_API_URL in your environment.</p>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <div class="field">
      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder="your@email.com"
        autocomplete="email"
        disabled={loading || !apiConfigured}
        required
      />
    </div>

    <div class="field">
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        bind:value={password}
        placeholder="Enter password"
        autocomplete="current-password"
        disabled={loading || !apiConfigured}
        required
      />
    </div>

    <div class="field">
      <label for="deviceName">Device Name <span class="optional">(optional)</span></label>
      <input
        id="deviceName"
        type="text"
        bind:value={deviceName}
        placeholder="Warehouse Tablet #3"
        disabled={loading || !apiConfigured}
      />
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <Button type="submit" disabled={loading || !apiConfigured} {loading}>
      {loading ? 'Activating...' : 'Activate Device'}
    </Button>
  </form>

  <div class="footer">
    <p class="text-secondary">
      This will clear any existing local data.
    </p>
    <p class="text-secondary">
      Don't have an account? Contact your administrator.
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

  .field label {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .field .optional {
    font-weight: normal;
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
</style>
