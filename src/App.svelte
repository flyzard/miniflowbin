<script lang="ts">
  import { onMount } from 'svelte';
  import Router from 'svelte-spa-router';
  import { initApp } from './lib/init';
  import { Toast, LoadingSpinner, AuthGuard } from './lib/components';

  // Import all routes
  import Home from './routes/Home.svelte';
  import ReceiveStep1 from './routes/receive/Step1.svelte';
  import ReceiveStep2 from './routes/receive/Step2.svelte';
  import ReleaseStep1 from './routes/release/Step1.svelte';
  import ReleaseStep2 from './routes/release/Step2.svelte';
  import ReleaseStep3 from './routes/release/Step3.svelte';

  // Auth routes
  import Activate from './routes/auth/Activate.svelte';
  import SetupPin from './routes/auth/SetupPin.svelte';
  import Login from './routes/auth/Login.svelte';
  import Locked from './routes/auth/Locked.svelte';

  // Sync routes
  import RejectedTransactions from './routes/sync/RejectedTransactions.svelte';

  // Route definitions
  const routes = {
    // Auth routes
    '/auth/activate': Activate,
    '/auth/setup-pin': SetupPin,
    '/auth/login': Login,
    '/auth/locked': Locked,
    // App routes
    '/': Home,
    '/receive': ReceiveStep1,
    '/receive/confirm': ReceiveStep2,
    '/release': ReleaseStep1,
    '/release/source': ReleaseStep2,
    '/release/confirm': ReleaseStep3,
    // Sync routes
    '/sync/rejected': RejectedTransactions,
    '*': Home
  };

  let isInitialized = false;
  let initError: string | null = null;

  onMount(async () => {
    try {
      await initApp();
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      initError = error instanceof Error ? error.message : 'Unknown initialization error';
    }
  });
</script>

{#if initError}
  <div class="error-screen">
    <h1>Initialization Error</h1>
    <p>{initError}</p>
    <button on:click={() => window.location.reload()}>Retry</button>
  </div>
{:else if !isInitialized}
  <div class="loading-screen">
    <LoadingSpinner message="Initializing FlowBin..." size="large" />
  </div>
{:else}
  <AuthGuard>
    <Router {routes} />
  </AuthGuard>
  <Toast />
{/if}

<style>
  .loading-screen {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-primary);
  }

  .error-screen {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    text-align: center;
    background: var(--color-bg-primary);
  }

  .error-screen h1 {
    color: var(--color-accent-error);
    margin-bottom: var(--space-md);
  }

  .error-screen p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-lg);
  }

  .error-screen button {
    padding: var(--space-md) var(--space-xl);
    background: var(--color-accent-primary);
    color: var(--color-bg-primary);
    font-weight: var(--font-weight-semibold);
    border-radius: var(--radius-button);
  }
</style>
